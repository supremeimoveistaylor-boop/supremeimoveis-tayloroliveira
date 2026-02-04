import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  clientName?: string;
  clientPhone?: string;
  origin?: string;
  chatMessages?: Array<{ role: string; content: string }>;
  skipLeadCreation?: boolean;
}

interface ApiResponse {
  success: boolean;
  leadId?: string;
  messagesStored?: number;
  messagesCleanedUp?: number;
  error?: string;
}

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
    // Get Supabase credentials from secrets
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[real_estate_leads] Missing Supabase credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Parse request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      clientName,
      clientPhone,
      origin = "chat",
      chatMessages = [],
      skipLeadCreation = false
    } = body;

    const response: ApiResponse = { success: true };

    // =========================================================
    // 1. CREATE LEAD (if not skipped)
    // =========================================================
    if (!skipLeadCreation) {
      // Validate required fields for lead creation
      if (!clientName || !clientPhone) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "clientName and clientPhone are required when skipLeadCreation is false" 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Sanitize phone (only digits)
      const sanitizedPhone = clientPhone.replace(/\D/g, "");

      // Check if lead already exists by phone
      const { data: existingLead, error: checkError } = await supabase
        .from("leads")
        .select("id")
        .eq("phone", sanitizedPhone)
        .maybeSingle();

      if (checkError) {
        console.error("[real_estate_leads] Error checking existing lead:", checkError.message);
      }

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
          console.error("[real_estate_leads] Error updating lead:", updateError.message);
          return new Response(
            JSON.stringify({ success: false, error: "Failed to update lead" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        response.leadId = existingLead.id;
        console.log("[real_estate_leads] Updated existing lead:", existingLead.id);
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
          console.error("[real_estate_leads] Error creating lead:", insertError.message);
          return new Response(
            JSON.stringify({ success: false, error: "Failed to create lead" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        response.leadId = newLead.id;
        console.log("[real_estate_leads] Created new lead:", newLead.id);

        // Trigger lead score calculation
        try {
          await supabase.rpc("calculate_lead_score", { p_lead_id: newLead.id });
        } catch (scoreError) {
          console.warn("[real_estate_leads] Could not calculate lead score:", scoreError);
        }
      }
    }

    // =========================================================
    // 2. STORE CHAT MESSAGES (without sensitive lead data)
    // =========================================================
    if (chatMessages && chatMessages.length > 0 && response.leadId) {
      const messagesToInsert = chatMessages.map((msg) => ({
        lead_id: response.leadId,
        role: msg.role || "user",
        content: msg.content || "",
        created_at: new Date().toISOString()
      }));

      const { error: messagesError } = await supabase
        .from("chat_messages")
        .insert(messagesToInsert);

      if (messagesError) {
        console.error("[real_estate_leads] Error storing messages:", messagesError.message);
        // Don't fail the whole request, just log it
      } else {
        response.messagesStored = messagesToInsert.length;
        console.log("[real_estate_leads] Stored messages:", messagesToInsert.length);
      }
    }

    // =========================================================
    // 3. CLEANUP OLD MESSAGES (older than 2 days)
    // =========================================================
    try {
      const { data: cleanupResult, error: cleanupError } = await supabase
        .rpc("cleanup_old_chat_messages");

      if (cleanupError) {
        console.warn("[real_estate_leads] Cleanup warning:", cleanupError.message);
      } else {
        response.messagesCleanedUp = cleanupResult || 0;
        if (cleanupResult > 0) {
          console.log("[real_estate_leads] Cleaned up messages:", cleanupResult);
        }
      }
    } catch (cleanupEx) {
      console.warn("[real_estate_leads] Cleanup exception (non-critical):", cleanupEx);
    }

    // =========================================================
    // 4. RETURN SUCCESS RESPONSE
    // =========================================================
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    // Generic error handler - never expose internal details
    console.error("[real_estate_leads] Unhandled error:", error instanceof Error ? error.message : "Unknown error");
    
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
