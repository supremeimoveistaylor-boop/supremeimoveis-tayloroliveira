// Supabase Edge Function: get_public_properties
// Fetch public properties safely using the service role (bypasses RLS) and return a limited list
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Edge function called:", req.method);

    const { limit = 50, featured, id }: { limit?: number; featured?: boolean; id?: string } =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));

    if (id) {
      console.log("Fetching single property by id:", id);
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("status", "active")
        .eq("id", id)
        .limit(1);

      if (error) {
        console.error("Database error fetching single property:", error);
        return new Response(
          JSON.stringify({ error: "Falha ao carregar imóvel", code: "PROPERTY_FETCH_ERROR" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(JSON.stringify({ data: data || [] }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let query = supabase
      .from("properties")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (typeof featured === "boolean") {
      query = query.eq("featured", featured);
    }

    console.log("Executing query for properties...");
    const { data, error } = await query;

    if (error) {
      console.error("Database error fetching properties:", error);
      return new Response(
        JSON.stringify({ error: "Falha ao carregar imóveis", code: "PROPERTIES_FETCH_ERROR" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${data?.length || 0} properties`);
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("Unexpected error in edge function:", e);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor", code: "INTERNAL_SERVER_ERROR" }), 
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
