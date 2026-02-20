import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERIFY_TOKEN = "supreme2026";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET - Webhook verification (Facebook/Meta challenge)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log('[WhatsApp Webhook] Verification request:', { mode, token, challenge });

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WhatsApp Webhook] Verification successful');
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    } else {
      console.log('[WhatsApp Webhook] Verification failed - invalid token or mode');
      return new Response('Forbidden', {
        status: 403,
        headers: corsHeaders,
      });
    }
  }

  // POST - Receive webhook events
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[WhatsApp Webhook] Event received:', JSON.stringify(body, null, 2));

      // Process incoming messages
      if (body.object === 'whatsapp_business_account') {
        const entries = body.entry || [];
        for (const entry of entries) {
          const changes = entry.changes || [];
          for (const change of changes) {
            if (change.field === 'messages') {
              const value = change.value || {};
              const messages = value.messages || [];
              const contacts = value.contacts || [];
              
              for (const message of messages) {
                console.log('[WhatsApp Webhook] Message:', {
                  from: message.from,
                  type: message.type,
                  text: message.text?.body,
                  timestamp: message.timestamp,
                  contact: contacts.find((c: any) => c.wa_id === message.from),
                });
              }

              // Log status updates
              const statuses = value.statuses || [];
              for (const status of statuses) {
                console.log('[WhatsApp Webhook] Status update:', {
                  id: status.id,
                  status: status.status,
                  recipientId: status.recipient_id,
                  timestamp: status.timestamp,
                });
              }
            }
          }
        }
      }

      return new Response('ok', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    } catch (error) {
      console.error('[WhatsApp Webhook] Error processing event:', error);
      return new Response('ok', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }
  }

  // Other methods not allowed
  return new Response('Method not allowed', {
    status: 405,
    headers: corsHeaders,
  });
});
