import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

console.log('[Instagram Webhook] Function loaded successfully');

// =====================================================
// HELPER: Extract phone number from text
// =====================================================
function extractPhone(text: string): string | null {
  const patterns = [
    /(\+55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4})/,
    /(\(?\d{2}\)?\s?\d{4,5}-?\d{4})/,
    /(\d{2}\s?\d{4,5}\s?\d{4})/,
    /(\d{10,11})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const digits = match[1].replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 13) {
        return digits;
      }
    }
  }
  return null;
}

// =====================================================
// HELPER: Extract name from text
// =====================================================
function extractNameFromText(text: string): string | null {
  const patterns = [
    /meu nome [eé] ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
    /me chamo ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
    /sou o ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
    /sou a ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
    /aqui [eé] o ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
    /aqui [eé] a ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
    /pode me chamar de ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
    /meu nome:?\s*([a-záàâãéèêíïóôõöúçñ\s]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].trim().replace(/[.,!?]+$/, "").trim();
      if (name.length >= 2 && name.length <= 50) {
        return name.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      }
    }
  }
  return null;
}

// =====================================================
// HELPER: Check if name is a fallback placeholder
// =====================================================
function isFallbackName(name: string | null): boolean {
  if (!name) return true;
  return /^Instagram User #\d+$/.test(name) || /^\d+$/.test(name) || name === 'Visitante' || name === 'Visitante do Chat';
}

// =====================================================
// HELPER: Resolve Instagram profile via API
// =====================================================
async function resolveInstagramProfile(senderId: string, pageToken: string, pageId: string | null): Promise<{ displayName: string | null; username: string | null }> {
  let displayName: string | null = null;
  let username: string | null = null;

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
      username = profile.username || null;
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
        username = fbProfile.username || null;
        if (fbProfile.username) {
          displayName = `@${fbProfile.username}`;
        } else if (fbProfile.name) {
          displayName = fbProfile.name;
        }
      } else if (pageId) {
        // Strategy 3: Page conversations endpoint
        try {
          const convRes = await fetch(
            `https://graph.facebook.com/v21.0/${pageId}/conversations?platform=instagram&fields=participants{name,username,id}&limit=50`,
            { headers: { 'Authorization': `Bearer ${pageToken}` } }
          );
          if (convRes.ok) {
            const convData = await convRes.json();
            for (const conv of (convData.data || [])) {
              for (const p of (conv.participants?.data || [])) {
                if (p.id === senderId) {
                  username = p.username || null;
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
  } catch (profileErr) {
    console.warn('[Instagram Webhook] Profile fetch error (non-blocking):', profileErr);
  }

  return { displayName, username };
}

// =====================================================
// HELPER: Sync name/phone across all related records
// =====================================================
async function syncLeadData(
  supabase: ReturnType<typeof createClient>,
  convId: string,
  senderId: string,
  updates: { name?: string; phone?: string }
) {
  if (!updates.name && !updates.phone) return;

  // 1. Update omnichat_conversations
  const convUpdate: Record<string, unknown> = {};
  if (updates.name) convUpdate.contact_name = updates.name;
  if (updates.phone) convUpdate.contact_phone = updates.phone;
  if (Object.keys(convUpdate).length > 0) {
    await supabase.from('omnichat_conversations').update(convUpdate).eq('id', convId);
    console.log('[Instagram Webhook] ✅ Conversation updated:', convUpdate);
  }

  // 2. Update channel_messages for this contact
  const chMsgUpdate: Record<string, unknown> = {};
  if (updates.name) chMsgUpdate.contact_name = updates.name;
  if (Object.keys(chMsgUpdate).length > 0) {
    await supabase.from('channel_messages').update(chMsgUpdate).eq('contact_instagram_id', senderId);
  }

  // 3. Update lead
  const { data: convData } = await supabase
    .from('omnichat_conversations')
    .select('lead_id')
    .eq('id', convId)
    .single();

  if (convData?.lead_id) {
    const leadUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name) leadUpdate.name = updates.name;
    if (updates.phone) leadUpdate.phone = updates.phone;
    leadUpdate.last_interaction_at = new Date().toISOString();
    await supabase.from('leads').update(leadUpdate).eq('id', convData.lead_id);
    console.log('[Instagram Webhook] ✅ Lead updated:', leadUpdate);

    // 4. Update CRM card if exists
    const crmUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name) {
      crmUpdate.cliente = updates.name;
      crmUpdate.titulo = `Lead Instagram - ${updates.name}`;
    }
    if (updates.phone) crmUpdate.telefone = updates.phone;
    crmUpdate.last_interaction_at = new Date().toISOString();
    await supabase.from('crm_cards').update(crmUpdate).eq('lead_id', convData.lead_id);

    // 5. Send broker WhatsApp alert when we have BOTH name and phone
    if (updates.name && updates.phone) {
      await notifyBroker(supabase, updates.name, updates.phone, 'Instagram');
    } else if (updates.phone) {
      // Check if lead already has name
      const { data: leadData } = await supabase.from('leads').select('name').eq('id', convData.lead_id).single();
      if (leadData?.name && !isFallbackName(leadData.name)) {
        await notifyBroker(supabase, leadData.name, updates.phone, 'Instagram');
      }
    } else if (updates.name) {
      // Check if lead already has phone
      const { data: leadData } = await supabase.from('leads').select('phone, whatsapp_sent').eq('id', convData.lead_id).single();
      if (leadData?.phone && !leadData.whatsapp_sent) {
        await notifyBroker(supabase, updates.name, leadData.phone, 'Instagram');
        await supabase.from('leads').update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() }).eq('id', convData.lead_id);
      }
    }
  }
}

// =====================================================
// HELPER: Notify broker via WhatsApp
// =====================================================
async function notifyBroker(
  supabase: ReturnType<typeof createClient>,
  name: string,
  phone: string,
  origin: string
) {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const { data: brokers } = await supabase
      .from('brokers')
      .select('whatsapp')
      .eq('active', true)
      .limit(1);

    if (brokers && brokers.length > 0) {
      const brokerMessage = `🚨 Novo Lead no Sistema\n\n` +
        `👤 Nome: ${name}\n` +
        `📱 Telefone: ${phone}\n` +
        `📍 Origem: ${origin}\n\n` +
        `O cliente entrou em contato e aguarda retorno.\n` +
        `Acesse o painel para continuar o atendimento.`;

      await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: brokers[0].whatsapp, message: brokerMessage }),
      });
      console.log(`[Instagram Webhook] ✅ Broker notified: ${name} / ${phone}`);
    }
  } catch (notifyErr) {
    console.error('[Instagram Webhook] Broker notification error:', notifyErr);
  }
}

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

          // =====================================================
          // STEP 1: Resolve display name
          // =====================================================
          let displayName: string | null = null;
          let igUsername: string | null = null;
          const pageToken = connection.access_token_encrypted;

          // Check if we already have a real name saved
          const { data: existingConvCheck } = await supabase
            .from('omnichat_conversations')
            .select('contact_name, contact_phone, lead_id')
            .eq('user_id', connection.user_id)
            .eq('channel', 'instagram')
            .eq('external_contact_id', senderId)
            .maybeSingle();

          // Reuse existing real name
          if (existingConvCheck?.contact_name && !isFallbackName(existingConvCheck.contact_name)) {
            displayName = existingConvCheck.contact_name;
            console.log('[Instagram Webhook] 👤 Reusing saved name:', displayName);
          }

          // Try API resolution if no real name yet
          if (!displayName) {
            const profile = await resolveInstagramProfile(senderId, pageToken, connection.page_id);
            displayName = profile.displayName;
            igUsername = profile.username;
            if (displayName) {
              console.log('[Instagram Webhook] 👤 Profile resolved:', displayName);
            }
          }

          // Fallback
          if (!displayName) {
            const lastDigits = senderId?.slice(-4) || '0000';
            displayName = `Instagram User #${lastDigits}`;
          }

          // =====================================================
          // STEP 2: Process incoming message
          // =====================================================
          if (event.message) {
            const messageText = event.message.text || '';
            const messageId = event.message.mid;
            const attachments = event.message.attachments || [];
            const mediaUrl = attachments[0]?.payload?.url || null;

            console.log('[Instagram Webhook] 📩 DM from:', displayName, '(', senderId, ') text:', messageText);

            // =====================================================
            // STEP 3: Extract name and phone from message text
            // =====================================================
            let extractedName: string | null = null;
            let extractedPhone: string | null = null;

            if (messageText) {
              extractedName = extractNameFromText(messageText);
              extractedPhone = extractPhone(messageText);
            }

            // Save to channel_messages (legacy)
            await supabase.from('channel_messages').insert({
              connection_id: connection.id,
              user_id: connection.user_id,
              direction: 'inbound',
              message_type: attachments.length > 0 ? 'media' : 'text',
              content: messageText,
              contact_instagram_id: senderId,
              contact_name: extractedName || displayName,
              meta_message_id: messageId,
              media_url: mediaUrl,
              status: 'received',
            });

            // =====================================================
            // STEP 4: Create or update omnichat conversation (DEDUP by external_contact_id)
            // =====================================================
            const { data: existingConv } = await supabase
              .from('omnichat_conversations')
              .select('id, unread_count, contact_name, contact_phone, lead_id')
              .eq('user_id', connection.user_id)
              .eq('channel', 'instagram')
              .eq('external_contact_id', senderId)
              .maybeSingle();

            let convId: string;

            if (existingConv) {
              convId = existingConv.id;
              const convUpdate: Record<string, unknown> = {
                last_message_at: new Date().toISOString(),
                last_message_preview: messageText.substring(0, 100),
                unread_count: (existingConv.unread_count || 0) + 1,
                status: 'open',
              };
              // Update name if we have a real one and existing is fallback
              if (!isFallbackName(displayName) && isFallbackName(existingConv.contact_name)) {
                convUpdate.contact_name = displayName;
              }
              // Update with extracted name (always takes priority)
              if (extractedName) {
                convUpdate.contact_name = extractedName;
              }
              // Update phone if extracted
              if (extractedPhone && !existingConv.contact_phone) {
                convUpdate.contact_phone = extractedPhone;
              }
              await supabase.from('omnichat_conversations').update(convUpdate).eq('id', convId);
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
                  contact_name: extractedName || displayName,
                  contact_phone: extractedPhone,
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

            // =====================================================
            // STEP 5: Lead management (DEDUP - never create duplicates)
            // =====================================================
            try {
              const { data: convForLead } = await supabase
                .from('omnichat_conversations')
                .select('lead_id')
                .eq('id', convId)
                .single();

              if (!convForLead?.lead_id) {
                // Check dedup by phone first
                let existingLeadId: string | null = null;
                if (extractedPhone) {
                  const { data: phoneMatch } = await supabase
                    .from('leads')
                    .select('id')
                    .eq('phone', extractedPhone)
                    .maybeSingle();
                  if (phoneMatch) existingLeadId = phoneMatch.id;
                }

                if (existingLeadId) {
                  // Link existing lead
                  await supabase.from('omnichat_conversations').update({ lead_id: existingLeadId }).eq('id', convId);
                  const leadUpdate: Record<string, unknown> = { last_interaction_at: new Date().toISOString(), updated_at: new Date().toISOString() };
                  if (extractedName) leadUpdate.name = extractedName;
                  await supabase.from('leads').update(leadUpdate).eq('id', existingLeadId);
                  console.log('[Instagram Webhook] ✅ Linked to existing lead by phone:', existingLeadId);
                } else {
                  // Create new lead (temporary if no name)
                  const leadName = extractedName || (isFallbackName(displayName) ? 'Visitante' : displayName);
                  const { data: newLead } = await supabase
                    .from('leads')
                    .insert({
                      name: leadName,
                      phone: extractedPhone,
                      origin: 'instagram',
                      status: 'novo',
                    })
                    .select('id')
                    .single();

                  if (newLead) {
                    await supabase.from('omnichat_conversations').update({
                      lead_id: newLead.id,
                    }).eq('id', convId);

                    // Create CRM card
                    await supabase.from('crm_cards').insert({
                      titulo: `Lead Instagram - ${leadName}`,
                      cliente: leadName,
                      telefone: extractedPhone || null,
                      coluna: 'leads',
                      origem_lead: 'instagram',
                      classificacao: 'frio',
                      prioridade: 'normal',
                      lead_id: newLead.id,
                      lead_score: 10,
                      probabilidade_fechamento: 5,
                      valor_estimado: 0,
                    });

                    console.log('[Instagram Webhook] ✅ Lead + CRM card created:', newLead.id);

                    // If already has name+phone, notify broker
                    if (extractedName && extractedPhone) {
                      await notifyBroker(supabase, extractedName, extractedPhone, 'Instagram');
                      await supabase.from('leads').update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() }).eq('id', newLead.id);
                    }
                  }
                }
              } else {
                // Update existing lead with better data
                const leadUpdate: Record<string, unknown> = {
                  last_interaction_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                if (extractedName) leadUpdate.name = extractedName;
                if (extractedPhone) leadUpdate.phone = extractedPhone;
                
                await supabase.from('leads').update(leadUpdate).eq('id', convForLead.lead_id);

                // Also update CRM card if exists
                if (extractedName || extractedPhone) {
                  const crmUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
                  if (extractedName) {
                    crmUpdate.cliente = extractedName;
                    crmUpdate.titulo = `Lead Instagram - ${extractedName}`;
                  }
                  if (extractedPhone) crmUpdate.telefone = extractedPhone;
                  await supabase.from('crm_cards').update(crmUpdate).eq('lead_id', convForLead.lead_id);
                }

                // Check if we should notify broker (name+phone now complete)
                if (extractedName || extractedPhone) {
                  const { data: leadCheck } = await supabase.from('leads').select('name, phone, whatsapp_sent').eq('id', convForLead.lead_id).single();
                  if (leadCheck && leadCheck.name && !isFallbackName(leadCheck.name) && leadCheck.phone && !leadCheck.whatsapp_sent) {
                    await notifyBroker(supabase, leadCheck.name, leadCheck.phone, 'Instagram');
                    await supabase.from('leads').update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() }).eq('id', convForLead.lead_id);
                  }
                }
              }
            } catch (leadErr) {
              console.error('[Instagram Webhook] Lead sync error:', leadErr);
            }

            // =====================================================
            // STEP 6: Contextual name extraction (bot asked for name)
            // =====================================================
            if (messageText && existingConv && isFallbackName(existingConv.contact_name)) {
              let contextualName: string | null = extractedName;

              if (!contextualName) {
                // Check if the previous bot message asked for the name
                const { data: lastBotMsg } = await supabase
                  .from('omnichat_messages')
                  .select('content')
                  .eq('conversation_id', convId)
                  .eq('sender_type', 'bot')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (lastBotMsg?.content) {
                  const botText = lastBotMsg.content.toLowerCase();
                  const askedName = /como (?:posso |devo )?(?:te )?chamar/i.test(botText) ||
                    /qual (?:[eé] )?(?:o )?seu nome/i.test(botText) ||
                    /seu nome/i.test(botText) ||
                    /como te chamar/i.test(botText) ||
                    /saber seu nome/i.test(botText);

                  if (askedName) {
                    const cleaned = messageText.trim().replace(/[.,!?]+$/, "").trim();
                    const words = cleaned.split(/\s+/);
                    if (words.length >= 1 && words.length <= 4 &&
                      /^[a-záàâãéèêíïóôõöúçñ\s]+$/i.test(cleaned) &&
                      cleaned.length >= 2 && cleaned.length <= 60) {
                      contextualName = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                      console.log('[Instagram Webhook] 👤 Name from context (bot asked):', contextualName);
                    }
                  }
                }
              }

              // Sync name across all records
              if (contextualName) {
                await syncLeadData(supabase, convId, senderId, { name: contextualName });
              }
            }

            // Sync phone if extracted (even for non-fallback names)
            if (extractedPhone && existingConv && !existingConv.contact_phone) {
              await syncLeadData(supabase, convId, senderId, { phone: extractedPhone });
            }

            // =====================================================
            // STEP 7: If bot active, trigger AI reply
            // =====================================================
            const { data: conv } = await supabase
              .from('omnichat_conversations')
              .select('bot_active, contact_name')
              .eq('id', convId)
              .single();

            if (conv?.bot_active && messageText) {
              try {
                // Build messages array matching real-estate-chat format
                const { data: historyMsgs } = await supabase
                  .from('omnichat_messages')
                  .select('sender_type, content')
                  .eq('conversation_id', convId)
                  .order('created_at', { ascending: true })
                  .limit(20);

                const chatMessages = (historyMsgs || []).map(m => ({
                  role: m.sender_type === 'client' ? 'user' : 'assistant',
                  content: m.content || '',
                }));

                const chatRes = await fetch(`${SUPABASE_URL}/functions/v1/real-estate-chat`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    messages: chatMessages,
                    skipLeadCreation: true,
                    origin: 'instagram',
                    clientName: conv.contact_name || displayName,
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
