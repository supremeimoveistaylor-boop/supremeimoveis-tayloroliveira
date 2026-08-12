// Supabase Edge Function: ai-property-search
// Busca inteligente: interpreta linguagem natural -> filtros estruturados -> consulta real no Supabase
// A IA NUNCA gera imóveis nem SQL. Apenas retorna JSON de filtros validados.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- Rate limiting simples ----------
const rl = new Map<string, { c: number; reset: number }>();
function limited(ip: string) {
  const now = Date.now();
  const e = rl.get(ip);
  if (!e || now > e.reset) {
    rl.set(ip, { c: 1, reset: now + 60_000 });
    return false;
  }
  if (e.c >= 20) return true;
  e.c++;
  return false;
}

// ---------- Schema de filtros permitidos ----------
interface Filters {
  property_type: string | null; // house | apartment | commercial | land | rural
  subtype: string | null; // sobrado, cobertura, chacara... (busca textual)
  purpose: string | null; // sale | rent
  condominium: boolean;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parking: number | null;
  min_area: number | null;
  min_price: number | null;
  max_price: number | null;
  location: string | null;
  amenities: string[];
  keywords: string[];
  sort: "relevance" | "price_asc" | "price_desc";
}

const EMPTY: Filters = {
  property_type: null, subtype: null, purpose: null, condominium: false,
  bedrooms: null, suites: null, bathrooms: null, parking: null,
  min_area: null, min_price: null, max_price: null, location: null,
  amenities: [], keywords: [], sort: "relevance",
};

const TYPES = ["house", "apartment", "commercial", "land", "rural"];

function num(v: unknown, max = 1_000_000_000): number | null {
  const n = typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > max) return null;
  return n;
}

function sanitizeText(v: unknown, maxLen = 60): string | null {
  if (typeof v !== "string") return null;
  const s = v.replace(/[%,()'"\\;]/g, " ").trim().slice(0, maxLen);
  return s.length >= 2 ? s : null;
}

function sanitize(raw: any, previous: Filters): Filters {
  const f: Filters = { ...previous };
  if (!raw || typeof raw !== "object") return f;

  const t = typeof raw.property_type === "string" ? raw.property_type.toLowerCase() : null;
  if (t && TYPES.includes(t)) f.property_type = t;

  const st = sanitizeText(raw.subtype, 30);
  if (st) f.subtype = st.toLowerCase();

  const p = typeof raw.purpose === "string" ? raw.purpose.toLowerCase() : null;
  if (p === "sale" || p === "rent") f.purpose = p;

  if (raw.condominium === true) f.condominium = true;
  if (raw.condominium === false && previous.condominium === false) f.condominium = false;

  for (const k of ["bedrooms", "suites", "bathrooms", "parking"] as const) {
    const n = num(raw[k], 30);
    if (n) f[k] = Math.round(n);
  }
  const area = num(raw.min_area, 1_000_000);
  if (area) f.min_area = area;

  const minP = num(raw.min_price);
  if (minP) f.min_price = minP;
  const maxP = num(raw.max_price);
  if (maxP) f.max_price = maxP;
  if (f.min_price && f.max_price && f.min_price > f.max_price) {
    const tmp = f.min_price; f.min_price = f.max_price; f.max_price = tmp;
  }

  const loc = sanitizeText(raw.location, 60);
  if (loc) f.location = loc;

  if (Array.isArray(raw.amenities)) {
    const list = raw.amenities.map((a: unknown) => sanitizeText(a, 30)).filter(Boolean) as string[];
    f.amenities = Array.from(new Set([...f.amenities, ...list.map((s) => s.toLowerCase())])).slice(0, 8);
  }
  if (Array.isArray(raw.keywords)) {
    const list = raw.keywords.map((a: unknown) => sanitizeText(a, 30)).filter(Boolean) as string[];
    f.keywords = Array.from(new Set(list.map((s) => s.toLowerCase()))).slice(0, 6);
  }
  if (raw.sort === "price_asc" || raw.sort === "price_desc" || raw.sort === "relevance") f.sort = raw.sort;
  if (raw.reset === true) return { ...EMPTY, sort: f.sort };
  return f;
}

// ---------- Fallback heurístico (IA indisponível) ----------
function heuristic(q: string, previous: Filters): Filters {
  const s = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const out: any = {};

  if (/\bsobrado/.test(s)) { out.property_type = "house"; out.subtype = "sobrado"; }
  else if (/\bcasa|residencia/.test(s)) out.property_type = "house";
  else if (/\bapart|apto|flat|cobertura/.test(s)) out.property_type = "apartment";
  else if (/\bterreno|lote/.test(s)) out.property_type = "land";
  else if (/\bchacara|fazenda|sitio|rural/.test(s)) out.property_type = "rural";
  else if (/\bsala comercial|loja|comercial|galpao/.test(s)) out.property_type = "commercial";

  if (/condominio|cond\.|condominio fechado/.test(s)) out.condominium = true;
  if (/alugar|aluguel|locacao/.test(s)) out.purpose = "rent";
  else if (/comprar|venda|vender/.test(s)) out.purpose = "sale";

  const q1 = s.match(/(\d+)\s*(quartos?|dormitorios?|dorms?)/);
  if (q1) out.bedrooms = Number(q1[1]);
  const s1 = s.match(/(\d+)\s*(suites?)/);
  if (s1) out.suites = Number(s1[1]);
  const v1 = s.match(/(\d+)\s*(vagas?|garagens?)/);
  if (v1) out.parking = Number(v1[1]);

  const money = (txt: string): number | null => {
    const m = txt.match(/(\d+(?:[.,]\d+)?)\s*(milhao|milhoes|mi|m\b|mil|k\b)?/);
    if (!m) return null;
    let n = Number(m[1].replace(".", "").replace(",", "."));
    const unit = m[2] || "";
    if (/milhao|milhoes|mi|^m$/.test(unit)) n *= 1_000_000;
    else if (/mil|^k$/.test(unit)) n *= 1_000;
    return n > 0 ? n : null;
  };

  const between = s.match(/entre\s+(.{1,20}?)\s+e\s+(.{1,20}?)(?:\.|,|$)/);
  if (between) {
    const a = money(between[1]);
    const b = money(between[2]);
    if (a && b) {
      // "entre 400 e 600 mil" -> aplica unidade do segundo ao primeiro
      const scale = b >= 1000 && a < 1000 ? (b >= 1_000_000 ? 1_000_000 : 1_000) : 1;
      out.min_price = a * (a < 1000 ? scale : 1);
      out.max_price = b;
    }
  } else {
    const upTo = s.match(/(?:ate|abaixo de|no maximo|max)\s+(?:r\$\s*)?(.{1,20})/);
    if (upTo) { const v = money(upTo[1]); if (v) out.max_price = v; }
    const from = s.match(/(?:acima de|a partir de|minimo)\s+(?:r\$\s*)?(.{1,20})/);
    if (from) { const v = money(from[1]); if (v) out.min_price = v; }
  }

  const amen = ["piscina", "churrasqueira", "academia", "elevador", "varanda", "area gourmet", "quintal", "mobiliado"];
  out.amenities = amen.filter((a) => s.includes(a));

  if (/mais barato/.test(s)) out.sort = "price_asc";
  if (/alto padrao|luxo/.test(s)) out.sort = "price_desc";

  const bairro = s.match(/(?:no bairro|bairro|regiao d[eoa]|no setor|setor|em)\s+([a-z\s]{3,25})/);
  if (bairro && !out.location) {
    const cand = bairro[1].trim().split(/\s+(?:com|ate|de|por|e)\b/)[0].trim();
    if (cand.length >= 3 && !["condominio", "goiania", "casa", "apartamento"].includes(cand)) out.location = cand;
  }

  return sanitize(out, previous);
}

// ---------- IA: interpreta a frase ----------
async function interpret(query: string, previous: Filters): Promise<{ filters: Filters; ai: boolean }> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const key = OPENAI_API_KEY || LOVABLE_API_KEY;
  if (!key) return { filters: heuristic(query, previous), ai: false };

  const url = OPENAI_API_KEY
    ? "https://api.openai.com/v1/chat/completions"
    : "https://ai.gateway.lovable.dev/v1/chat/completions";
  const model = OPENAI_API_KEY ? "gpt-4o-mini" : "google/gemini-2.5-flash";

  const system = `Você é um interpretador de buscas imobiliárias no Brasil (Goiânia/GO).
Converta a frase do usuário em FILTROS ESTRUTURADOS. NUNCA invente imóveis, preços ou endereços.
Responda SOMENTE com JSON válido, sem texto extra, neste schema:
{
 "property_type": "house|apartment|commercial|land|rural|null",
 "subtype": "sobrado|cobertura|chacara|... ou null",
 "purpose": "sale|rent|null",
 "condominium": true|false,
 "bedrooms": number|null,
 "suites": number|null,
 "bathrooms": number|null,
 "parking": number|null,
 "min_area": number|null,
 "min_price": number|null,
 "max_price": number|null,
 "location": "bairro/região ou null",
 "amenities": ["piscina","churrasqueira",...],
 "keywords": ["termos livres relevantes"],
 "sort": "relevance|price_asc|price_desc",
 "reset": false
}
Regras:
- "sobrado" => property_type "house" + subtype "sobrado".
- "casa de/em condomínio (fechado)" => property_type "house" + condominium true.
- dormitórios = quartos. suíte = suites. vaga/garagem = parking.
- Valores em BRL: "800 mil"=800000, "800k"=800000, "1 milhão"=1000000, "1.2m"=1200000, "1,8 milhão"=1800000.
- "até X" => max_price X. "entre X e Y" => min_price X, max_price Y. "na faixa de X" => min_price 0.85X e max_price 1.15X.
- "mais barato" => sort price_asc. "alto padrão"/"luxo" => sort price_desc.
- Se o filtro não for citado, use null (ou false/[]). Não deduza demais.
- Se o usuário pedir para limpar/recomeçar a busca, use "reset": true.
- FILTROS ATUAIS DA SESSÃO (o usuário pode estar refinando): ${JSON.stringify(previous)}. Retorne apenas os campos citados agora; os demais serão mantidos.`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: query.slice(0, 500) },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.error("[ai-property-search] AI error", res.status, await res.text());
      return { filters: heuristic(query, previous), ai: false };
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(String(content).replace(/```json|```/g, "").trim());
    const filters = sanitize(parsed, previous);
    return { filters, ai: true };
  } catch (e) {
    console.error("[ai-property-search] AI exception", e);
    return { filters: heuristic(query, previous), ai: false };
  }
}

// ---------- Ranking ----------
function normalize(s: unknown): string {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function score(p: any, f: Filters): { score: number; matchedAll: boolean } {
  const hay = normalize(`${p.title} ${p.description} ${p.location} ${(p.amenities || []).join(" ")}`);
  let s = 0;
  let all = true;

  if (f.property_type) { if (p.property_type === f.property_type) s += 30; else { all = false; s -= 15; } }
  if (f.subtype) { if (hay.includes(normalize(f.subtype))) s += 25; else all = false; }
  if (f.purpose) { if (p.purpose === f.purpose) s += 20; else { all = false; s -= 20; } }
  if (f.condominium) { if (/condominio|condomínio|alphaville|jardins |aldeia do vale|portal do sol/.test(hay)) s += 20; else all = false; }
  if (f.bedrooms) { if ((p.bedrooms ?? 0) >= f.bedrooms) s += 15; else all = false; }
  if (f.suites) { const m = hay.match(/(\d+)\s*suite/); const v = m ? Number(m[1]) : 0; if (v >= f.suites) s += 10; else all = false; }
  if (f.bathrooms) { if ((p.bathrooms ?? 0) >= f.bathrooms) s += 8; else all = false; }
  if (f.parking) { if ((p.parking_spaces ?? 0) >= f.parking) s += 8; else all = false; }
  if (f.min_area) { if ((p.area ?? 0) >= f.min_area) s += 8; else all = false; }
  if (f.max_price) { if (Number(p.price) <= f.max_price) s += 18; else all = false; }
  if (f.min_price) { if (Number(p.price) >= f.min_price) s += 8; else all = false; }
  if (f.location) { if (hay.includes(normalize(f.location))) s += 22; else all = false; }
  for (const a of f.amenities) { if (hay.includes(normalize(a))) s += 6; else all = false; }
  for (const k of f.keywords) { if (hay.includes(normalize(k))) s += 3; }

  return { score: s, matchedAll: all };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });

  try {
    if (limited(ip)) return json({ ok: false, error: "Muitas buscas. Aguarde um instante." });

    const body = await req.json().catch(() => ({}));
    const query = String(body?.query ?? "").slice(0, 500).trim();
    const previous = sanitize(body?.filters ?? {}, EMPTY);
    const origin = String(body?.origin ?? "site").slice(0, 40);

    if (!query && !body?.filters) return json({ ok: false, error: "Descreva o imóvel que você procura." });

    const { filters, ai } = query ? await interpret(query, previous) : { filters: previous, ai: false };

    // ---------- Consulta real no banco ----------
    let q = supabase
      .from("properties")
      .select("id, title, description, price, location, property_type, purpose, bedrooms, bathrooms, parking_spaces, area, images, amenities, status, listing_status, property_code")
      .neq("status", "inactive")
      .limit(400);

    if (filters.purpose) q = q.eq("purpose", filters.purpose);

    const { data, error } = await q;
    if (error) {
      console.error("[ai-property-search] DB error", error);
      return json({ ok: false, error: "Falha ao consultar imóveis." });
    }

    const all = (data || []).filter((p: any) => normalize(p.status) !== "inactive");

    const ranked = all
      .map((p: any) => ({ p, ...score(p, filters) }))
      .sort((a, b) => b.score - a.score || Number(a.p.price) - Number(b.p.price));

    let exact = ranked.filter((r) => r.matchedAll).map((r) => r.p);
    if (filters.sort === "price_asc") exact = exact.sort((a, b) => Number(a.price) - Number(b.price));
    if (filters.sort === "price_desc") exact = exact.sort((a, b) => Number(b.price) - Number(a.price));

    // ---------- Sugestões reais quando não há resultado exato ----------
    let suggestions: any[] = [];
    let suggestionMessage: string | null = null;
    if (exact.length === 0) {
      suggestions = ranked.filter((r) => r.score > 0).slice(0, 12).map((r) => r.p);
      if (suggestions.length > 0) {
        if (filters.max_price) {
          const cheapestAbove = suggestions
            .map((p) => Number(p.price))
            .filter((v) => v > (filters.max_price as number))
            .sort((a, b) => a - b)[0];
          if (cheapestAbove) {
            const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(cheapestAbove);
            suggestionMessage = `Não encontrei imóveis que atendam exatamente a todos esses critérios. Encontrei ${suggestions.length} opções semelhantes. Quer ver imóveis até ${fmt}?`;
          }
        }
        if (!suggestionMessage) {
          suggestionMessage = `Não encontrei imóveis que atendam exatamente a todos esses critérios. Encontrei ${suggestions.length} opções semelhantes.`;
        }
      } else {
        suggestionMessage = "Não encontrei imóveis com esses critérios. Tente ajustar o valor, o bairro ou o tipo do imóvel.";
      }
    }

    // ---------- Observabilidade (sem dados pessoais) ----------
    const eventType = exact.length > 0 ? "ai_property_search_completed" : "ai_property_search_no_results";
    supabase.from("event_tracking").insert({
      event_type: eventType,
      session_id: String(body?.session_id ?? "").slice(0, 64) || null,
      page_url: String(body?.page_url ?? "").slice(0, 300) || null,
      metadata: { query, filters, results: exact.length, suggestions: suggestions.length, ai, origin },
    }).then(({ error: e }) => { if (e) console.error("[ai-property-search] track error", e.message); });

    return json({
      ok: true,
      ai,
      filters,
      results: exact.slice(0, 60),
      total: exact.length,
      suggestions,
      suggestionMessage,
    });
  } catch (e) {
    console.error("[ai-property-search] unexpected", e);
    return json({ ok: false, error: "Erro interno na busca inteligente." });
  }
});
