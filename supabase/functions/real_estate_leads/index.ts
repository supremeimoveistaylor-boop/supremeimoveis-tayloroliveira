import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WHATSAPP_API_VERSION = 'v22.0';
const BROKER_PHONE = '5562999918353';

async function sendLeadToWhatsApp(leadName: string, leadPhone: string, leadInterest: string) {
  const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.error('[WhatsApp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN');
    return;
  }

  const message = `🚨 Novo Lead Recebido\n\nNome: ${leadName}\nTelefone: ${leadPhone}\nInteresse: ${leadInterest}\n\nEnviado automaticamente pelo sistema.`;

  const payload = {
    messaging_product: 'whatsapp',
    to: BROKER_PHONE,
    type: 'text',
    text: { body: message },
  };

  try {
    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error('[WhatsApp] API error:', JSON.stringify(result));
    } else {
      console.log('[WhatsApp] Message sent successfully:', result.messages?.[0]?.id);
    }
  } catch (err) {
    console.error('[WhatsApp] Send failed:', err.message);
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[real_estate_leads] Missing Supabase credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    let body: { clientName?: string; clientPhone?: string; clientInterest?: string; origin?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { clientName, clientPhone, clientInterest, origin = "chat" } = body;

    if (!clientName || !clientPhone) {
      return new Response(
        JSON.stringify({ success: false, error: "clientName and clientPhone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedPhone = clientPhone.replace(/\D/g, "");

    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("phone", sanitizedPhone)
      .maybeSingle();

    let leadId: string;

    if (existingLead) {
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          name: clientName,
          intent: clientInterest || null,
          origin,
          last_interaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", existingLead.id);

      if (updateError) {
        console.error("[real_estate_leads] Update error:", updateError.message);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update lead" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      leadId = existingLead.id;
      console.log("[real_estate_leads] Updated lead:", leadId);
    } else {
      const { data: newLead, error: insertError } = await supabase
        .from("leads")
        .insert({
          name: clientName,
          phone: sanitizedPhone,
          intent: clientInterest || null,
          origin,
          status: "novo",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("[real_estate_leads] Insert error:", insertError.message);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create lead" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      leadId = newLead.id;
      console.log("[real_estate_leads] Created lead:", leadId);
    }

    // 🔥 Disparo assíncrono do WhatsApp — não bloqueia a resposta
    const interest = clientInterest || "Não informado";
    sendLeadToWhatsApp(clientName, sanitizedPhone, interest).catch(err => {
      console.error("[real_estate_leads] WhatsApp async error:", err.message);
    });

    return new Response(
      JSON.stringify({ success: true, leadId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[real_estate_leads] Unhandled error:", error instanceof Error ? error.message : "Unknown");
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
