import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
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

    // Parse request body
    let body: { clientName?: string; clientPhone?: string; origin?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { clientName, clientPhone, origin = "chat" } = body;

    // Validate required fields
    if (!clientName || !clientPhone) {
      return new Response(
        JSON.stringify({ success: false, error: "clientName and clientPhone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize phone (only digits)
    const sanitizedPhone = clientPhone.replace(/\D/g, "");

    // Check if lead already exists by phone
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("phone", sanitizedPhone)
      .maybeSingle();

    let leadId: string;

    if (existingLead) {
      // Update existing lead
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          name: clientName,
          origin: origin,
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
      // Create new lead
      const { data: newLead, error: insertError } = await supabase
        .from("leads")
        .insert({
          name: clientName,
          phone: sanitizedPhone,
          origin: origin,
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
