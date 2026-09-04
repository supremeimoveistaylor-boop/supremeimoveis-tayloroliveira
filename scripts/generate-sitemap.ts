// Gera public/sitemap.xml antes de `vite dev` e `vite build` (hooks predev/prebuild).
// Inclui rotas estáticas, páginas geográficas (bairro/rua/perto/regiao) e todos
// os imóveis ativos do banco (via edge function pública sitemap-imoveis).

import { writeFileSync } from "fs";
import { resolve } from "path";
import { neighborhoods, streets, pois, regions } from "../src/lib/geo-locations";

const BASE_URL = "https://supremeempreendimentos.com";
const PROPERTIES_SITEMAP =
  "https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/sitemap-imoveis";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/comprar", changefreq: "daily", priority: "0.9" },
  { path: "/alugar", changefreq: "daily", priority: "0.9" },
  { path: "/rurais", changefreq: "weekly", priority: "0.8" },
  { path: "/busca-mapa", changefreq: "daily", priority: "0.8" },
  { path: "/avaliar-imovel", changefreq: "monthly", priority: "0.7" },
  { path: "/quanto-vale-meu-imovel", changefreq: "monthly", priority: "0.7" },
  { path: "/sobre", changefreq: "monthly", priority: "0.6" },
  { path: "/contato", changefreq: "monthly", priority: "0.6" },
  { path: "/buscar", changefreq: "weekly", priority: "0.6" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/parcerias", changefreq: "weekly", priority: "0.6" },
  { path: "/politica-privacidade", changefreq: "yearly", priority: "0.3" },
  { path: "/termos-uso", changefreq: "yearly", priority: "0.3" },
];

const geoEntries: SitemapEntry[] = [
  ...neighborhoods.map((n) => ({ path: `/imoveis/bairro/${n.slug}`, changefreq: "weekly" as const, priority: "0.8" })),
  ...streets.map((s) => ({ path: `/imoveis/rua/${s.slug}`, changefreq: "weekly" as const, priority: "0.7" })),
  ...pois.map((p) => ({ path: `/imoveis/perto/${p.slug}`, changefreq: "weekly" as const, priority: "0.7" })),
  ...regions.map((r) => ({ path: `/imoveis/regiao/${r.slug}`, changefreq: "weekly" as const, priority: "0.7" })),
];

async function fetchPropertyEntries(): Promise<SitemapEntry[]> {
  try {
    const res = await fetch(PROPERTIES_SITEMAP);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const blocks = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
    return blocks
      .map((block) => {
        const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
        const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
        if (!loc) return null;
        return {
          path: loc.replace(BASE_URL, ""),
          lastmod,
          changefreq: "weekly" as const,
          priority: "0.8",
        };
      })
      .filter(Boolean) as SitemapEntry[];
  } catch (e) {
    console.warn("[sitemap] imóveis indisponíveis no momento:", (e as Error).message);
    return [];
  }
}

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      "  <url>",
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      "  </url>",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");
}

const propertyEntries = await fetchPropertyEntries();
const seen = new Set<string>();
const entries = [...staticEntries, ...geoEntries, ...propertyEntries].filter((e) => {
  if (seen.has(e.path)) return false;
  seen.add(e.path);
  return true;
});

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml gerado (${entries.length} URLs, ${propertyEntries.length} imóveis)`);
