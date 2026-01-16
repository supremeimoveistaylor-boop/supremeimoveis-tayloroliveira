// Supabase Edge Function: search-properties
// Real search endpoint with Full Text Search and filters
// Deno runtime

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchParams {
  q?: string;
  finalidade?: string; // comprar | alugar
  tipo?: string; // casa | apartamento | rural
  bairro?: string;
  cidade?: string;
  preco_min?: number;
  preco_max?: number;
  quartos?: number;
  limit?: number;
  offset?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Search edge function called:", req.method);

    // Parse parameters from query string (GET) or body (POST)
    let params: SearchParams = {};
    
    if (req.method === "GET") {
      const url = new URL(req.url);
      params = {
        q: url.searchParams.get("q") || undefined,
        finalidade: url.searchParams.get("finalidade") || undefined,
        tipo: url.searchParams.get("tipo") || undefined,
        bairro: url.searchParams.get("bairro") || undefined,
        cidade: url.searchParams.get("cidade") || undefined,
        preco_min: url.searchParams.get("preco_min") ? Number(url.searchParams.get("preco_min")) : undefined,
        preco_max: url.searchParams.get("preco_max") ? Number(url.searchParams.get("preco_max")) : undefined,
        quartos: url.searchParams.get("quartos") ? Number(url.searchParams.get("quartos")) : undefined,
        limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 50,
        offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0,
      };
    } else if (req.method === "POST") {
      params = await req.json().catch(() => ({}));
    }

    console.log("Search params:", JSON.stringify(params));

    const {
      q,
      finalidade,
      tipo,
      bairro,
      cidade,
      preco_min,
      preco_max,
      quartos,
      limit = 50,
      offset = 0,
    } = params;

    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const safeOffset = Math.max(0, Number(offset) || 0);

    // Build the query
    let query = supabase
      .from("properties")
      .select("*", { count: "exact" })
      .eq("status", "active")
      .order("created_at", { ascending: false });

    // Full Text Search on title and description
    if (q && q.trim()) {
      const searchTerms = q.trim().split(/\s+/).join(" & ");
      console.log("Applying FTS search:", searchTerms);
      query = query.textSearch("title", searchTerms, { type: "websearch", config: "portuguese" });
    }

    // Filter by purpose (finalidade)
    if (finalidade) {
      const purposeMap: Record<string, string> = {
        comprar: "sale",
        venda: "sale",
        sale: "sale",
        alugar: "rent",
        aluguel: "rent",
        rent: "rent",
      };
      const mappedPurpose = purposeMap[finalidade.toLowerCase()] || finalidade;
      console.log("Filtering by purpose:", mappedPurpose);
      query = query.eq("purpose", mappedPurpose);
    }

    // Filter by property type
    if (tipo) {
      const typeMap: Record<string, string> = {
        casa: "house",
        casas: "house",
        house: "house",
        apartamento: "apartment",
        apartamentos: "apartment",
        apartment: "apartment",
        rural: "rural",
        rurais: "rural",
        terreno: "land",
        comercial: "commercial",
      };
      const mappedType = typeMap[tipo.toLowerCase()] || tipo;
      console.log("Filtering by property type:", mappedType);
      query = query.eq("property_type", mappedType);
    }

    // Filter by neighborhood (bairro) - using ilike for partial match
    if (bairro && bairro.trim()) {
      console.log("Filtering by bairro:", bairro);
      query = query.ilike("location", `%${bairro.trim()}%`);
    }

    // Filter by city (cidade) - using ilike for partial match
    if (cidade && cidade.trim()) {
      console.log("Filtering by cidade:", cidade);
      query = query.ilike("location", `%${cidade.trim()}%`);
    }

    // Price filters
    if (preco_min && !isNaN(preco_min)) {
      console.log("Filtering by min price:", preco_min);
      query = query.gte("price", preco_min);
    }

    if (preco_max && !isNaN(preco_max)) {
      console.log("Filtering by max price:", preco_max);
      query = query.lte("price", preco_max);
    }

    // Bedrooms filter
    if (quartos && !isNaN(quartos)) {
      console.log("Filtering by bedrooms:", quartos);
      query = query.gte("bedrooms", quartos);
    }

    // Apply pagination
    query = query.range(safeOffset, safeOffset + safeLimit - 1);

    console.log("Executing search query...");
    const { data, error, count } = await query;

    if (error) {
      console.error("Database error during search:", error);
      return new Response(
        JSON.stringify({ 
          error: "Falha na busca de imóveis", 
          code: "SEARCH_ERROR",
          details: error.message 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Search completed: ${data?.length || 0} results out of ${count || 0} total`);

    return new Response(
      JSON.stringify({
        data: data || [],
        total: count || 0,
        limit: safeLimit,
        offset: safeOffset,
        hasMore: (count || 0) > safeOffset + safeLimit,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (e) {
    console.error("Unexpected error in search edge function:", e);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor", 
        code: "INTERNAL_SERVER_ERROR" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
