import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || Deno.env.get('INSTAGRAM_WEBHOOK_VERIFY_TOKEN');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET - Webhook verification
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
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }
  }

  // POST - Receive webhook events
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[WhatsApp Webhook] Event received:', JSON.stringify(body, null, 2));

      if (body.object === 'whatsapp_business_account') {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const entries = body.entry || [];
        for (const entry of entries) {
          const changes = entry.changes || [];
          for (const change of changes) {
            if (change.field === 'messages') {
              const value = change.value || {};
              const messages = value.messages || [];
              const contacts = value.contacts || [];
              const phoneNumberId = value.metadata?.phone_number_id;

              // Find tenant connection
              const { data: connection } = await supabase
                .from('meta_channel_connections')
                .select('id, user_id')
                .eq('phone_number_id', phoneNumberId)
                .eq('channel_type', 'whatsapp')
                .eq('status', 'connected')
                .maybeSingle();

              for (const message of messages) {
                const senderPhone = message.from;
                const contactInfo = contacts.find((c: any) => c.wa_id === senderPhone);
                const contactName = contactInfo?.profile?.name || null;
                const messageText = message.text?.body || message.caption || '';
                const mediaUrl = message.image?.url || message.video?.url || message.document?.url || null;

                console.log('[WhatsApp Webhook] Message:', { from: senderPhone, text: messageText, contact: contactName });

                if (connection) {
                  // Create or update omnichat conversation
                  const { data: existingConv } = await supabase
                    .from('omnichat_conversations')
                    .select('id, unread_count')
                    .eq('user_id', connection.user_id)
                    .eq('channel', 'whatsapp')
                    .eq('external_contact_id', senderPhone)
                    .maybeSingle();

                  let convId: string;

                  if (existingConv) {
                    convId = existingConv.id;
                    await supabase.from('omnichat_conversations').update({
                      last_message_at: new Date().toISOString(),
                      last_message_preview: messageText.substring(0, 100),
                      unread_count: (existingConv.unread_count || 0) + 1,
                      contact_name: contactName || undefined,
                      status: 'open',
                    }).eq('id', convId);
                  } else {
                    // Check if any agent is online
                    const { data: onlineAgents } = await supabase
                      .from('agent_status')
                      .select('user_id')
                      .eq('status', 'online')
                      .limit(1);

                    const botActive = !onlineAgents || onlineAgents.length === 0;

                    const { data: newConv } = await supabase
                      .from('omnichat_conversations')
                      .insert({
                        user_id: connection.user_id,
                        channel: 'whatsapp',
                        external_contact_id: senderPhone,
                        contact_name: contactName,
                        contact_phone: senderPhone,
                        connection_id: connection.id,
                        bot_active: botActive,
                        last_message_at: new Date().toISOString(),
                        last_message_preview: messageText.substring(0, 100),
                        unread_count: 1,
                      })
                      .select('id')
                      .single();

                    convId = newConv!.id;
                  }

                  // Save message
                  await supabase.from('omnichat_messages').insert({
                    conversation_id: convId,
                    sender_type: 'client',
                    channel: 'whatsapp',
                    content: messageText,
                    media_url: mediaUrl,
                    meta_message_id: message.id,
                  });

                  // If bot is active and no agent online, trigger AI response
                  const { data: conv } = await supabase
                    .from('omnichat_conversations')
                    .select('bot_active')
                    .eq('id', convId)
                    .single();

                  if (conv?.bot_active && messageText) {
                    // Call dedicated WhatsApp AI module
                    try {
                      const chatRes = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-ai-chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          message: messageText,
                          senderPhone,
                          conversationId: convId,
                          contactName,
                        }),
                      });
                      const chatData = await chatRes.json();
                      const aiReply = chatData?.reply;

                      if (aiReply) {
                        // Send AI reply via WhatsApp
                        await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ to: senderPhone, message: aiReply }),
                        });

                        // Save bot message
                        await supabase.from('omnichat_messages').insert({
                          conversation_id: convId,
                          sender_type: 'bot',
                          channel: 'whatsapp',
                          content: aiReply,
                        });

                        await supabase.from('omnichat_conversations').update({
                          last_message_at: new Date().toISOString(),
                          last_message_preview: aiReply.substring(0, 100),
                        }).eq('id', convId);

                        console.log('[WhatsApp Webhook] ✅ AI replied to', senderPhone);
                      }
                    } catch (aiErr) {
                      console.error('[WhatsApp Webhook] AI response error:', aiErr);
                    }
                  }
                }
              }

              // Log status updates
              const statuses = value.statuses || [];
              for (const status of statuses) {
                console.log('[WhatsApp Webhook] Status:', { id: status.id, status: status.status });
              }
            }
          }
        }
      }

      return new Response('ok', { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } });
    } catch (error) {
      console.error('[WhatsApp Webhook] Error:', error);
      return new Response('ok', { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
});
