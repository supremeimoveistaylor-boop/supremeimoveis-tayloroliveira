// Sitemap XML dinâmico apenas das páginas públicas de imóveis (/imovel/:id).
// ADITIVO: não substitui o public/sitemap.xml existente.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const BASE_URL = "https://supremeempreendimentos.com";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const { data, error } = await supabase
      .from("properties")
      .select("id, updated_at, status, listing_status")
      .neq("status", "inactive")
      .order("updated_at", { ascending: false })
      .limit(5000);

    if (error) throw error;

    const seen = new Set<string>();
    const urls: string[] = [];

    for (const p of data ?? []) {
      const raw = String(p.listing_status ?? p.status ?? "").toLowerCase();
      if (raw.includes("inativ") || raw === "inactive") continue;
      if (!p.id || seen.has(p.id)) continue;
      seen.add(p.id);
      const lastmod = p.updated_at ? String(p.updated_at).slice(0, 10) : null;
      urls.push(
        [
          "  <url>",
          `    <loc>${esc(`${BASE_URL}/imovel/${p.id}`)}</loc>`,
          lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
          "    <changefreq>weekly</changefreq>",
          "    <priority>0.8</priority>",
          "  </url>",
        ].filter(Boolean).join("\n"),
      );
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls,
      "</urlset>",
    ].join("\n");

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("[sitemap-imoveis]", e);
    // Sitemap vazio válido para não quebrar rastreadores
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      { status: 200, headers: { "Content-Type": "application/xml; charset=utf-8", "Access-Control-Allow-Origin": "*" } },
    );
  }
});
