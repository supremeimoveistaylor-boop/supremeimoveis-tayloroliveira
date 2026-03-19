import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const THEMES = [
  "Melhores condomínios de luxo em Goiânia em {year}",
  "Casas de alto padrão à venda nos bairros nobres de Goiânia",
  "Vale a pena investir em imóveis de luxo em Goiânia em {year}?",
  "Como escolher o imóvel de luxo ideal em Goiânia",
  "Tendências do mercado imobiliário de alto padrão em Goiânia",
  "Os bairros mais valorizados de Goiânia para morar com sofisticação",
  "Apartamentos de luxo em Goiânia: o guia completo",
  "Por que Goiânia é o novo destino do mercado imobiliário de luxo",
  "Condomínios fechados de alto padrão em Goiânia: segurança e exclusividade",
  "Imóveis de luxo no Setor Marista: por que investir agora",
  "Jardim Goiás: o bairro que mais valoriza em Goiânia",
  "Como financiar um imóvel de alto padrão em Goiânia",
  "Decoração de interiores para imóveis de luxo: tendências {year}",
  "Casas com piscina em Goiânia: conforto e lazer no alto padrão",
  "O mercado de imóveis de luxo em Goiânia pós-pandemia",
  "Alphaville Goiânia: vale a pena morar em condomínio fechado?",
  "Setor Bueno ou Marista: qual o melhor bairro nobre de Goiânia?",
  "Imóveis de luxo para investimento: rentabilidade em Goiânia",
  "Como avaliar um imóvel de alto padrão em Goiânia",
  "Sustentabilidade nos imóveis de luxo em Goiânia",
  "Coberturas de luxo em Goiânia: exclusividade no topo",
  "Aldeia do Vale: o condomínio mais desejado de Goiânia",
  "Imóveis rurais de luxo em Goiás: fazendas e chácaras sofisticadas",
  "Goiânia entre as melhores cidades para investir em imóveis de luxo",
  "Tecnologia e automação em imóveis de alto padrão",
  "Lifestyle de luxo em Goiânia: gastronomia, cultura e moradia",
  "Plantas inteligentes: o diferencial dos imóveis de luxo modernos",
  "Segurança residencial em condomínios de alto padrão em Goiânia",
  "Valorização imobiliária em Goiânia: tendências para {year}",
  "Imóveis de luxo no Park Lozandes: modernidade e sofisticação",
];

const BAIRROS = [
  "Setor Marista", "Jardim Goiás", "Setor Bueno", "Setor Oeste",
  "Aldeia do Vale", "Alphaville Flamboyant", "Park Lozandes",
  "Setor Nova Suíça", "Alto da Glória", "Setor Sul",
];

const CATEGORIES = [
  "mercado-imobiliario", "investimento", "bairros-nobres",
  "estilo-de-vida", "dicas-compra", "tendencias",
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const count = Math.min(body.count || 3, 5);

    // Get existing slugs to avoid duplicates
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("slug, title");
    const existingSlugs = new Set((existing || []).map((p: any) => p.slug));
    const existingTitles = new Set((existing || []).map((p: any) => p.title.toLowerCase()));

    const year = new Date().getFullYear();
    const availableThemes = THEMES
      .map(t => t.replace("{year}", String(year)))
      .filter(t => {
        const s = slugify(t);
        return !existingSlugs.has(s) && !existingTitles.has(t.toLowerCase());
      });

    if (availableThemes.length === 0) {
      return new Response(JSON.stringify({ error: "Todos os temas base foram utilizados. Novos temas serão gerados via IA." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Shuffle and pick
    const shuffled = availableThemes.sort(() => Math.random() - 0.5);
    const selectedThemes = shuffled.slice(0, count);

    const results = [];

    for (const theme of selectedThemes) {
      const bairro = BAIRROS[Math.floor(Math.random() * BAIRROS.length)];
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

      const prompt = `Escreva um artigo completo de blog para um site imobiliário de luxo em Goiânia chamado "Supreme Empreendimentos".

TEMA: "${theme}"

REQUISITOS:
- Entre 800 e 1500 palavras
- Linguagem sofisticada e profissional, voltada para público de alto padrão
- Conteúdo educativo e persuasivo
- Mencione o bairro ${bairro} naturalmente no texto
- Use subtítulos com ## (H2) e ### (H3)
- Inclua listas organizadas quando apropriado
- Palavras-chave SEO: imóveis de luxo em Goiânia, casas de alto padrão Goiânia, condomínios de luxo Goiânia, ${bairro}
- Inclua ao final 3 CTAs:
  1. "📱 Fale com um especialista agora pelo WhatsApp e descubra as melhores oportunidades em Goiânia."
  2. "📅 Agende uma visita exclusiva aos melhores imóveis de alto padrão."
  3. "🏠 Veja todos os imóveis disponíveis em nosso portfólio."

ESTRUTURA:
1. Introdução envolvente (desejo, luxo, conforto, investimento)
2. Corpo com informações detalhadas
3. Subtítulos H2/H3
4. Conclusão com CTAs

Retorne APENAS o conteúdo em Markdown, sem frontmatter.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Você é um redator especialista em marketing imobiliário de luxo em Goiânia, com foco em SEO e conversão." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          results.push({ theme, error: "Rate limited, skipping" });
          continue;
        }
        if (aiResponse.status === 402) {
          results.push({ theme, error: "Credits exhausted" });
          break;
        }
        continue;
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      const wordCount = content.split(/\s+/).length;
      const slug = slugify(theme);
      const excerpt = content.substring(0, 200).replace(/[#*\n]/g, "").trim() + "...";

      // Schedule posts across the week (Mon, Wed, Fri at 9am BRT)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const scheduleDays = [1, 3, 5]; // Mon, Wed, Fri
      const idx = results.length;
      let nextDay = scheduleDays[idx % 3];
      let daysUntil = nextDay - dayOfWeek;
      if (daysUntil <= 0) daysUntil += 7;
      const publishDate = new Date(now);
      publishDate.setDate(now.getDate() + daysUntil + (Math.floor(idx / 3) * 7));
      publishDate.setHours(12, 0, 0, 0); // 12:00 UTC = 9:00 BRT

      // Get some existing post slugs for internal links
      const internalLinks: string[] = [];
      if (existing && existing.length > 0) {
        const linkPosts = existing.sort(() => Math.random() - 0.5).slice(0, 3);
        linkPosts.forEach((p: any) => internalLinks.push(`/blog/${p.slug}`));
      }

      const { data: post, error } = await supabase.from("blog_posts").insert({
        title: theme,
        slug,
        content,
        excerpt,
        meta_title: `${theme} | Supreme Empreendimentos`,
        meta_description: excerpt.substring(0, 155),
        category,
        tags: [bairro.toLowerCase(), "luxo", "goiânia", "alto padrão", "investimento"],
        keywords: ["imóveis de luxo em Goiânia", "casas de alto padrão Goiânia", bairro],
        status: "scheduled",
        publish_date: publishDate.toISOString(),
        ai_generated: true,
        internal_links: internalLinks,
        word_count: wordCount,
        author: "Supreme Empreendimentos",
      }).select().single();

      if (error) {
        console.error("Insert error:", error);
        results.push({ theme, error: error.message });
      } else {
        results.push({ theme, slug, publish_date: publishDate.toISOString(), word_count: wordCount, id: post.id });
      }
    }

    // Auto-publish scheduled posts whose date has passed
    await supabase
      .from("blog_posts")
      .update({ status: "published" })
      .eq("status", "scheduled")
      .lte("publish_date", new Date().toISOString());

    return new Response(JSON.stringify({ success: true, posts_generated: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
