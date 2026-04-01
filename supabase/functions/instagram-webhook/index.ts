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

// =====================================================
// HELPER: Extract name from text
// =====================================================
function extractNameFromText(text: string): string | null {
  // Pattern-based extraction (explicit name statements)
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

// =====================================================
// HELPER: Try to extract a bare name (1-3 words, no numbers, not a common word)
// =====================================================
function extractBareName(text: string): string | null {
  const cleaned = text.trim().replace(/[.,!?]+$/, '').trim();
  // Must be alphabetic, 2-40 chars, 1-3 words
  if (!/^[a-záàâãéèêíïóôõöúçñ\s'-]+$/i.test(cleaned)) return null;
  if (cleaned.length < 2 || cleaned.length > 40) return null;
  const words = cleaned.split(/\s+/);
  if (words.length > 3) return null;
  // Check if ALL words are ignored
  if (words.every(w => IGNORE_WORDS.has(w.toLowerCase()))) return null;
  // First word must not be an ignored word
  if (IGNORE_WORDS.has(words[0].toLowerCase())) return null;
  const normalized = normalizeLeadName(cleaned);
  if (normalized && !IGNORE_WORDS.has(normalized.toLowerCase())) {
    return normalized;
  }
  return null;
}

function normalizeLeadName(rawName: string | null | undefined): string | null {
  if (!rawName) return null;

  const clean = rawName
    .trim()
    .replace(/[.,!?]+$/, "")
    .replace(/[^a-záàâãéèêíïóôõöúçñ\s'-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return null;

  const firstName = clean.split(" ")[0]?.trim();
  if (!firstName || firstName.length < 2 || firstName.length > 40) return null;

  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

// =====================================================
// HELPER: Check if name is a fallback placeholder
// =====================================================
function isFallbackName(name: string | null): boolean {
  if (!name) return true;
  const n = name.trim();
  if (!n) return true;
  // Pure numeric (Instagram sender IDs like "7891234567890")
  if (/^\d+$/.test(n)) return true;
  // Known placeholders
  if (/^Instagram User #?\d+$/i.test(n)) return true;
  if (/^WhatsApp #?\d+$/i.test(n)) return true;
  if (['Visitante', 'Visitante do Chat', 'Cliente', 'A definir', 'Não informado', 'Desconhecido', 'Unknown'].includes(n)) return true;
  // Mostly numeric with some separators (e.g., "789-123-4567")
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
    // Strategy 1: Facebook Graph API — primary method for IGSID
    console.log('[Instagram Webhook] 🔍 Strategy 1: FB Graph API for IGSID:', senderId);
    const fbProfileUrl = `https://graph.facebook.com/v19.0/${senderId}?fields=name,username,profile_pic`;
    console.log('[Instagram Webhook] 🔍 API URL:', fbProfileUrl);
    const fbProfileRes = await fetch(fbProfileUrl, { headers: { 'Authorization': `Bearer ${pageToken}` } });

    const fbRawText = await fbProfileRes.text();
    console.log('[Instagram Webhook] 🔍 Strategy 1 response status:', fbProfileRes.status);
    console.log('[Instagram Webhook] 🔍 Strategy 1 response body:', fbRawText.substring(0, 500));

    if (fbProfileRes.ok) {
      const profile = JSON.parse(fbRawText);
      console.log('META PROFILE RESPONSE:', profile);
      username = profile.username || null;
      if (profile.username) {
        displayName = `@${profile.username}`;
      } else if (profile.name && profile.name !== profile.id && !isFallbackName(profile.name)) {
        displayName = profile.name;
      }
      console.log('[Instagram Webhook] ✅ Strategy 1 resolved — name:', displayName, 'username:', username);
    } else {
      console.warn('[Instagram Webhook] ❌ Strategy 1 failed:', fbProfileRes.status, fbRawText.substring(0, 300));

      // Strategy 2: Try with different fields
      try {
        console.log('[Instagram Webhook] 🔍 Strategy 2: Trying with follower_count field...');
        const ig2Url = `https://graph.facebook.com/v19.0/${senderId}?fields=name,username,follower_count`;
        const ig2Res = await fetch(ig2Url, { headers: { 'Authorization': `Bearer ${pageToken}` } });
        const ig2Text = await ig2Res.text();
        console.log('[Instagram Webhook] 🔍 Strategy 2 response:', ig2Res.status, ig2Text.substring(0, 300));
        if (ig2Res.ok) {
          const igProfile = JSON.parse(ig2Text);
          console.log('META PROFILE RESPONSE:', igProfile);
          username = igProfile.username || null;
          if (igProfile.username) displayName = `@${igProfile.username}`;
          else if (igProfile.name && igProfile.name !== igProfile.id && !isFallbackName(igProfile.name)) displayName = igProfile.name;
          console.log('[Instagram Webhook] ✅ Strategy 2 resolved — name:', displayName);
        }
      } catch (e) {
        console.warn('[Instagram Webhook] ❌ Strategy 2 error:', e);
      }
    }

    // Strategy 3: Page conversations endpoint (if still no name)
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
    console.warn('[Instagram Webhook] Profile fetch error (non-blocking):', profileErr);
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

  const { data: convDataRaw } = await (supabase
    .from('omnichat_conversations') as any)
    .select('lead_id, contact_name, contact_phone')
    .eq('id', convId)
    .single();
  const convData = convDataRaw as any;

  const shouldUpdateConvName = !!normalizedName && isFallbackName(convData?.contact_name ?? null);
  const shouldUpdateConvPhone = !!updates.phone && !convData?.contact_phone;

  if (shouldUpdateConvName || shouldUpdateConvPhone) {
    const convUpdate: Record<string, unknown> = {};
    if (shouldUpdateConvName) convUpdate.contact_name = normalizedName;
    if (shouldUpdateConvPhone) convUpdate.contact_phone = updates.phone;
    await (supabase.from('omnichat_conversations') as any).update(convUpdate).eq('id', convId);
    if (shouldUpdateConvName) {
      console.log('NOME SALVO NO BANCO');
      console.log('UI ATUALIZADA COM NOME');
    }
  }

  if (shouldUpdateConvName) {
    await (supabase
      .from('channel_messages') as any)
      .update({ contact_name: normalizedName })
      .eq('contact_instagram_id', senderId);
  }

  if (!convData?.lead_id) return;

  const { data: currentLeadRaw } = await (supabase
    .from('leads') as any)
    .select('name, phone, whatsapp_sent')
    .eq('id', convData.lead_id)
    .single();
  const currentLead = currentLeadRaw as any;

  const shouldUpdateLeadName = !!normalizedName && isFallbackName(currentLead?.name ?? null);
  const shouldUpdateLeadPhone = !!updates.phone && !currentLead?.phone;

  const leadUpdate: Record<string, unknown> = {
    updated_at: nowIso,
    last_interaction_at: nowIso,
  };
  if (shouldUpdateLeadName) leadUpdate.name = normalizedName;
  if (shouldUpdateLeadPhone) leadUpdate.phone = updates.phone;
  await (supabase.from('leads') as any).update(leadUpdate).eq('id', convData.lead_id);

  if (shouldUpdateLeadName || shouldUpdateLeadPhone) {
    const { data: crmCardsRaw } = await (supabase
      .from('crm_cards') as any)
      .select('id, cliente')
      .eq('lead_id', convData.lead_id);
    const crmCards = (crmCardsRaw || []) as any[];

    for (const card of crmCards) {
      const shouldUpdateCrmName = shouldUpdateLeadName && isFallbackName(card.cliente);
      const shouldUpdateCrmPhone = shouldUpdateLeadPhone;
      if (!shouldUpdateCrmName && !shouldUpdateCrmPhone) continue;

      const crmUpdate: Record<string, unknown> = {
        updated_at: nowIso,
        last_interaction_at: nowIso,
      };

      if (shouldUpdateCrmName) {
        crmUpdate.cliente = normalizedName;
        crmUpdate.titulo = `Lead Instagram - ${normalizedName}`;
      }
      if (shouldUpdateCrmPhone) crmUpdate.telefone = updates.phone;

      await (supabase.from('crm_cards') as any).update(crmUpdate).eq('id', card.id);
    }

    if (shouldUpdateLeadName) {
      console.log('NOME SALVO NO BANCO');
      console.log('UI ATUALIZADA COM NOME');
    }
  }

  const finalName = shouldUpdateLeadName ? normalizedName : currentLead?.name;
  const finalPhone = shouldUpdateLeadPhone ? updates.phone : currentLead?.phone;

  if (finalName && !isFallbackName(finalName) && finalPhone && !currentLead?.whatsapp_sent) {
    await notifyBroker(supabase, finalName, finalPhone, 'Instagram');
    await (supabase
      .from('leads') as any)
      .update({ whatsapp_sent: true, whatsapp_sent_at: nowIso })
      .eq('id', convData.lead_id);
  }
}

// =====================================================
// HELPER: Notify broker via WhatsApp
// =====================================================
async function notifyBroker(
  supabase: any,
  name: string,
  phone: string,
  origin: string,
  lastMessage?: string
) {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const BROKER_WHATSAPP = '5562999918353';
    const contactLink = phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : 'N/A';

    const brokerMessage = `🚨 *Novo Lead ${origin}*\n\n` +
      `👤 Nome: ${name}\n` +
      `📱 Telefone: ${phone || 'Não informado'}\n` +
      `📍 Origem: ${origin}\n` +
      `💬 Mensagem: ${(lastMessage || '').substring(0, 200) || '(sem mensagem)'}\n\n` +
      `📲 Responder: ${contactLink}`;

    await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: BROKER_WHATSAPP, message: brokerMessage }),
    });
    console.log(`[Instagram Webhook] ✅ Broker notified (5562999918353): ${name} / ${phone}`);
  } catch (notifyErr) {
    console.error('[Instagram Webhook] Broker notification error:', notifyErr);
  }
}

// =====================================================
// INTERCEPTOR: processIncomingMessage — runs BEFORE AI
// Detects name from message text and saves immediately
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

  // Skip messages that are clearly not names
  if (/^\d+$/.test(text)) return null;
  const lowerText = text.toLowerCase().replace(/[.,!?]+$/, '').trim();
  if (IGNORE_WORDS.has(lowerText)) return null;

  // 1. Pattern-based extraction
  let detectedName = extractNameFromText(text);

  // 2. Contextual: bot asked for name
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

  // 3. Bare name: 1-3 words starting with uppercase
  if (!detectedName) {
    const words = text.split(/\s+/);
    if (words.length <= 3 && /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]/.test(text)) {
      detectedName = extractBareName(text);
    }
  }

  if (!detectedName || detectedName.length < 3 || /\d/.test(detectedName)) return null;

  // LOG OBRIGATÓRIO
  console.log('CAPTURA NOME:', { mensagem: text, nome_detectado: detectedName, canal: channel, convId });

  // Check if name is needed
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

  // SAVE: omnichat_conversations
  await supabase.from('omnichat_conversations').update({ contact_name: detectedName }).eq('id', convId);
  console.log('[processIncomingMessage] ✅ omnichat_conversations.contact_name =', detectedName);

  // SAVE: leads + crm_cards
  if (effectiveLeadId) {
    const { data: lead } = await supabase.from('leads').select('name').eq('id', effectiveLeadId).single();
    if (isFallbackName(lead?.name)) {
      await supabase.from('leads').update({ name: detectedName, last_interaction_at: nowIso, updated_at: nowIso }).eq('id', effectiveLeadId);
      console.log('[processIncomingMessage] ✅ leads.name =', detectedName);
    }

    const { data: crmCards } = await supabase.from('crm_cards').select('id, cliente').eq('lead_id', effectiveLeadId);
    for (const card of (crmCards || [])) {
      if (isFallbackName(card.cliente)) {
        await supabase.from('crm_cards').update({
          cliente: detectedName,
          titulo: `Lead ${channel === 'whatsapp' ? 'WhatsApp' : 'Instagram'} - ${detectedName}`,
          updated_at: nowIso,
          last_interaction_at: nowIso,
        }).eq('id', card.id);
        console.log('[processIncomingMessage] ✅ crm_cards.cliente =', detectedName);
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
      console.log('WEBHOOK RECEIVED:', body);
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
          // STEP 1: Resolve display name — ALWAYS call Meta API
          // =====================================================
          let displayName: string | null = null;
          let igUsername: string | null = null;
          const pageToken = connection.access_token_encrypted;

          // Check existing conversation
          const { data: existingConvCheck } = await supabase
            .from('omnichat_conversations')
            .select('contact_name, contact_phone, lead_id')
            .eq('user_id', connection.user_id)
            .eq('channel', 'instagram')
            .eq('external_contact_id', senderId)
            .maybeSingle();

          // ALWAYS call Meta API to resolve profile (even if we have a name)
          console.log('[Instagram Webhook] 🔍 SENDER ID:', senderId);
          console.log('[Instagram Webhook] 🔍 Calling Meta API for profile resolution...');
          const profile = await resolveInstagramProfile(senderId, pageToken, connection.page_id);
          console.log('[Instagram Webhook] 🔍 PROFILE DATA:', JSON.stringify(profile));

          if (profile.displayName) {
            displayName = profile.displayName;
            igUsername = profile.username;
            console.log('[Instagram Webhook] ✅ NAME FROM API:', displayName);
          } else if (existingConvCheck?.contact_name && !isFallbackName(existingConvCheck.contact_name)) {
            // Only fall back to saved name if API returned nothing
            displayName = existingConvCheck.contact_name;
            console.log('[Instagram Webhook] 👤 Reusing saved name (API returned nothing):', displayName);
          } else {
            console.log('[Instagram Webhook] ⚠️ No profile data resolved from API for:', senderId);
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
              if (extractedName) {
                console.log('NOME DETECTADO:', extractedName);
              }
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
                bot_active: true,
              };
              console.log('BOT ATIVADO PARA INSTAGRAM');

              // Determine best name: extractedName > displayName (from API) > keep existing
              const bestName = extractedName || (!isFallbackName(displayName) ? displayName : null);

              // Update name if we have a real one and existing is fallback/null
              if (bestName && isFallbackName(existingConv.contact_name)) {
                convUpdate.contact_name = bestName;
                console.log('[Instagram Webhook] 📝 Updating conv name to:', bestName);

                // CASCADE to lead if linked
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

                    console.log('[Instagram Webhook] ✅ Lead name cascaded:', bestName, 'for lead:', existingConv.lead_id);

                    // Notify broker if we now have both name and phone
                    if (existingLead.phone && !existingLead.whatsapp_sent) {
                      await notifyBroker(supabase, bestName, existingLead.phone, 'Instagram');
                      await supabase.from('leads').update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() }).eq('id', existingConv.lead_id);
                    }
                  }
                }
              }

              // Update phone if extracted
              if (extractedPhone && !existingConv.contact_phone) {
                convUpdate.contact_phone = extractedPhone;
              }
              await supabase.from('omnichat_conversations').update(convUpdate).eq('id', convId);
            } else {
              const botActive = true;
              console.log('BOT ATIVADO PARA INSTAGRAM');

              const { data: newConv } = await supabase
                .from('omnichat_conversations')
                .insert({
                  user_id: connection.user_id,
                  channel: 'instagram',
                  external_contact_id: senderId,
                  contact_name: extractedName || displayName || null,
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
            // STEP 5: Lead management — UNCONDITIONAL SAVE
            // =====================================================
            try {
              const { data: convForLead } = await supabase
                .from('omnichat_conversations')
                .select('lead_id')
                .eq('id', convId)
                .single();

              // Determine the best name to use
              const bestLeadName = extractedName || (displayName && !isFallbackName(displayName) ? displayName : null);
              console.log('[Instagram Webhook] 🔍 Best lead name resolved:', bestLeadName, '(extracted:', extractedName, ', api:', displayName, ')');

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
                  // Link existing lead and UNCONDITIONALLY update name if we have one
                  await supabase.from('omnichat_conversations').update({ lead_id: existingLeadId }).eq('id', convId);
                  const leadUpdate: Record<string, unknown> = { last_interaction_at: new Date().toISOString(), updated_at: new Date().toISOString() };
                  if (bestLeadName) {
                    // Only update if current name is fallback
                    const { data: currentLead } = await supabase.from('leads').select('name').eq('id', existingLeadId).single();
                    if (isFallbackName(currentLead?.name)) {
                      leadUpdate.name = bestLeadName;
                      // Also update CRM
                      await supabase.from('crm_cards').update({
                        cliente: bestLeadName,
                        titulo: `Lead Instagram - ${bestLeadName}`,
                        updated_at: new Date().toISOString(),
                      }).eq('lead_id', existingLeadId);
                    }
                  }
                  await supabase.from('leads').update(leadUpdate).eq('id', existingLeadId);
                  console.log('[Instagram Webhook] ✅ Linked to existing lead by phone:', existingLeadId, 'name:', bestLeadName);
                } else {
                  // Create new lead — use bestLeadName (NEVER fallback)
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
                    await supabase.from('omnichat_conversations').update({
                      lead_id: newLead.id,
                    }).eq('id', convId);

                    // Create CRM card — name can be null, that's OK
                    await supabase.from('crm_cards').insert({
                      titulo: bestLeadName ? `Lead Instagram - ${bestLeadName}` : `Lead Instagram - ${senderId}`,
                      cliente: bestLeadName || senderId,
                      telefone: extractedPhone || null,
                      coluna: 'leads',
                      origem_lead: 'instagram',
                      source: 'instagram',
                      source_detail: 'direct',
                      campaign: null,
                      medium: 'social',
                      classificacao: 'frio',
                      prioridade: 'normal',
                      lead_id: newLead.id,
                      lead_score: 10,
                      probabilidade_fechamento: 5,
                      valor_estimado: 0,
                    });

                    console.log('[Instagram Webhook] ✅ NAME SALVO:', bestLeadName, 'Lead ID:', newLead.id);
                    if (bestLeadName) {
                      console.log('NOME SALVO NO BANCO');
                      console.log('UI ATUALIZADA COM NOME');
                    }

                    // If already has name+phone, notify broker
                    if (bestLeadName && !isFallbackName(bestLeadName) && extractedPhone) {
                      await notifyBroker(supabase, bestLeadName, extractedPhone, 'Instagram');
                      await supabase.from('leads').update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() }).eq('id', newLead.id);
                    }
                  }
                }
              } else {
                // Lead already exists — UNCONDITIONALLY update if we have better data
                const { data: currentLead } = await supabase.from('leads').select('name, phone, whatsapp_sent').eq('id', convForLead.lead_id).single();
                
                const leadUpdate: Record<string, unknown> = {
                  last_interaction_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                
                // Update name if current is fallback and we have a real name
                if (bestLeadName && isFallbackName(currentLead?.name)) {
                  leadUpdate.name = bestLeadName;
                  console.log('[Instagram Webhook] 📝 Updating lead name to:', bestLeadName);
                }
                if (extractedPhone && !currentLead?.phone) {
                  leadUpdate.phone = extractedPhone;
                }
                
                await supabase.from('leads').update(leadUpdate).eq('id', convForLead.lead_id);

                // UNCONDITIONALLY sync CRM card
                if (bestLeadName && isFallbackName(currentLead?.name)) {
                  await supabase.from('crm_cards').update({
                    cliente: bestLeadName,
                    titulo: `Lead Instagram - ${bestLeadName}`,
                    updated_at: new Date().toISOString(),
                    last_interaction_at: new Date().toISOString(),
                  }).eq('lead_id', convForLead.lead_id);
                }
                if (extractedPhone) {
                  await supabase.from('crm_cards').update({
                    telefone: extractedPhone,
                    updated_at: new Date().toISOString(),
                  }).eq('lead_id', convForLead.lead_id);
                }

                // UNCONDITIONALLY sync omnichat_conversations
                const convSync: Record<string, unknown> = {};
                if (bestLeadName && isFallbackName(existingConvCheck?.contact_name ?? null)) {
                  convSync.contact_name = bestLeadName;
                }
                if (extractedPhone && !existingConvCheck?.contact_phone) {
                  convSync.contact_phone = extractedPhone;
                }
                if (Object.keys(convSync).length > 0) {
                  await supabase.from('omnichat_conversations').update(convSync).eq('id', convId);
                }

                console.log('[Instagram Webhook] ✅ NAME SALVO:', bestLeadName, 'Lead:', convForLead.lead_id);
                if (bestLeadName) {
                  console.log('NOME SALVO NO BANCO');
                  console.log('UI ATUALIZADA COM NOME');
                }

                // Check if we should notify broker
                const updatedName = bestLeadName || currentLead?.name;
                const updatedPhone = extractedPhone || currentLead?.phone;
                if (updatedName && !isFallbackName(updatedName) && updatedPhone && !currentLead?.whatsapp_sent) {
                  await notifyBroker(supabase, updatedName, updatedPhone, 'Instagram');
                  await supabase.from('leads').update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() }).eq('id', convForLead.lead_id);
                }
              }
            } catch (leadErr) {
              console.error('ERRO CAPTURA NOME INSTAGRAM:', leadErr);
            }

            // =====================================================
            // STEP 6: Contextual name extraction (bot asked for name)
            // Works for BOTH new and existing conversations
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
                  // Check if the previous bot message asked for the name
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
                    // Bot asked for name — be aggressive: try extractBareName
                    const cleaned = messageText.trim().replace(/[.,!?]+$/, "").trim();
                    const withoutPrefix = cleaned.replace(/^(meu nome [eé]|me chamo|pode me chamar de|sou o|sou a|eu sou|é|e)\s+/i, '').trim();
                    const finalText = withoutPrefix || cleaned;
                    const bareName = extractBareName(finalText);
                    if (bareName) {
                      contextualName = bareName;
                      console.log('[Instagram Webhook] 👤 NOME CAPTURADO (bot asked):', contextualName);
                    }
                  }
                }

                // Also try: if message is just 1-3 words that look like a name (any casing)
                if (!contextualName) {
                  contextualName = extractBareName(messageText);
                  if (contextualName) {
                    console.log('[Instagram Webhook] 👤 NOME CAPTURADO (bare name):', contextualName);
                  }
                }

                // Sync name across all records
                if (contextualName) {
                  contextualName = normalizeLeadName(contextualName);
                  if (contextualName) {
                    console.log('NOME DETECTADO:', contextualName);
                    console.log('NOME SUBSTITUÍDO:', contextualName);
                    await syncLeadData(supabase, convId, senderId, { name: contextualName });
                  }
                }
              }

              // Sync phone if extracted
              if (extractedPhone) {
                const currentPhone = existingConv?.contact_phone || convForNameCheck?.contact_name;
                if (!existingConv?.contact_phone) {
                  await syncLeadData(supabase, convId, senderId, { phone: extractedPhone });
                }
              }
            }

            // =====================================================
            // STEP 7: INTERCEPTOR processIncomingMessage — ANTES da IA
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
            // STEP 8: If bot active, trigger AI reply
            // =====================================================
            const { data: conv } = await supabase
              .from('omnichat_conversations')
              .select('bot_active, contact_name, lead_id')
              .eq('id', convId)
              .single();

            let shouldBotReply = !!messageText;
            await supabase.from('omnichat_conversations').update({ bot_active: true }).eq('id', convId);
            console.log('BOT ATIVADO PARA INSTAGRAM');

            if (shouldBotReply && messageText) {
              try {
                console.log('IA EXECUTANDO PARA INSTAGRAM');
                // Build history for name-attempt checks
                const { data: historyMsgs } = await supabase
                  .from('omnichat_messages')
                  .select('sender_type, content')
                  .eq('conversation_id', convId)
                  .order('created_at', { ascending: true })
                  .limit(20);

                // Check if name is still missing — tell AI to ask
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

                if (!chatRes.ok) {
                  const aiError = await chatRes.text();
                  throw new Error(`whatsapp-ai-chat ${chatRes.status}: ${aiError}`);
                }

                const chatData = await chatRes.json();
                const aiReply = chatData?.reply || chatData?.response;

                let finalReply = aiReply;
                
                // If AI reply exists, check if it already asks for name
                const aiAlreadyAsksName = finalReply && /como (?:posso |devo )?(?:te )?chamar|qual (?:[eé] )?(?:o )?seu nome|saber seu nome|me fala seu nome/i.test(finalReply);
                
                if (nameMissing && nameAskCount < 2 && !aiAlreadyAsksName) {
                  // AI didn't ask for name — append the question naturally
                  const nameQuestion = nameAskCount === 0
                    ? '\n\nPra te atender melhor e te enviar as melhores opções, como posso te chamar?'
                    : '\n\nAh, e como posso te chamar pra te atender melhor?';
                  finalReply = finalReply ? finalReply + nameQuestion : nameQuestion.trim();
                  console.log('PERGUNTA DE NOME DISPARADA');
                } else if (nameMissing && aiAlreadyAsksName) {
                  console.log('PERGUNTA DE NOME DISPARADA (via IA)');
                }

                if (finalReply && connection.page_id) {
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
                      message: { text: finalReply },
                    }),
                  });

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

                  console.log('[Instagram Webhook] ✅ AI replied to', senderId);
                }
              } catch (aiErr) {
                console.error('ERRO CAPTURA NOME INSTAGRAM:', aiErr);
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
      console.error('ERRO CAPTURA NOME INSTAGRAM:', error);
      return new Response('ok', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});
