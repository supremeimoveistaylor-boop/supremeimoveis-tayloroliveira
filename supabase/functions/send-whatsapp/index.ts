import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WHATSAPP_API_VERSION = 'v21.0';

interface SendMessageRequest {
  to: string;
  message?: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: any[];
  interactive?: any; // Raw WhatsApp interactive object (cta_url, button, list, etc.)
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
    const { to, message, templateName, templateLanguage, templateComponents, interactive } = body;

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
    } else if (interactive) {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'interactive',
        interactive,
      };
    } else if (message) {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { preview_url: true, body: message },
      };
    } else {
      return new Response(
        JSON.stringify({ ok: false, error: 'Message, interactive, or template is required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Send WhatsApp] Sending message:', { to: formattedPhone, type: payload.type });

    const whatsappUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

    // =====================================================
    // RETRY WITH EXPONENTIAL BACKOFF
    // =====================================================
    // Strategy:
    //  - Up to 4 attempts (1 initial + 3 retries)
    //  - Backoff: 500ms, 1500ms, 4000ms (with ±20% jitter)
    //  - Retry on: network errors (fetch throws), 5xx responses, 408, 429
    //  - DO NOT retry on: 4xx (except 408/429) — these are permanent client errors
    //    (e.g. invalid recipient, unauthorized, template not approved, etc.)
    // =====================================================
    const MAX_ATTEMPTS = 4;
    const BACKOFF_DELAYS_MS = [500, 1500, 4000];
    const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const jitter = (ms: number) => Math.round(ms * (0.8 + Math.random() * 0.4));

    let response: Response | null = null;
    let result: any = null;
    let lastError: string | null = null;
    let attempts = 0;
    let succeeded = false;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      attempts = attempt;
      try {
        response = await fetch(whatsappUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        result = await response.json().catch(() => ({}));

        if (response.ok) {
          succeeded = true;
          if (attempt > 1) {
            console.log(`[Send WhatsApp] ✅ Succeeded on attempt ${attempt}/${MAX_ATTEMPTS}`);
          }
          break;
        }

        const status = response.status;
        const isRetryable = RETRYABLE_STATUSES.has(status);
        lastError = `HTTP ${status}: ${JSON.stringify(result).slice(0, 300)}`;

        console.error(`[Send WhatsApp] Attempt ${attempt}/${MAX_ATTEMPTS} failed [${status}]:`, result);

        if (!isRetryable) {
          console.warn(`[Send WhatsApp] ❌ Non-retryable status ${status} — aborting retries`);
          break;
        }

        if (attempt < MAX_ATTEMPTS) {
          const delay = jitter(BACKOFF_DELAYS_MS[attempt - 1]);
          console.log(`[Send WhatsApp] ⏳ Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      } catch (networkErr) {
        // Network failure (DNS, connection reset, timeout, etc.)
        lastError = networkErr instanceof Error ? networkErr.message : String(networkErr);
        console.error(`[Send WhatsApp] Attempt ${attempt}/${MAX_ATTEMPTS} network error:`, lastError);

        if (attempt < MAX_ATTEMPTS) {
          const delay = jitter(BACKOFF_DELAYS_MS[attempt - 1]);
          console.log(`[Send WhatsApp] ⏳ Retrying in ${delay}ms (network)...`);
          await sleep(delay);
        }
      }
    }

    if (!succeeded) {
      console.error(`[Send WhatsApp] ❌ All ${attempts} attempt(s) failed. Last error:`, lastError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Failed to send message',
          attempts,
          last_error: lastError,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Send WhatsApp] Message sent successfully (attempts=${attempts}):`, result);

    return new Response(
      JSON.stringify({
        ok: true,
        success: true,
        messageId: result.messages?.[0]?.id,
        attempts,
      }),
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
