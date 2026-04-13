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
// HELPER: Words to ignore as names
// =====================================================
const IGNORE_WORDS = new Set([
  'ok', 'sim', 'não', 'nao', 'quero', 'oi', 'olá', 'ola', 'bom', 'boa',
  'dia', 'tarde', 'noite', 'obrigado', 'obrigada', 'valeu', 'beleza',
  'legal', 'certo', 'claro', 'pode', 'queria', 'gostaria', 'preciso',
  'tenho', 'casa', 'apartamento', 'imovel', 'imóvel', 'comprar', 'alugar',
  'vender', 'quanto', 'preço', 'preco', 'onde', 'como', 'qual', 'que',
  'tem', 'tudo', 'bem', 'tchau', 'bye', 'até', 'ate', 'aqui', 'ali',
  'isso', 'esse', 'essa', 'este', 'esta', 'favor', 'por', 'para',
  'muito', 'mais', 'menos', 'quando', 'porque', 'pois', 'então', 'entao',
  'estou', 'vou', 'quero', 'gostei', 'interesse', 'interessado', 'interessada',
  'hey', 'hello', 'hi', 'thanks', 'yes', 'no', 'please',
]);

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
    /eu sou ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
    /chamo ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const normalized = normalizeLeadName(match[1]);
      if (normalized && !IGNORE_WORDS.has(normalized.toLowerCase())) {
        return normalized;
      }
    }
  }
  return null;
}

function extractBareName(text: string): string | null {
  const cleaned = text.trim().replace(/[.,!?]+$/, '').trim();
  if (!/^[a-záàâãéèêíïóôõöúçñ\s'-]+$/i.test(cleaned)) return null;
  if (cleaned.length < 2 || cleaned.length > 40) return null;
  const words = cleaned.split(/\s+/);
  if (words.length > 3) return null;
  if (words.every(w => IGNORE_WORDS.has(w.toLowerCase()))) return null;
  if (IGNORE_WORDS.has(words[0].toLowerCase())) return null;
  const normalized = normalizeLeadName(cleaned);
  if (normalized && !IGNORE_WORDS.has(normalized.toLowerCase())) {
    return normalized;
  }
  return null;
}

function normalizeLeadName(rawName: string | null | undefined): string | null {
  if (!rawName) return null;
  const clean = rawName.trim().replace(/[.,!?]+$/, "").replace(/[^a-záàâãéèêíïóôõöúçñ\s'-]/gi, " ").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  const firstName = clean.split(" ")[0]?.trim();
  if (!firstName || firstName.length < 2 || firstName.length > 40) return null;
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

function isFallbackName(name: string | null): boolean {
  if (!name) return true;
  const n = name.trim();
  if (!n) return true;
  if (/^\d+$/.test(n)) return true;
  if (/^Instagram User #?\d+$/i.test(n)) return true;
  if (/^WhatsApp #?\d+$/i.test(n)) return true;
  if (['Visitante', 'Visitante do Chat', 'Cliente', 'A definir', 'Não informado', 'Desconhecido', 'Unknown'].includes(n)) return true;
  if (n.replace(/[\s\-_.]/g, '').length > 0 && /^\d[\d\s\-_.]+$/.test(n)) return true;
  return false;
}

// =====================================================
// HELPER: Resolve Instagram profile via API
// =====================================================
async function resolveInstagramProfile(senderId: string, pageToken: string, pageId: string | null): Promise<{ displayName: string | null; username: string | null }> {
  let displayName: string | null = null;
  let username: string | null = null;

  try {
    const fbProfileUrl = `https://graph.facebook.com/v19.0/${senderId}?fields=name,username,profile_pic`;
    const fbProfileRes = await fetch(fbProfileUrl, { headers: { 'Authorization': `Bearer ${pageToken}` } });

    if (fbProfileRes.ok) {
      const profile = await fbProfileRes.json();
      username = profile.username || null;
      if (profile.username) {
        displayName = `@${profile.username}`;
      } else if (profile.name && profile.name !== profile.id && !isFallbackName(profile.name)) {
        displayName = profile.name;
      }
    } else {
      // Strategy 2
      try {
        const ig2Url = `https://graph.facebook.com/v19.0/${senderId}?fields=name,username,follower_count`;
        const ig2Res = await fetch(ig2Url, { headers: { 'Authorization': `Bearer ${pageToken}` } });
        if (ig2Res.ok) {
          const igProfile = await ig2Res.json();
          username = igProfile.username || null;
          if (igProfile.username) displayName = `@${igProfile.username}`;
          else if (igProfile.name && igProfile.name !== igProfile.id && !isFallbackName(igProfile.name)) displayName = igProfile.name;
        }
      } catch (e) {
        console.warn('[Instagram Webhook] Strategy 2 error:', e);
      }
    }

    // Strategy 3: Page conversations
    if (!displayName && pageId) {
      try {
        const convRes = await fetch(
          `https://graph.facebook.com/v19.0/${pageId}/conversations?platform=instagram&fields=participants{name,username,id}&limit=50`,
          { headers: { 'Authorization': `Bearer ${pageToken}` } }
        );
        if (convRes.ok) {
          const convData = await convRes.json();
          for (const conv of (convData.data || [])) {
            for (const p of (conv.participants?.data || [])) {
              if (p.id === senderId) {
                username = p.username || null;
                displayName = p.username ? `@${p.username}` : (p.name && p.name !== p.id ? p.name : null);
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
  } catch (profileErr) {
    console.warn('[Instagram Webhook] Profile fetch error:', profileErr);
  }

  return { displayName, username };
}

// =====================================================
// HELPER: Sync name/phone across all related records
// =====================================================
async function syncLeadData(
  supabase: any,
  convId: string,
  senderId: string,
  updates: { name?: string; phone?: string }
) {
  if (!updates.name && !updates.phone) return;

  const normalizedName = normalizeLeadName(updates.name);
  const nowIso = new Date().toISOString();

  const { data: convData } = await supabase
    .from('omnichat_conversations')
    .select('lead_id, contact_name, contact_phone')
    .eq('id', convId)
    .single();

  const shouldUpdateConvName = !!normalizedName && isFallbackName(convData?.contact_name ?? null);
  const shouldUpdateConvPhone = !!updates.phone && !convData?.contact_phone;

  if (shouldUpdateConvName || shouldUpdateConvPhone) {
    const convUpdate: Record<string, unknown> = {};
    if (shouldUpdateConvName) convUpdate.contact_name = normalizedName;
    if (shouldUpdateConvPhone) convUpdate.contact_phone = updates.phone;
    await supabase.from('omnichat_conversations').update(convUpdate).eq('id', convId);
  }

  if (shouldUpdateConvName) {
    await supabase.from('channel_messages').update({ contact_name: normalizedName }).eq('contact_instagram_id', senderId);
  }

  if (!convData?.lead_id) return;

  const { data: currentLead } = await supabase
    .from('leads')
    .select('name, phone, whatsapp_sent')
    .eq('id', convData.lead_id)
    .single();

  const shouldUpdateLeadName = !!normalizedName && isFallbackName(currentLead?.name ?? null);
  const shouldUpdateLeadPhone = !!updates.phone && !currentLead?.phone;

  const leadUpdate: Record<string, unknown> = {
    updated_at: nowIso,
    last_interaction_at: nowIso,
  };
  if (shouldUpdateLeadName) leadUpdate.name = normalizedName;
  if (shouldUpdateLeadPhone) leadUpdate.phone = updates.phone;
  await supabase.from('leads').update(leadUpdate).eq('id', convData.lead_id);

  if (shouldUpdateLeadName || shouldUpdateLeadPhone) {
    const { data: crmCards } = await supabase
      .from('crm_cards')
      .select('id, cliente')
      .eq('lead_id', convData.lead_id);

    for (const card of (crmCards || [])) {
      const shouldUpdateCrmName = shouldUpdateLeadName && isFallbackName(card.cliente);
      const shouldUpdateCrmPhone = shouldUpdateLeadPhone;
      if (!shouldUpdateCrmName && !shouldUpdateCrmPhone) continue;

      const crmUpdate: Record<string, unknown> = { updated_at: nowIso, last_interaction_at: nowIso };
      if (shouldUpdateCrmName) {
        crmUpdate.cliente = normalizedName;
        crmUpdate.titulo = `Lead Instagram - ${normalizedName}`;
      }
      if (shouldUpdateCrmPhone) crmUpdate.telefone = updates.phone;
      await supabase.from('crm_cards').update(crmUpdate).eq('id', card.id);
    }
  }

  // 🔥 Notify broker ALWAYS when we have data (not just when phone available)
  const finalName = shouldUpdateLeadName ? normalizedName : currentLead?.name;
  const finalPhone = shouldUpdateLeadPhone ? updates.phone : currentLead?.phone;

  if (!currentLead?.whatsapp_sent) {
    await notifyBroker(supabase, finalName || senderId, finalPhone || null, 'Instagram');
    await supabase.from('leads').update({ whatsapp_sent: true, whatsapp_sent_at: nowIso }).eq('id', convData.lead_id);
  }
}

// =====================================================
// HELPER: Notify broker via WhatsApp — ALWAYS notify
// =====================================================
async function notifyBroker(
  supabase: any,
  name: string | null,
  phone: string | null,
  origin: string,
  lastMessage?: string
) {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const BROKER_WHATSAPP = '5562999918353';
    const contactLink = phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : 'N/A';
    const displayName = name || 'Não informado';

    const brokerMessage = `🚨 *Novo Lead ${origin}*\n\n` +
      `👤 Nome: ${displayName}\n` +
      `📱 Telefone: ${phone || 'Não informado'}\n` +
      `📍 Origem: ${origin}\n` +
      `💬 Mensagem: ${(lastMessage || '').substring(0, 200) || '(sem mensagem)'}\n\n` +
      `📲 Responder: ${contactLink}`;

    console.log(`📤 ENVIANDO LEAD PARA CORRETOR: ${displayName} / ${phone || 'sem tel'}`);

    await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: BROKER_WHATSAPP, message: brokerMessage }),
    });
    console.log(`[Instagram Webhook] ✅ Broker notified: ${displayName}`);
  } catch (notifyErr) {
    console.error('[Instagram Webhook] Broker notification error:', notifyErr);
  }
}

// =====================================================
// INTERCEPTOR: processIncomingMessage — runs BEFORE AI
// =====================================================
async function processIncomingMessage(
  supabase: any,
  messageText: string,
  convId: string,
  leadId: string | null,
  channel: string,
): Promise<string | null> {
  if (!messageText || !messageText.trim()) return null;

  const text = messageText.trim();
  if (/^\d+$/.test(text)) return null;
  const lowerText = text.toLowerCase().replace(/[.,!?]+$/, '').trim();
  if (IGNORE_WORDS.has(lowerText)) return null;

  let detectedName = extractNameFromText(text);

  if (!detectedName) {
    const { data: lastBotMsg } = await supabase
      .from('omnichat_messages')
      .select('content')
      .eq('conversation_id', convId)
      .eq('sender_type', 'bot')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const botAskedName = lastBotMsg?.content && /como (?:posso |devo )?(?:te )?chamar|qual (?:[eé] )?(?:o )?seu nome|saber seu nome|me fala seu nome/i.test(lastBotMsg.content);

    if (botAskedName) {
      const cleaned = text.replace(/^(meu nome [eé]|me chamo|pode me chamar de|sou o|sou a|eu sou|é|e)\s+/i, '').trim();
      detectedName = extractBareName(cleaned) || extractBareName(text);
    }
  }

  if (!detectedName) {
    const words = text.split(/\s+/);
    if (words.length <= 3 && /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]/.test(text)) {
      detectedName = extractBareName(text);
    }
  }

  if (!detectedName || detectedName.length < 3 || /\d/.test(detectedName)) return null;

  const { data: convData } = await supabase
    .from('omnichat_conversations')
    .select('contact_name, lead_id')
    .eq('id', convId)
    .single();

  const effectiveLeadId = leadId || convData?.lead_id;

  if (!isFallbackName(convData?.contact_name)) {
    return convData?.contact_name;
  }

  const nowIso = new Date().toISOString();

  await supabase.from('omnichat_conversations').update({ contact_name: detectedName }).eq('id', convId);

  if (effectiveLeadId) {
    const { data: lead } = await supabase.from('leads').select('name').eq('id', effectiveLeadId).single();
    if (isFallbackName(lead?.name)) {
      await supabase.from('leads').update({ name: detectedName, last_interaction_at: nowIso, updated_at: nowIso }).eq('id', effectiveLeadId);
    }

    const { data: crmCards } = await supabase.from('crm_cards').select('id, cliente').eq('lead_id', effectiveLeadId);
    for (const card of (crmCards || [])) {
      if (isFallbackName(card.cliente)) {
        await supabase.from('crm_cards').update({
          cliente: detectedName,
          titulo: `Lead Instagram - ${detectedName}`,
          updated_at: nowIso,
          last_interaction_at: nowIso,
        }).eq('id', card.id);
      }
    }
  }

  return detectedName;
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

    if (!VERIFY_TOKEN) {
      return new Response('Server configuration error', { status: 500 });
    }

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    return new Response('Forbidden', { status: 403 });
  }

  // POST — Receive Instagram Events
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[Instagram Webhook] Event received');

      if (body.object !== 'instagram') {
        return new Response('ok', { status: 200 });
      }

      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const entries = body.entry || [];

      for (const entry of entries) {
        const igUserId = entry.id;

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

        const messaging = entry.messaging || [];
        for (const event of messaging) {
          const senderId = event.sender?.id;

          // Skip messages from ourselves
          if (senderId === igUserId) continue;

          // =====================================================
          // STEP 1: Resolve display name
          // =====================================================
          let displayName: string | null = null;
          let igUsername: string | null = null;
          const pageToken = connection.access_token_encrypted;

          const { data: existingConvCheck } = await supabase
            .from('omnichat_conversations')
            .select('contact_name, contact_phone, lead_id')
            .eq('user_id', connection.user_id)
            .eq('channel', 'instagram')
            .eq('external_contact_id', senderId)
            .maybeSingle();

          const profile = await resolveInstagramProfile(senderId, pageToken, connection.page_id);

          if (profile.displayName) {
            displayName = profile.displayName;
            igUsername = profile.username;
          } else if (existingConvCheck?.contact_name && !isFallbackName(existingConvCheck.contact_name)) {
            displayName = existingConvCheck.contact_name;
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

            // STEP 3: Extract name and phone
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
              contact_name: extractedName || displayName || null,
              meta_message_id: messageId,
              media_url: mediaUrl,
              status: 'received',
            });

            // =====================================================
            // STEP 4: Create or update omnichat conversation
            // =====================================================
            const { data: existingConv } = await supabase
              .from('omnichat_conversations')
              .select('id, unread_count, contact_name, contact_phone, lead_id')
              .eq('user_id', connection.user_id)
              .eq('channel', 'instagram')
              .eq('external_contact_id', senderId)
              .maybeSingle();

            let convId: string;
            let isNewConversation = false;

            if (existingConv) {
              convId = existingConv.id;
              const convUpdate: Record<string, unknown> = {
                last_message_at: new Date().toISOString(),
                last_message_preview: messageText.substring(0, 100),
                unread_count: (existingConv.unread_count || 0) + 1,
                status: 'open',
                bot_active: true,
              };

              const bestName = extractedName || (!isFallbackName(displayName) ? displayName : null);

              if (bestName && isFallbackName(existingConv.contact_name)) {
                convUpdate.contact_name = bestName;

                if (existingConv.lead_id) {
                  const { data: existingLead } = await supabase
                    .from('leads')
                    .select('name, phone, whatsapp_sent')
                    .eq('id', existingConv.lead_id)
                    .single();

                  if (existingLead && isFallbackName(existingLead.name)) {
                    await supabase.from('leads').update({
                      name: bestName,
                      last_interaction_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    }).eq('id', existingConv.lead_id);

                    await supabase.from('crm_cards').update({
                      cliente: bestName,
                      titulo: `Lead Instagram - ${bestName}`,
                      updated_at: new Date().toISOString(),
                    }).eq('lead_id', existingConv.lead_id);
                  }
                }
              }

              if (extractedPhone && !existingConv.contact_phone) {
                convUpdate.contact_phone = extractedPhone;
              }
              await supabase.from('omnichat_conversations').update(convUpdate).eq('id', convId);
            } else {
              isNewConversation = true;

              // Check if any agent is online with instagram channel enabled
              const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
              const { data: onlineAgents } = await supabase
                .from('agent_status')
                .select('user_id, channel_status')
                .eq('status', 'online')
                .gte('last_seen', thirtyMinAgo)
                .limit(10);

              const igAgents = (onlineAgents || []).filter((a: any) => {
                const cs = a.channel_status;
                return !cs || cs.instagram !== false;
              });
              const botActiveForNew = igAgents.length === 0;
              console.log('[Instagram Webhook] 🤖 Bot active:', botActiveForNew, '(ig agents online:', igAgents.length, ')');

              const { data: newConv } = await supabase
                .from('omnichat_conversations')
                .insert({
                  user_id: connection.user_id,
                  channel: 'instagram',
                  external_contact_id: senderId,
                  contact_name: extractedName || displayName || null,
                  contact_phone: extractedPhone,
                  connection_id: connection.id,
                  bot_active: botActiveForNew,
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
            // CHECK IF INSTAGRAM CHANNEL IS ENABLED
            // =====================================================
            let instagramChannelEnabled = true;
            try {
              const { data: allAgentStatuses } = await supabase
                .from('agent_status')
                .select('channel_status')
                .limit(10);
              
              if (allAgentStatuses && allAgentStatuses.length > 0) {
                instagramChannelEnabled = allAgentStatuses.some((a: any) => {
                  const cs = a.channel_status;
                  return !cs || cs.instagram !== false;
                });
              }
              console.log('[Instagram Webhook] 📡 Instagram channel enabled:', instagramChannelEnabled);
            } catch (e) {
              console.error('[Instagram Webhook] Channel status check error:', e);
            }

            if (instagramChannelEnabled) {
            // =====================================================
            // STEP 5: Lead management — UNCONDITIONAL SAVE
            // =====================================================
            let currentLeadId: string | null = null;
            try {
              const { data: convForLead } = await supabase
                .from('omnichat_conversations')
                .select('lead_id')
                .eq('id', convId)
                .single();

              const bestLeadName = extractedName || (displayName && !isFallbackName(displayName) ? displayName : null);

              if (!convForLead?.lead_id) {
                // Check dedup by phone
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
                  await supabase.from('omnichat_conversations').update({ lead_id: existingLeadId }).eq('id', convId);
                  const leadUpdate: Record<string, unknown> = { last_interaction_at: new Date().toISOString(), updated_at: new Date().toISOString() };
                  if (bestLeadName) {
                    const { data: currentLead } = await supabase.from('leads').select('name').eq('id', existingLeadId).single();
                    if (isFallbackName(currentLead?.name)) {
                      leadUpdate.name = bestLeadName;
                      await supabase.from('crm_cards').update({
                        cliente: bestLeadName,
                        titulo: `Lead Instagram - ${bestLeadName}`,
                        updated_at: new Date().toISOString(),
                      }).eq('lead_id', existingLeadId);
                    }
                  }
                  await supabase.from('leads').update(leadUpdate).eq('id', existingLeadId);
                  currentLeadId = existingLeadId;
                } else {
                  // Create new lead
                  const { data: newLead } = await supabase
                    .from('leads')
                    .insert({
                      name: bestLeadName,
                      phone: extractedPhone,
                      origin: 'instagram',
                      source: 'instagram',
                      source_detail: 'direct',
                      medium: 'social',
                      status: 'novo',
                    })
                    .select('id')
                    .single();

                  if (newLead) {
                    currentLeadId = newLead.id;
                    await supabase.from('omnichat_conversations').update({ lead_id: newLead.id }).eq('id', convId);

                    // Create CRM card
                    await supabase.from('crm_cards').insert({
                      titulo: bestLeadName ? `Lead Instagram - ${bestLeadName}` : `Lead Instagram - ${senderId}`,
                      cliente: bestLeadName || senderId,
                      telefone: extractedPhone || null,
                      coluna: 'leads',
                      origem_lead: 'instagram',
                      source: 'instagram',
                      source_detail: 'direct',
                      medium: 'social',
                      classificacao: 'frio',
                      prioridade: 'normal',
                      lead_id: newLead.id,
                      lead_score: 10,
                      probabilidade_fechamento: 5,
                      valor_estimado: 0,
                    });

                    // 🔥 NOTIFY BROKER FOR EVERY NEW LEAD (even without phone)
                    await notifyBroker(supabase, bestLeadName, extractedPhone, 'Instagram', messageText);
                    await supabase.from('leads').update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() }).eq('id', newLead.id);

                    console.log('[Instagram Webhook] ✅ Novo lead + CRM card criado:', newLead.id);
                  }
                }
              } else {
                currentLeadId = convForLead.lead_id;
                // Lead already exists — update
                const { data: currentLead } = await supabase.from('leads').select('name, phone, whatsapp_sent').eq('id', convForLead.lead_id).single();
                
                const leadUpdate: Record<string, unknown> = {
                  last_interaction_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                
                if (bestLeadName && isFallbackName(currentLead?.name)) {
                  leadUpdate.name = bestLeadName;
                }
                if (extractedPhone && !currentLead?.phone) {
                  leadUpdate.phone = extractedPhone;
                }
                
                await supabase.from('leads').update(leadUpdate).eq('id', convForLead.lead_id);

                if (bestLeadName && isFallbackName(currentLead?.name)) {
                  await supabase.from('crm_cards').update({
                    cliente: bestLeadName,
                    titulo: `Lead Instagram - ${bestLeadName}`,
                    updated_at: new Date().toISOString(),
                    last_interaction_at: new Date().toISOString(),
                  }).eq('lead_id', convForLead.lead_id);
                }

                // 🔥 Notify broker if not yet notified
                if (!currentLead?.whatsapp_sent) {
                  const updatedName = bestLeadName || currentLead?.name;
                  const updatedPhone = extractedPhone || currentLead?.phone;
                  await notifyBroker(supabase, updatedName || senderId, updatedPhone, 'Instagram', messageText);
                  await supabase.from('leads').update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() }).eq('id', convForLead.lead_id);
                }
              }
            } catch (leadErr) {
              console.error('[Instagram Webhook] Lead sync error:', leadErr);
            }

            // =====================================================
            // STEP 6: Contextual name extraction
            // =====================================================
            {
              const { data: convForNameCheck } = await supabase
                .from('omnichat_conversations')
                .select('contact_name, lead_id')
                .eq('id', convId)
                .single();

              if (messageText && isFallbackName(convForNameCheck?.contact_name ?? null)) {
                let contextualName: string | null = extractedName;

                if (!contextualName) {
                  const { data: lastBotMsg } = await supabase
                    .from('omnichat_messages')
                    .select('content')
                    .eq('conversation_id', convId)
                    .eq('sender_type', 'bot')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  const askedName = lastBotMsg?.content && (
                    /como (?:posso |devo )?(?:te )?chamar/i.test(lastBotMsg.content) ||
                    /qual (?:[eé] )?(?:o )?seu nome/i.test(lastBotMsg.content) ||
                    /seu nome/i.test(lastBotMsg.content) ||
                    /como te chamar/i.test(lastBotMsg.content) ||
                    /saber seu nome/i.test(lastBotMsg.content) ||
                    /me fala seu nome/i.test(lastBotMsg.content)
                  );

                  if (askedName) {
                    const cleaned = messageText.trim().replace(/[.,!?]+$/, "").trim();
                    const withoutPrefix = cleaned.replace(/^(meu nome [eé]|me chamo|pode me chamar de|sou o|sou a|eu sou|é|e)\s+/i, '').trim();
                    const bareName = extractBareName(withoutPrefix || cleaned);
                    if (bareName) contextualName = bareName;
                  }
                }

                if (!contextualName) {
                  contextualName = extractBareName(messageText);
                }

                if (contextualName) {
                  contextualName = normalizeLeadName(contextualName);
                  if (contextualName) {
                    await syncLeadData(supabase, convId, senderId, { name: contextualName });
                  }
                }
              }

              if (extractedPhone && !existingConvCheck?.contact_phone) {
                await syncLeadData(supabase, convId, senderId, { phone: extractedPhone });
              }
            }

            // =====================================================
            // STEP 7: INTERCEPTOR processIncomingMessage
            // =====================================================
            try {
              const { data: convForIntercept } = await supabase
                .from('omnichat_conversations')
                .select('lead_id')
                .eq('id', convId)
                .single();

              const interceptedName = await processIncomingMessage(
                supabase,
                messageText,
                convId,
                convForIntercept?.lead_id || null,
                'instagram',
              );
              if (interceptedName) {
                displayName = interceptedName;
              }
            } catch (interceptErr) {
              console.error('[Instagram Webhook] processIncomingMessage error:', interceptErr);
            }

            // =====================================================
            // STEP 8: AI reply — ALWAYS trigger for Instagram
            // =====================================================
            if (messageText) {
              try {
                console.log('🤖 IA EXECUTANDO PARA INSTAGRAM - convId:', convId);
                
                // Get current conversation state
                const { data: conv } = await supabase
                  .from('omnichat_conversations')
                  .select('bot_active, contact_name, lead_id')
                  .eq('id', convId)
                  .single();

                // Ensure bot is active
                await supabase.from('omnichat_conversations').update({ bot_active: true }).eq('id', convId);

                // Resolve current name
                let leadName: string | null = null;
                if (conv?.lead_id) {
                  const { data: leadData } = await supabase
                    .from('leads')
                    .select('name')
                    .eq('id', conv.lead_id)
                    .single();
                  leadName = leadData?.name || null;
                }

                const currentName = leadName || conv?.contact_name || displayName;
                const nameMissing = isFallbackName(currentName);

                // Count how many times bot already asked for name
                const { data: historyMsgs } = await supabase
                  .from('omnichat_messages')
                  .select('sender_type, content')
                  .eq('conversation_id', convId)
                  .order('created_at', { ascending: true })
                  .limit(20);

                let nameAskCount = 0;
                if (nameMissing && historyMsgs) {
                  for (const m of historyMsgs) {
                    if (m.sender_type !== 'client' && m.content) {
                      if (/como (?:posso |devo )?(?:te )?chamar|qual (?:[eé] )?(?:o )?seu nome|saber seu nome|me fala seu nome/i.test(m.content)) {
                        nameAskCount++;
                      }
                    }
                  }
                }

                // 🔥 Call AI
                console.log('📤 Calling whatsapp-ai-chat for Instagram:', { convId, name: currentName, msgCount: historyMsgs?.length });
                
                const chatRes = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-ai-chat`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    message: messageText,
                    senderPhone: senderId,
                    conversationId: convId,
                    contactName: nameMissing ? 'Não informado' : currentName,
                  }),
                });

                const chatResponseText = await chatRes.text();
                console.log('📥 AI Response status:', chatRes.status, 'body length:', chatResponseText.length);

                let chatData: any;
                try {
                  chatData = JSON.parse(chatResponseText);
                } catch (parseErr) {
                  console.error('[Instagram Webhook] ❌ Failed to parse AI response:', chatResponseText.substring(0, 500));
                  throw new Error('Invalid AI response');
                }

                const aiReply = chatData?.reply || chatData?.response;
                console.log('🤖 IA RESPONDEU:', aiReply ? aiReply.substring(0, 100) : 'NULL');

                let finalReply = aiReply;

                // Check if AI already asks for name
                const aiAlreadyAsksName = finalReply && /como (?:posso |devo )?(?:te )?chamar|qual (?:[eé] )?(?:o )?seu nome|saber seu nome|me fala seu nome/i.test(finalReply);

                if (nameMissing && nameAskCount < 2 && !aiAlreadyAsksName) {
                  const nameQuestion = nameAskCount === 0
                    ? '\n\nPra te atender melhor e te enviar as melhores opções, como posso te chamar?'
                    : '\n\nAh, e como posso te chamar pra te atender melhor?';
                  finalReply = finalReply ? finalReply + nameQuestion : nameQuestion.trim();
                }

                if (finalReply && connection.page_id) {
                  // Send AI reply via Instagram
                  const sendUrl = `https://graph.facebook.com/v19.0/${connection.page_id}/messages`;
                  const igSendRes = await fetch(sendUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${connection.access_token_encrypted}`,
                    },
                    body: JSON.stringify({
                      recipient: { id: senderId },
                      message: { text: finalReply },
                    }),
                  });

                  const igSendResult = await igSendRes.json();
                  if (igSendResult.error) {
                    console.error('[Instagram Webhook] ❌ Instagram API send error:', igSendResult.error);
                  } else {
                    console.log('[Instagram Webhook] ✅ AI replied to', senderId);
                  }

                  // Save bot message
                  await supabase.from('omnichat_messages').insert({
                    conversation_id: convId,
                    sender_type: 'bot',
                    channel: 'instagram',
                    content: finalReply,
                  });

                  await supabase.from('omnichat_conversations').update({
                    last_message_at: new Date().toISOString(),
                    last_message_preview: finalReply.substring(0, 100),
                  }).eq('id', convId);
                }
              } catch (aiErr) {
                console.error('[Instagram Webhook] ❌ AI error:', aiErr);
              }
            }
            } else {
              console.log('[Instagram Webhook] ⏸️ Instagram channel DISABLED - skipping all automation, message saved to inbox only');
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
