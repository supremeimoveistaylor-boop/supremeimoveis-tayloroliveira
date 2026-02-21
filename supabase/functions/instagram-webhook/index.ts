import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const VERIFY_TOKEN = (Deno.env.get('INSTAGRAM_WEBHOOK_VERIFY_TOKEN') || '').trim();

  // ========== GET — Webhook Verification (Meta hub.challenge) ==========
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token') || '';
    const challenge = url.searchParams.get('hub.challenge') || '';

    console.log('[Instagram Webhook] GET verification:', {
      mode,
      tokenLength: token.length,
      secretLength: VERIFY_TOKEN.length,
      secretConfigured: VERIFY_TOKEN.length > 0,
      match: token === VERIFY_TOKEN,
      challenge,
    });

    if (!VERIFY_TOKEN) {
      console.error('[Instagram Webhook] INSTAGRAM_WEBHOOK_VERIFY_TOKEN not configured');
      return new Response('Server configuration error', { status: 500 });
    }

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Instagram Webhook] ✅ Verification successful, returning challenge');
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    console.log('[Instagram Webhook] ❌ Verification failed - token mismatch');
    return new Response('Forbidden', { status: 403 });
  }

  // ========== POST — Receive Instagram Events ==========
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[Instagram Webhook] Event received:', JSON.stringify(body, null, 2));

      if (body.object !== 'instagram') {
        console.log('[Instagram Webhook] Ignoring non-instagram event:', body.object);
        return new Response('ok', { status: 200 });
      }

      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const entries = body.entry || [];

      for (const entry of entries) {
        const igUserId = entry.id; // The Instagram Business Account ID receiving the event

        // Find the tenant connection for this Instagram account
        const { data: connection, error: connErr } = await supabase
          .from('meta_channel_connections')
          .select('id, user_id, access_token_encrypted')
          .eq('instagram_id', igUserId)
          .eq('channel_type', 'instagram')
          .eq('status', 'connected')
          .maybeSingle();

        if (connErr || !connection) {
          console.error('[Instagram Webhook] No connection found for IG ID:', igUserId, connErr);
          continue;
        }

        console.log('[Instagram Webhook] Matched tenant connection:', connection.id);

        // Process messaging events (DMs)
        const messaging = entry.messaging || [];
        for (const event of messaging) {
          const senderId = event.sender?.id;
          const recipientId = event.recipient?.id;
          const timestamp = event.timestamp;

          // Incoming message
          if (event.message) {
            const messageText = event.message.text || '';
            const messageId = event.message.mid;
            const attachments = event.message.attachments || [];

            console.log('[Instagram Webhook] 📩 DM received:', {
              from: senderId,
              to: recipientId,
              text: messageText,
              messageId,
              hasAttachments: attachments.length > 0,
            });

            // Save to channel_messages
            const { error: insertErr } = await supabase
              .from('channel_messages')
              .insert({
                connection_id: connection.id,
                user_id: connection.user_id,
                direction: 'inbound',
                message_type: attachments.length > 0 ? 'media' : 'text',
                content: messageText,
                contact_instagram_id: senderId,
                meta_message_id: messageId,
                media_url: attachments[0]?.payload?.url || null,
                status: 'received',
              });

            if (insertErr) {
              console.error('[Instagram Webhook] Error saving message:', insertErr);
            } else {
              console.log('[Instagram Webhook] ✅ Message saved successfully');
            }

            // Update last_activity_at on connection
            await supabase
              .from('meta_channel_connections')
              .update({ last_activity_at: new Date().toISOString() })
              .eq('id', connection.id);
          }

          // Message read event
          if (event.read) {
            console.log('[Instagram Webhook] Read event:', { senderId, watermark: event.read.watermark });
          }

          // Echo/postback events
          if (event.postback) {
            console.log('[Instagram Webhook] Postback event:', { 
              senderId, 
              payload: event.postback.payload,
              title: event.postback.title,
            });
          }
        }

        // Process changes (comments, mentions, etc.)
        const changes = entry.changes || [];
        for (const change of changes) {
          console.log('[Instagram Webhook] Change event:', {
            field: change.field,
            value: JSON.stringify(change.value).substring(0, 200),
          });
        }
      }

      return new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    } catch (error) {
      console.error('[Instagram Webhook] Error processing event:', error);
      // Always return 200 to Meta to avoid retries
      return new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
