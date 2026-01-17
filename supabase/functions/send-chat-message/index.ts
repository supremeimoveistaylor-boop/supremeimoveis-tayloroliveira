import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: track requests per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // messages per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    return true;
  }
  
  userLimit.count++;
  return false;
}

// Sanitize message content
function sanitizeMessage(message: string): string {
  if (!message || typeof message !== "string") {
    return "";
  }
  
  return message
    .replace(/[<>]/g, "") // Remove potential XSS vectors
    .trim()
    .substring(0, 1000); // Limit message length to 1000 chars
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User authenticated: ${user.id}`);

    // Check rate limit
    if (isRateLimited(user.id)) {
      console.warn(`Rate limit exceeded for user: ${user.id}`);
      return new Response(
        JSON.stringify({ error: "Muitas mensagens. Aguarde um momento." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { message, user_name } = await req.json();

    // Validate message
    const sanitizedMessage = sanitizeMessage(message);
    if (!sanitizedMessage) {
      return new Response(
        JSON.stringify({ error: "Mensagem vazia ou inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize user name
    const sanitizedUserName = (user_name || user.email?.split("@")[0] || "Anônimo")
      .replace(/[<>]/g, "")
      .trim()
      .substring(0, 50);

    console.log(`Saving message from ${sanitizedUserName}: ${sanitizedMessage.substring(0, 50)}...`);

    // Insert message into database
    const { data: insertedMessage, error: insertError } = await supabase
      .from("general_chat_messages")
      .insert({
        user_id: user.id,
        user_name: sanitizedUserName,
        message: sanitizedMessage,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar mensagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Message saved with ID: ${insertedMessage.id}`);

    return new Response(
      JSON.stringify({ success: true, message: insertedMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
