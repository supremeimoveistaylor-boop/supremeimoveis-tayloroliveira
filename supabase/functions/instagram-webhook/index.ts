import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

console.log('[Instagram Webhook] Function loaded successfully');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rawSecret = Deno.env.get('INSTAGRAM_WEBHOOK_VERIFY_TOKEN') || '';
  const VERIFY_TOKEN = rawSecret.trim();

  // GET — Webhook Verification
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = (url.searchParams.get('hub.verify_token') || '').trim();
    const challenge = url.searchParams.get('hub.challenge') || '';

    console.log('[Instagram Webhook] GET verification:', { mode, match: token === VERIFY_TOKEN, challenge });

    if (!VERIFY_TOKEN) {
      return new Response('Server configuration error', { status: 500 });
    }

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Instagram Webhook] ✅ Verification successful');
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    return new Response('Forbidden', { status: 403 });
  }

  // POST — Receive Instagram Events
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[Instagram Webhook] Event received:', JSON.stringify(body, null, 2));

      if (body.object !== 'instagram') {
        return new Response('ok', { status: 200 });
      }

      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const entries = body.entry || [];

      for (const entry of entries) {
        const igUserId = entry.id;

        // Find tenant connection
        const { data: connection, error: connErr } = await supabase
          .from('meta_channel_connections')
          .select('id, user_id, access_token_encrypted, page_id')
          .eq('instagram_id', igUserId)
          .eq('channel_type', 'instagram')
          .eq('status', 'connected')
          .maybeSingle();

        if (connErr || !connection) {
          console.error('[Instagram Webhook] No connection for IG ID:', igUserId);
          continue;
        }

        // Process messaging events (DMs)
        const messaging = entry.messaging || [];
        for (const event of messaging) {
          const senderId = event.sender?.id;
          const recipientId = event.recipient?.id;

          // Skip messages from ourselves
          if (senderId === igUserId) continue;

          // Fetch Instagram user profile (non-blocking)
          let displayName: string | null = null;
          const pageToken = connection.access_token_encrypted;
          
          // Check if we already have a name saved for this contact
          const { data: existingConvCheck } = await supabase
            .from('omnichat_conversations')
            .select('contact_name')
            .eq('user_id', connection.user_id)
            .eq('channel', 'instagram')
            .eq('external_contact_id', senderId)
            .maybeSingle();
          
          // If we already have a real name (not a fallback), reuse it
          if (existingConvCheck?.contact_name && 
              !existingConvCheck.contact_name.startsWith('Instagram User #')) {
            displayName = existingConvCheck.contact_name;
            console.log('[Instagram Webhook] 👤 Reusing saved name:', displayName);
          }
          
          if (!displayName) {
            try {
              // Strategy 1: Instagram Graph API
              console.log('[Instagram Webhook] Fetching IG profile for IGSID:', senderId);
              const igProfileRes = await fetch(
                `https://graph.instagram.com/v21.0/${senderId}?fields=name,username,profile_pic`,
                { headers: { 'Authorization': `Bearer ${pageToken}` } }
              );
              
              if (igProfileRes.ok) {
                const profile = await igProfileRes.json();
                console.log('[Instagram Webhook] IG profile response:', JSON.stringify(profile));
                if (profile.username) {
                  displayName = `@${profile.username}`;
                } else if (profile.name) {
                  displayName = profile.name;
                }
              } else {
                const errText = await igProfileRes.text();
                console.warn('[Instagram Webhook] IG profile fetch failed:', igProfileRes.status, errText);
                
                // Strategy 2: Facebook Graph API
                const fbProfileRes = await fetch(
                  `https://graph.facebook.com/v21.0/${senderId}?fields=name,username,profile_pic`,
                  { headers: { 'Authorization': `Bearer ${pageToken}` } }
                );
                if (fbProfileRes.ok) {
                  const fbProfile = await fbProfileRes.json();
                  if (fbProfile.username) {
                    displayName = `@${fbProfile.username}`;
                  } else if (fbProfile.name) {
                    displayName = fbProfile.name;
                  }
                } else {
                  // Strategy 3: Page conversations endpoint
                  try {
                    const convRes = await fetch(
                      `https://graph.facebook.com/v21.0/${connection.page_id}/conversations?platform=instagram&fields=participants{name,username,id}&limit=50`,
                      { headers: { 'Authorization': `Bearer ${pageToken}` } }
                    );
                    if (convRes.ok) {
                      const convData = await convRes.json();
                      for (const conv of (convData.data || [])) {
                        for (const p of (conv.participants?.data || [])) {
                          if (p.id === senderId) {
                            displayName = p.username ? `@${p.username}` : p.name || null;
                            break;
                          }
                        }
                        if (displayName) break;
                      }
                    }
                  } catch (convErr) {
                    console.warn('[Instagram Webhook] Conversations fallback error:', convErr);
                  }
                }
              }
              
              if (displayName) {
                console.log('[Instagram Webhook] 👤 Profile resolved:', displayName);
              }
            } catch (profileErr) {
              console.warn('[Instagram Webhook] Profile fetch error (non-blocking):', profileErr);
            }
          }
          
          // Strategy 4: Try to extract name from the message text itself
          if (!displayName && event.message?.text) {
            const msgText = event.message.text;
            const namePatterns = [
              /meu nome [eé] ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
              /me chamo ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
              /sou o ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
              /sou a ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
              /aqui [eé] o ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
              /aqui [eé] a ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
            ];
            for (const pattern of namePatterns) {
              const match = msgText.match(pattern);
              if (match) {
                const name = match[1].trim().replace(/[.,!?]+$/, "");
                if (name.length >= 2 && name.length <= 50) {
                  displayName = name.charAt(0).toUpperCase() + name.slice(1);
                  console.log('[Instagram Webhook] 👤 Name extracted from message:', displayName);
                  break;
                }
              }
            }
          }
          
          // Fallback if no name resolved
          if (!displayName) {
            const lastDigits = senderId?.slice(-4) || '0000';
            displayName = `Instagram User #${lastDigits}`;
          }

          // Incoming message
          if (event.message) {
            const messageText = event.message.text || '';
            const messageId = event.message.mid;
            const attachments = event.message.attachments || [];
            const mediaUrl = attachments[0]?.payload?.url || null;

            console.log('[Instagram Webhook] 📩 DM from:', displayName, '(', senderId, ') text:', messageText);

            // Save to channel_messages (legacy)
            await supabase.from('channel_messages').insert({
              connection_id: connection.id,
              user_id: connection.user_id,
              direction: 'inbound',
              message_type: attachments.length > 0 ? 'media' : 'text',
              content: messageText,
              contact_instagram_id: senderId,
              contact_name: displayName,
              meta_message_id: messageId,
              media_url: mediaUrl,
              status: 'received',
            });

            // Create or update omnichat conversation
            const { data: existingConv } = await supabase
              .from('omnichat_conversations')
              .select('id, unread_count')
              .eq('user_id', connection.user_id)
              .eq('channel', 'instagram')
              .eq('external_contact_id', senderId)
              .maybeSingle();

            let convId: string;

            if (existingConv) {
              convId = existingConv.id;
              await supabase.from('omnichat_conversations').update({
                last_message_at: new Date().toISOString(),
                last_message_preview: messageText.substring(0, 100),
                unread_count: (existingConv.unread_count || 0) + 1,
                status: 'open',
                contact_name: displayName,
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
                  channel: 'instagram',
                  external_contact_id: senderId,
                  contact_name: displayName,
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

            // Save to omnichat_messages
            await supabase.from('omnichat_messages').insert({
              conversation_id: convId,
              sender_type: 'client',
              channel: 'instagram',
              content: messageText,
              media_url: mediaUrl,
              meta_message_id: messageId,
            });

            // If bot active, trigger AI reply
            const { data: conv } = await supabase
              .from('omnichat_conversations')
              .select('bot_active')
              .eq('id', convId)
              .single();

            if (conv?.bot_active && messageText) {
              try {
                const chatRes = await fetch(`${SUPABASE_URL}/functions/v1/real-estate-chat`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    message: messageText,
                    skipLeadCreation: true,
                    origin: 'instagram',
                  }),
                });
                const chatData = await chatRes.json();
                const aiReply = chatData?.reply || chatData?.response;

                if (aiReply && connection.page_id) {
                  // Send AI reply via Instagram
                  const sendUrl = `https://graph.facebook.com/v19.0/${connection.page_id}/messages`;
                  await fetch(sendUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${connection.access_token_encrypted}`,
                    },
                    body: JSON.stringify({
                      recipient: { id: senderId },
                      message: { text: aiReply },
                    }),
                  });

                  // Save bot message
                  await supabase.from('omnichat_messages').insert({
                    conversation_id: convId,
                    sender_type: 'bot',
                    channel: 'instagram',
                    content: aiReply,
                  });

                  await supabase.from('omnichat_conversations').update({
                    last_message_at: new Date().toISOString(),
                    last_message_preview: aiReply.substring(0, 100),
                  }).eq('id', convId);

                  console.log('[Instagram Webhook] ✅ AI replied to', senderId);
                }
              } catch (aiErr) {
                console.error('[Instagram Webhook] AI response error:', aiErr);
              }
            }

            // Update last_activity_at on connection
            await supabase.from('meta_channel_connections')
              .update({ last_activity_at: new Date().toISOString() })
              .eq('id', connection.id);
          }

          // Read event
          if (event.read) {
            console.log('[Instagram Webhook] Read event:', senderId);
          }
        }
      }

      return new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    } catch (error) {
      console.error('[Instagram Webhook] Error:', error);
      return new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
