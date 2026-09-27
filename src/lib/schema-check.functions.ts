import { createServerFn } from "@tanstack/react-start";

const SITE = "https://supremeempreendimentos.com";
const PROPS_FN = "https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/get_public_properties";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwa21vcmdjcG9veWdzdmhjcHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODY1MjAsImV4cCI6MjA3MjU2MjUyMH0.A8MoJFe_ACtVDl7l0crAyU7ZxxOhdWJ8NShaqSHBxQc";

export interface SchemaIssue {
  id: string;
  title: string;
  url: string;
  problems: string[];
}

function validate(html: string): string[] {
  const problems: string[] = [];
  const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  if (!blocks.length) return ["Nenhum dado estruturado encontrado"];
  let listing: any = null;
  for (const b of blocks) {
    try {
      const parsed = JSON.parse(b[1]);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const o of arr) if (o?.["@type"] === "RealEstateListing") listing = o;
    } catch {
      problems.push("Bloco de dados estruturados com JSON inválido");
    }
  }
  if (!listing) return [...problems, "Ficha do imóvel (RealEstateListing) ausente"];
  if (!listing.name) problems.push("Sem nome");
  if (!listing.description) problems.push("Sem descrição");
  if (!listing.url) problems.push("Sem URL");
  if (!listing.image || (Array.isArray(listing.image) && !listing.image.length)) problems.push("Sem foto");
  if (!listing.address?.addressLocality) problems.push("Sem endereço");
  const o = listing.offers;
  if (!o) problems.push("Sem oferta/preço");
  else {
    if (!(Number(o.price) > 0)) problems.push("Preço ausente ou zerado");
    if (o.priceCurrency !== "BRL") problems.push("Moeda ausente");
    if (!o.availability) problems.push("Sem disponibilidade");
  }
  return problems;
}

export const runSchemaCheck = createServerFn({ method: "POST" }).handler(async () => {
  const res = await fetch(PROPS_FN, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ limit: 60 }),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: any[] };
  const props = (json.data ?? []).filter((p) => String(p.status ?? "").toLowerCase() !== "inactive");

  const issues: SchemaIssue[] = [];
  let valid = 0;
  const queue = [...props];
  const worker = async () => {
    while (queue.length) {
      const p = queue.shift()!;
      const url = `${SITE}/imovel/${p.id}`;
      let problems: string[];
      try {
        const r = await fetch(url, { headers: { "User-Agent": "SupremeSchemaCheck/1.0" } });
        problems = r.ok ? validate(await r.text()) : [`Página respondeu com erro ${r.status}`];
      } catch {
        problems = ["Página não respondeu"];
      }
      if (problems.length) issues.push({ id: p.id, title: p.title ?? "", url, problems });
      else valid++;
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return { total: props.length, valid, issues };
});
