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

function corsHeaders(origin?: string) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  } as Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req.headers.get("origin") || undefined) });
  }

  try {
    const origin = req.headers.get("origin") || undefined;

    const { limit = 50, featured }: { limit?: number; featured?: boolean } =
      req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));

    let query = supabase
      .from("properties_public")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (typeof featured === "boolean") {
      query = query.eq("featured", featured);
    }

    const { data, error } = await query;

    if (error) {
    console.error("Edge fn get_public_properties error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return new Response(
        JSON.stringify({ error: "Falha ao carregar imóveis", details: error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
      );
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  } catch (e) {
    console.error("Edge fn get_public_properties exception:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }
});
