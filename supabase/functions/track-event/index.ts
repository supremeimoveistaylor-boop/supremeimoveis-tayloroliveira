import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting para evitar spam
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // 100 events per minute
const RATE_LIMIT_WINDOW = 60 * 1000;

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("x-real-ip") || 
         "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

// Allowed event types
const ALLOWED_EVENTS = [
  "page_view",
  "button_click",
  "whatsapp_click",
  "lead_generated",
  "checkout_started",
  "purchase_completed",
  "chat_started",
  "chat_message_sent",
  "property_viewed",
  "financing_started",
  "financing_completed",
  "contact_form_submitted",
  "phone_click",
  "share_click",
  "search_performed",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const clientIp = getClientIp(req);
    if (checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { event, session_id, user_id, page_url, referrer, device_type, browser, metadata } = body;

    if (!event || typeof event !== "string") {
      return new Response(
        JSON.stringify({ error: "event is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate event type
    if (!ALLOWED_EVENTS.includes(event)) {
      return new Response(
        JSON.stringify({ error: "Invalid event type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    await supabase.from("event_tracking").insert({
      event_type: event,
      session_id: session_id?.substring(0, 100) || null,
      user_id: user_id?.substring(0, 100) || null,
      page_url: page_url?.substring(0, 500) || null,
      referrer: referrer?.substring(0, 500) || null,
      ip_address: clientIp,
      device_type: device_type?.substring(0, 50) || null,
      browser: browser?.substring(0, 100) || null,
      metadata: metadata || {},
    });

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Track Event] Error:", error);
    return new Response(
      JSON.stringify({ ok: true }), // Always return 200 to not break client
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
