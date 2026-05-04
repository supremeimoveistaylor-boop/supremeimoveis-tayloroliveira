import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || Deno.env.get('INSTAGRAM_WEBHOOK_VERIFY_TOKEN');

// =====================================================
// SIGNATURE VERIFICATION — HMAC-SHA256
// =====================================================
async function verifyWebhookSignature(req: Request): Promise<{ valid: boolean; bodyText: string }> {
  const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
  const signature = req.headers.get('X-Hub-Signature-256');
  const bodyText = await req.text();

  if (!META_APP_SECRET) {
    console.warn('[WhatsApp Webhook] META_APP_SECRET not set — skipping signature verification');
    return { valid: true, bodyText };
  }

  if (!signature) {
    console.error('[WhatsApp Webhook] Missing X-Hub-Signature-256 header');
    return { valid: false, bodyText };
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(META_APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(bodyText));
  const expected = 'sha256=' + Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (signature !== expected) {
    console.error('[WhatsApp Webhook] Invalid signature');
    return { valid: false, bodyText };
  }

  return { valid: true, bodyText };
}

// =====================================================
// IGNORE WORDS — messages that are NOT names
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
  'estou', 'vou', 'gostei', 'interesse', 'interessado', 'interessada',
  'hey', 'hello', 'hi', 'thanks', 'yes', 'no', 'please', 'top', 'kkkk',
  'kkk', 'kk', 'haha', 'hahaha', 'rsrs', 'rs',
]);

// =====================================================
// HELPER: Check if name is a fallback placeholder
// =====================================================
function isFallbackName(name: string | null): boolean {
  if (!name) return true;
  const n = name.trim();
  if (!n) return true;
  if (/^\d+$/.test(n)) return true;
  if (/^WhatsApp \d+$/.test(n) || /^WhatsApp #?\d+$/.test(n)) return true;
  if (/^Instagram User #?\d+$/i.test(n)) return true;
  if (['Visitante', 'Visitante do Chat', 'Cliente', 'A definir', 'Não informado', 'Desconhecido', 'Unknown'].includes(n)) return true;
  if (n.replace(/[\s\-_.]/g, '').length > 0 && /^\d[\d\s\-_.]+$/.test(n)) return true;
  return false;
}

// =====================================================
// HELPER: Extract name from text via patterns
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
    /eu sou ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
    /chamo ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = normalizeName(match[1]);
      if (name && !IGNORE_WORDS.has(name.toLowerCase())) return name;
    }
  }
  return null;
}

// =====================================================
// HELPER: Extract bare name (1-3 words, no numbers)
// =====================================================
function extractBareName(text: string): string | null {
  const cleaned = text.trim().replace(/[.,!?]+$/, '').trim();
  if (!/^[a-záàâãéèêíïóôõöúçñ\s'-]+$/i.test(cleaned)) return null;
  if (cleaned.length < 3 || cleaned.length > 40) return null;
  const words = cleaned.split(/\s+/);
  if (words.length > 3) return null;
  if (words.every(w => IGNORE_WORDS.has(w.toLowerCase()))) return null;
  if (IGNORE_WORDS.has(words[0].toLowerCase())) return null;
  const name = normalizeName(cleaned);
  if (name && !IGNORE_WORDS.has(name.toLowerCase())) return name;
  return null;
}

function normalizeName(raw: string | null): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/[.,!?]+$/, '').replace(/[^a-záàâãéèêíïóôõöúçñ\s'-]/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  const firstName = clean.split(' ')[0]?.trim();
  if (!firstName || firstName.length < 3 || firstName.length > 40) return null;
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

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

  if (!detectedName) return null;
  if (detectedName.length < 3) return null;
  if (/\d/.test(detectedName)) return null;

  console.log('CAPTURA NOME:', { mensagem: text, nome_detectado: detectedName, canal: channel, convId });

  const { data: convData } = await supabase
    .from('omnichat_conversations')
    .select('contact_name, lead_id')
    .eq('id', convId)
    .single();

  const effectiveLeadId = leadId || convData?.lead_id;

  if (!isFallbackName(convData?.contact_name)) {
    console.log('[processIncomingMessage] Name already set:', convData?.contact_name, '— skipping');
    return convData?.contact_name;
  }

  const nowIso = new Date().toISOString();

  await supabase.from('omnichat_conversations').update({
    contact_name: detectedName,
  }).eq('id', convId);
  console.log('[processIncomingMessage] ✅ omnichat_conversations.contact_name =', detectedName);

  if (effectiveLeadId) {
    const { data: lead } = await supabase.from('leads').select('name').eq('id', effectiveLeadId).single();
    if (isFallbackName(lead?.name)) {
      await supabase.from('leads').update({
        name: detectedName,
        last_interaction_at: nowIso,
        updated_at: nowIso,
      }).eq('id', effectiveLeadId);
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
      // =====================================================
      // VERIFY WEBHOOK SIGNATURE BEFORE PROCESSING
      // =====================================================
      const { valid, bodyText } = await verifyWebhookSignature(req);
      if (!valid) {
        console.error('[WhatsApp Webhook] ❌ Signature verification failed — rejecting request');
        return new Response(JSON.stringify({ ok: false, error: 'Invalid signature' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = JSON.parse(bodyText);
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
                const rawContactName = contactInfo?.profile?.name || null;
                
                console.log('[WhatsApp Webhook] 📋 RAW contacts array:', JSON.stringify(contacts));
                console.log('[WhatsApp Webhook] 📋 RAW profile.name:', rawContactName);
                
                const contactName = (rawContactName && rawContactName !== senderPhone && !/^\d+$/.test(rawContactName)) ? rawContactName : null;
                const messageText = message.text?.body || message.caption || '';
                const mediaUrl = message.image?.url || message.video?.url || message.document?.url || null;

                console.log('[WhatsApp Webhook] 📋 Contact data:', { wa_id: senderPhone, profile_name: rawContactName, resolved_name: contactName });

                const referral = message.referral || null;
                const isFromMetaAds = !!referral;
                const adSource = referral ? `meta_ads` : 'whatsapp';
                const adCampaign = referral?.headline || referral?.body || null;

                console.log('[WhatsApp Webhook] Message:', { from: senderPhone, text: messageText, contact: contactName, hasReferral: isFromMetaAds });

                if (connection) {
                  const { data: existingConv } = await supabase
                    .from('omnichat_conversations')
                    .select('id, unread_count, contact_name, contact_phone, lead_id')
                    .eq('user_id', connection.user_id)
                    .eq('channel', 'whatsapp')
                    .eq('external_contact_id', senderPhone)
                    .maybeSingle();

                  let convId: string;
                  const isFirstContact = !existingConv;

                  if (existingConv) {
                    convId = existingConv.id;
                    const convUpdate: Record<string, unknown> = {
                      last_message_at: new Date().toISOString(),
                      last_message_preview: messageText.substring(0, 100),
                      unread_count: (existingConv.unread_count || 0) + 1,
                      status: 'open',
                      contact_phone: senderPhone,
                    };
                    if (contactName && (!existingConv.contact_name || existingConv.contact_name === 'Visitante' || existingConv.contact_name === 'Cliente' || /^\d+$/.test(existingConv.contact_name))) {
                      convUpdate.contact_name = contactName;
                      console.log('[WhatsApp Webhook] 📝 Updating conv name to:', contactName);
                    }
                    await supabase.from('omnichat_conversations').update(convUpdate).eq('id', convId);
                  } else {
                    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
                    const { data: onlineAgents } = await supabase
                      .from('agent_status')
                      .select('user_id, channel_status')
                      .eq('status', 'online')
                      .gte('last_seen', thirtyMinAgo)
                      .limit(10);

                    const whatsappAgents = (onlineAgents || []).filter((a: any) => {
                      const cs = a.channel_status;
                      return !cs || cs.whatsapp !== false;
                    });

                    const botActive = whatsappAgents.length === 0;
                    console.log('[WhatsApp Webhook] 🤖 Bot active:', botActive, '(whatsapp agents online:', whatsappAgents.length, ')');

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

                  await supabase.from('omnichat_messages').insert({
                    conversation_id: convId,
                    sender_type: 'client',
                    channel: 'whatsapp',
                    content: messageText,
                    media_url: mediaUrl,
                    meta_message_id: message.id,
                  });

                  let whatsappChannelEnabled = true;
                  try {
                    const { data: allAgentStatuses } = await supabase
                      .from('agent_status')
                      .select('channel_status')
                      .limit(10);
                    
                    if (allAgentStatuses && allAgentStatuses.length > 0) {
                      whatsappChannelEnabled = allAgentStatuses.some((a: any) => {
                        const cs = a.channel_status;
                        return !cs || cs.whatsapp !== false;
                      });
                    }
                    console.log('[WhatsApp Webhook] 📡 WhatsApp channel enabled:', whatsappChannelEnabled);
                  } catch (e) {
                    console.error('[WhatsApp Webhook] Channel status check error:', e);
                  }

                  if (whatsappChannelEnabled) {
                  try {
                    const sanitizedPhone = senderPhone.replace(/\D/g, '');
                    
                    const { data: existingLead } = await supabase
                      .from('leads')
                      .select('id, name, phone, whatsapp_sent')
                      .eq('phone', sanitizedPhone)
                      .maybeSingle();

                    const bestName = contactName || (existingLead?.name && !isFallbackName(existingLead.name) ? existingLead.name : null);
                    const nowIso = new Date().toISOString();

                    let leadId: string;
                    let shouldNotify = false;

                    if (existingLead) {
                      leadId = existingLead.id;
                      const leadUpdate: Record<string, unknown> = {
                        last_interaction_at: nowIso,
                        updated_at: nowIso,
                        origin: adSource,
                      };
                      if (bestName && isFallbackName(existingLead.name)) {
                        leadUpdate.name = bestName;
                      }
                      if (adCampaign) leadUpdate.campaign = adCampaign;
                      if (isFromMetaAds) {
                        leadUpdate.source = 'meta_ads';
                        leadUpdate.source_detail = adCampaign;
                        leadUpdate.medium = 'cpc';
                      }
                      await supabase.from('leads').update(leadUpdate).eq('id', leadId);
                      console.log('[WhatsApp Webhook] ✅ Lead updated:', leadId);
                      shouldNotify = !existingLead.whatsapp_sent;
                    } else {
                      const { data: newLead } = await supabase.from('leads').insert({
                        name: bestName,
                        phone: sanitizedPhone,
                        origin: adSource,
                        status: 'novo',
                        intent: messageText.substring(0, 200),
                        lead_temperature: isFromMetaAds ? 'quente' : 'morno',
                        source: isFromMetaAds ? 'meta_ads' : 'whatsapp',
                        source_detail: adCampaign,
                        medium: isFromMetaAds ? 'cpc' : 'organic',
                        campaign: adCampaign,
                        last_interaction_at: nowIso,
                      }).select('id').single();
                      leadId = newLead!.id;
                      console.log('[WhatsApp Webhook] ✅ New lead created:', leadId);
                      shouldNotify = true;
                    }

                    await supabase.from('omnichat_conversations')
                      .update({ lead_id: leadId })
                      .eq('id', convId)
                      .is('lead_id', null);

                    // Run interceptor
                    if (messageText.trim()) {
                      await processIncomingMessage(supabase, messageText, convId, leadId, 'whatsapp');
                    }

                    // CRM Card
                    const { data: existingCard } = await supabase
                      .from('crm_cards')
                      .select('id')
                      .eq('lead_id', leadId)
                      .maybeSingle();

                    if (!existingCard) {
                      const displayName = bestName || `WhatsApp ${sanitizedPhone}`;
                      await supabase.from('crm_cards').insert({
                        lead_id: leadId,
                        titulo: `Lead WhatsApp - ${displayName}`,
                        cliente: displayName,
                        telefone: sanitizedPhone,
                        coluna: 'leads',
                        origem_lead: adSource,
                        classificacao: isFromMetaAds ? 'quente' : 'morno',
                        source: isFromMetaAds ? 'meta_ads' : 'whatsapp',
                        source_detail: adCampaign,
                        medium: isFromMetaAds ? 'cpc' : 'organic',
                        campaign: adCampaign,
                        last_interaction_at: nowIso,
                      });
                      console.log('[WhatsApp Webhook] ✅ CRM card created for lead:', leadId);
                    }

                    // Notify broker
                    if (shouldNotify) {
                      const SUPABASE_URL_ENV = Deno.env.get('SUPABASE_URL')!;
                      const BROKER_WHATSAPP = '5562999918353';
                      const displayName = bestName || sanitizedPhone;
                      const contactLink = `https://wa.me/${sanitizedPhone}`;
                      
                      const brokerMsg = `🚨 NOVO LEAD QUALIFICADO\n\n` +
                        `👤 Nome: ${displayName}\n` +
                        `📞 Telefone: ${sanitizedPhone}\n` +
                        `📍 Origem: WhatsApp${adCampaign ? ` (${adCampaign})` : ''}\n` +
                        `💬 Mensagem: ${messageText.substring(0, 300)}\n\n` +
                        `👉 Abrir conversa:\n${contactLink}`;

                      console.log(`📤 ENVIANDO LEAD PARA CORRETOR: ${displayName} / ${sanitizedPhone}`);

                      const notifyRes = await fetch(`${SUPABASE_URL_ENV}/functions/v1/send-whatsapp`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                        },
                        body: JSON.stringify({ to: BROKER_WHATSAPP, message: brokerMsg }),
                      });

                      const notifyResult = await notifyRes.json().catch(() => null);
                      const sentOk = notifyRes.ok && notifyResult?.ok === true && !!notifyResult?.messageId;

                      if (sentOk) {
                        await supabase.from('leads').update({ 
                          whatsapp_sent: true, 
                          whatsapp_sent_at: nowIso 
                        }).eq('id', leadId);
                        console.log('[WhatsApp Webhook] ✅ Broker notified successfully msgId=', notifyResult.messageId);
                      } else {
                        console.error('[WhatsApp Webhook] ❌ Notificação ao corretor NÃO confirmada:', notifyResult);
                      }

                      // 📒 Registra no histórico admin (broker_lead_notifications)
                      try {
                        await supabase.from('broker_lead_notifications').insert({
                          lead_id: leadId,
                          broker_phone: BROKER_WHATSAPP,
                          lead_name: displayName,
                          lead_phone: sanitizedPhone,
                          lead_interest: messageText.substring(0, 200) || null,
                          origin: `whatsapp:${adSource}`,
                          whatsapp_message_id: sentOk ? notifyResult.messageId : null,
                          status: sentOk ? 'sent' : 'failed',
                          error_message: sentOk ? null : JSON.stringify(notifyResult ?? { status: notifyRes.status }).slice(0, 500),
                        });
                      } catch (logErr) {
                        console.warn('[WhatsApp Webhook] Notification log error (non-blocking):', logErr);
                      }
                    }

                    // Score
                    try {
                      await supabase.rpc('calculate_lead_score', { p_lead_id: leadId });
                    } catch (scoreErr) {
                      console.warn('[WhatsApp Webhook] Score calculation error:', scoreErr);
                    }

                    // Assign broker
                    try {
                      await supabase.rpc('assign_lead_to_broker', { p_lead_id: leadId, p_property_id: null });
                    } catch (assignErr) {
                      console.warn('[WhatsApp Webhook] Broker assignment error:', assignErr);
                    }
                  } catch (leadErr) {
                    console.error('[WhatsApp Webhook] Lead processing error:', leadErr);
                  }

                  // ============================================
                  // WELCOME MESSAGE — uma vez por número (botão CTA premium)
                  // Envia para TODO contato que ainda não recebeu, mesmo que a conversa já exista
                  // ============================================
                  let shouldSendWelcome = false;
                  try {
                    const { data: alreadySent } = await supabase
                      .from('whatsapp_welcome_sent')
                      .select('phone')
                      .eq('phone', senderPhone)
                      .maybeSingle();
                    shouldSendWelcome = !alreadySent;
                  } catch (checkErr) {
                    console.warn('[WhatsApp Webhook] welcome check error:', checkErr);
                    shouldSendWelcome = isFirstContact; // fallback
                  }

                  if (shouldSendWelcome) {
                    try {
                      const SUPABASE_URL_ENV = Deno.env.get('SUPABASE_URL')!;
                      const WELCOME_TEXT = 'Olá, que bom ter você por aqui! Clique no botão abaixo e fale direto com nosso especialista.';
                      const SPECIALIST_URL = 'https://wa.me/5562999918353';
                      const welcomeInteractive = {
                        type: 'cta_url',
                        body: { text: WELCOME_TEXT },
                        footer: { text: 'Supreme Empreendimentos • CRECI 20.316' },
                        action: {
                          name: 'cta_url',
                          parameters: {
                            display_text: '✨ Falar com especialista',
                            url: SPECIALIST_URL,
                          },
                        },
                      };

                      console.log('[WhatsApp Webhook] 👋 Enviando boas-vindas com botão CTA para:', senderPhone);
                      const welcomeRes = await fetch(`${SUPABASE_URL_ENV}/functions/v1/send-whatsapp`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                          'apikey': SUPABASE_SERVICE_ROLE_KEY,
                        },
                        body: JSON.stringify({ to: senderPhone, interactive: welcomeInteractive }),
                      });

                      const welcomeResult = await welcomeRes.json().catch(() => null);

                      if (welcomeRes.ok && welcomeResult?.ok) {
                        console.log('[WhatsApp Webhook] ✅ Boas-vindas enviadas. msgId:', welcomeResult.messageId);
                        await supabase.from('omnichat_messages').insert({
                          conversation_id: convId,
                          sender_type: 'bot',
                          channel: 'whatsapp',
                          content: `${WELCOME_TEXT} ${SPECIALIST_URL}`,
                          status: 'sent',
                          meta_message_id: welcomeResult.messageId || null,
                        });
                        await supabase.from('whatsapp_welcome_sent').upsert({
                          phone: senderPhone,
                          conversation_id: convId,
                          message_id: welcomeResult.messageId || null,
                          sent_at: new Date().toISOString(),
                        }, { onConflict: 'phone' });
                      } else {
                        // Fallback: se interactive falhar (ex: cta_url não suportado), envia texto simples com link
                        console.warn('[WhatsApp Webhook] ⚠️ Interactive falhou, fallback texto:', welcomeResult);
                        const fallbackText = `${WELCOME_TEXT}\n\n👉 ${SPECIALIST_URL}`;
                        const fbRes = await fetch(`${SUPABASE_URL_ENV}/functions/v1/send-whatsapp`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                            'apikey': SUPABASE_SERVICE_ROLE_KEY,
                          },
                          body: JSON.stringify({ to: senderPhone, message: fallbackText }),
                        });
                        const fbResult = await fbRes.json().catch(() => null);
                        await supabase.from('omnichat_messages').insert({
                          conversation_id: convId,
                          sender_type: 'bot',
                          channel: 'whatsapp',
                          content: fallbackText,
                          status: fbRes.ok && fbResult?.ok ? 'sent' : 'failed',
                        });
                        if (fbRes.ok && fbResult?.ok) {
                          await supabase.from('whatsapp_welcome_sent').upsert({
                            phone: senderPhone,
                            conversation_id: convId,
                            message_id: fbResult.messageId || null,
                            sent_at: new Date().toISOString(),
                          }, { onConflict: 'phone' });
                        }
                      }
                    } catch (welcomeErr) {
                      console.error('[WhatsApp Webhook] Welcome message error:', welcomeErr);
                    }
                  }

                  // ============================================
                  // AI RESPONSE — generate + send to WhatsApp
                  // ============================================
                  try {
                    const { data: conv } = await supabase
                      .from('omnichat_conversations')
                      .select('bot_active, contact_name, lead_id')
                      .eq('id', convId)
                      .single();

                    console.log('[WhatsApp Webhook] 🤖 Bot status check:', { convId, bot_active: conv?.bot_active });

                    if (conv?.bot_active) {
                      const SUPABASE_URL_ENV = Deno.env.get('SUPABASE_URL')!;

                      console.log('[WhatsApp Webhook] 📤 Enviando para OpenAI/Gemini...');
                      const aiResponse = await fetch(`${SUPABASE_URL_ENV}/functions/v1/whatsapp-ai-chat`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                          'apikey': SUPABASE_SERVICE_ROLE_KEY,
                        },
                        body: JSON.stringify({
                          message: messageText,
                          senderPhone,
                          conversationId: convId,
                          contactName: conv.contact_name,
                          connectionId: connection.id,
                          userId: connection.user_id,
                        }),
                      });

                      if (!aiResponse.ok) {
                        const errText = await aiResponse.text().catch(() => '');
                        console.error('[WhatsApp Webhook] ❌ AI call failed:', aiResponse.status, errText);
                      } else {
                        const aiResult = await aiResponse.json();
                        console.log('[WhatsApp Webhook] ✅ Resposta gerada pela IA:', {
                          hasReply: !!aiResult?.reply,
                          escalate: aiResult?.escalate,
                          replyPreview: aiResult?.reply?.substring(0, 80),
                        });

                        const replyText: string | null = aiResult?.reply?.trim() || null;

                        if (replyText) {
                          // 1. Send to client via WhatsApp API
                          console.log('[WhatsApp Webhook] 📲 Enviando resposta para WhatsApp do cliente:', senderPhone);
                          const sendRes = await fetch(`${SUPABASE_URL_ENV}/functions/v1/send-whatsapp`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                              'apikey': SUPABASE_SERVICE_ROLE_KEY,
                            },
                            body: JSON.stringify({ to: senderPhone, message: replyText }),
                          });

                          const sendResult = await sendRes.json().catch(() => null);

                          if (sendRes.ok && sendResult?.ok) {
                            console.log('[WhatsApp Webhook] ✅ Mensagem enviada com sucesso ao cliente. msgId:', sendResult.messageId);

                            // 2. Save bot reply to omnichat (so it shows in inbox)
                            await supabase.from('omnichat_messages').insert({
                              conversation_id: convId,
                              sender_type: 'bot',
                              channel: 'whatsapp',
                              content: replyText,
                              status: 'sent',
                              meta_message_id: sendResult.messageId || null,
                            });

                            await supabase.from('omnichat_conversations').update({
                              last_message_at: new Date().toISOString(),
                              last_message_preview: replyText.substring(0, 100),
                            }).eq('id', convId);
                          } else {
                            console.error('[WhatsApp Webhook] ❌ Erro ao enviar resposta IA ao WhatsApp:', sendResult);
                            await supabase.from('omnichat_messages').insert({
                              conversation_id: convId,
                              sender_type: 'bot',
                              channel: 'whatsapp',
                              content: replyText,
                              status: 'failed',
                            });
                          }
                        } else {
                          console.warn('[WhatsApp Webhook] ⚠️ IA retornou reply vazio — nada a enviar');
                        }
                      }
                    } else {
                      console.log('[WhatsApp Webhook] 🤖 Bot inativo nesta conversa — IA não responde');
                    }
                  } catch (aiErr) {
                    console.error('[WhatsApp Webhook] AI response error:', aiErr);
                  }
                  } // end whatsappChannelEnabled
                } // end if connection
              } // end for messages
            } // end if messages field

            // Handle status updates
            if (change.field === 'messages') {
              const statuses = change.value?.statuses || [];
              for (const status of statuses) {
                console.log('[WhatsApp Webhook] Status update:', { id: status.id, status: status.status });
              }
            }
          } // end for changes
        } // end for entries
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[WhatsApp Webhook] Error:', error);
      return new Response(JSON.stringify({ ok: true, error: 'Internal processing error' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders });
});
