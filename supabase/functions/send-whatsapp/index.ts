import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WHATSAPP_API_VERSION = 'v21.0';

interface SendMessageRequest {
  to: string;
  message: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // =====================================================
    // AUTHENTICATION: Require valid JWT or service_role key
    // =====================================================
    const authHeader = req.headers.get('Authorization');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Allow service_role calls (from other edge functions)
    const token = authHeader?.replace('Bearer ', '') || '';
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;

    if (!isServiceRole) {
      // Validate user JWT
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[Send WhatsApp] Authenticated user:', data.user.id);
    } else {
      console.log('[Send WhatsApp] Service role call');
    }

    const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');

    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      console.error('[Send WhatsApp] Missing configuration');
      return new Response(
        JSON.stringify({ ok: false, error: 'WhatsApp API not configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SendMessageRequest = await req.json();
    const { to, message, templateName, templateLanguage, templateComponents } = body;

    if (!to) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Recipient phone number is required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input validation
    const formattedPhone = to.replace(/\D/g, '');
    if (formattedPhone.length < 10 || formattedPhone.length > 15) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid phone number format' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message && message.length > 4096) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Message too long (max 4096 chars)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let payload: any;

    if (templateName) {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLanguage || 'pt_BR' },
          components: templateComponents || [],
        },
      };
    } else if (message) {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { preview_url: false, body: message },
      };
    } else {
      return new Response(
        JSON.stringify({ ok: false, error: 'Message or template is required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Send WhatsApp] Sending message:', { to: formattedPhone, type: payload.type });

    const whatsappUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

    const response = await fetch(whatsappUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Send WhatsApp] API Error:', result);
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to send message' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Send WhatsApp] Message sent successfully:', result);

    return new Response(
      JSON.stringify({ ok: true, success: true, messageId: result.messages?.[0]?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Send WhatsApp] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
