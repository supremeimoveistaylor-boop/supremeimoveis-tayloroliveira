import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERIFY_TOKEN = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || Deno.env.get('INSTAGRAM_WEBHOOK_VERIFY_TOKEN');

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

  // 1. Try pattern-based extraction ("me chamo João", "meu nome é Maria")
  let detectedName = extractNameFromText(text);

  // 2. Try contextual extraction: if bot asked for name and user replied
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

  // 3. Try bare name: 1-3 words starting with uppercase
  if (!detectedName) {
    const words = text.split(/\s+/);
    if (words.length <= 3 && /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]/.test(text)) {
      detectedName = extractBareName(text);
    }
  }

  // Validate
  if (!detectedName) return null;
  if (detectedName.length < 3) return null;
  if (/\d/.test(detectedName)) return null;

  // LOG OBRIGATÓRIO
  console.log('CAPTURA NOME:', { mensagem: text, nome_detectado: detectedName, canal: channel, convId });

  // Check if name is actually needed (current is fallback)
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

  // SAVE 1: omnichat_conversations
  await supabase.from('omnichat_conversations').update({
    contact_name: detectedName,
  }).eq('id', convId);
  console.log('[processIncomingMessage] ✅ omnichat_conversations.contact_name =', detectedName);

  // SAVE 2: leads
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

    // SAVE 3: crm_cards
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
                const rawContactName = contactInfo?.profile?.name || null;
                
                // ENHANCED LOGGING: Show exactly what the API sends
                console.log('[WhatsApp Webhook] 📋 RAW contacts array:', JSON.stringify(contacts));
                console.log('[WhatsApp Webhook] 📋 RAW profile.name:', rawContactName);
                
                // Accept name if it's not just digits and not the phone number
                const contactName = (rawContactName && rawContactName !== senderPhone && !/^\d+$/.test(rawContactName)) ? rawContactName : null;
                const messageText = message.text?.body || message.caption || '';
                const mediaUrl = message.image?.url || message.video?.url || message.document?.url || null;

                console.log('[WhatsApp Webhook] 📋 Contact data:', { wa_id: senderPhone, profile_name: rawContactName, resolved_name: contactName });

                // Detect Meta Ads origin (click-to-WhatsApp ads send referral data)
                const referral = message.referral || null;
                const isFromMetaAds = !!referral;
                const adSource = referral ? `meta_ads` : 'whatsapp';
                const adCampaign = referral?.headline || referral?.body || null;

                console.log('[WhatsApp Webhook] Message:', { from: senderPhone, text: messageText, contact: contactName, hasReferral: isFromMetaAds });

                if (connection) {
                  // Create or update omnichat conversation
                  const { data: existingConv } = await supabase
                    .from('omnichat_conversations')
                    .select('id, unread_count, contact_name, contact_phone, lead_id')
                    .eq('user_id', connection.user_id)
                    .eq('channel', 'whatsapp')
                    .eq('external_contact_id', senderPhone)
                    .maybeSingle();

                  let convId: string;

                  if (existingConv) {
                    convId = existingConv.id;
                    const convUpdate: Record<string, unknown> = {
                      last_message_at: new Date().toISOString(),
                      last_message_preview: messageText.substring(0, 100),
                      unread_count: (existingConv.unread_count || 0) + 1,
                      status: 'open',
                      contact_phone: senderPhone,
                    };
                    // Always update name from WhatsApp profile if current is null/fallback
                    if (contactName && (!existingConv.contact_name || existingConv.contact_name === 'Visitante' || existingConv.contact_name === 'Cliente' || /^\d+$/.test(existingConv.contact_name))) {
                      convUpdate.contact_name = contactName;
                      console.log('[WhatsApp Webhook] 📝 Updating conv name to:', contactName);
                    }
                    await supabase.from('omnichat_conversations').update(convUpdate).eq('id', convId);
                  } else {
                    // Check if any agent is TRULY online (last_seen within 30 minutes)
                    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
                    const { data: onlineAgents } = await supabase
                      .from('agent_status')
                      .select('user_id')
                      .eq('status', 'online')
                      .gte('last_seen', thirtyMinAgo)
                      .limit(1);

                    const botActive = !onlineAgents || onlineAgents.length === 0;
                    console.log('[WhatsApp Webhook] 🤖 Bot active:', botActive, '(recent agents:', onlineAgents?.length || 0, ')');

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

                  // =====================================================
                  // AUTO-CREATE/UPDATE LEAD com telefone do WhatsApp
                  // =====================================================
                  try {
                    const sanitizedPhone = senderPhone.replace(/\D/g, '');
                    
                    // Verificar se já existe lead com este telefone
                    const { data: existingLead } = await supabase
                      .from('leads')
                      .select('id, name, phone, whatsapp_sent')
                      .eq('phone', sanitizedPhone)
                      .maybeSingle();

                    // Determine the best name: contactName from WhatsApp profile > extracted from text > fallback
                    const isFallback = (n: string | null) => !n || n === 'Visitante' || n === 'Visitante do Chat' || n === 'Cliente' || n === 'A definir' || /^WhatsApp \d+$/.test(n || '');
                    
                    if (existingLead) {
                      const leadUpdate: Record<string, unknown> = {
                        last_interaction_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      };
                      // Always update name if current is fallback and we have a real name
                      if (contactName && isFallback(existingLead.name)) {
                        leadUpdate.name = contactName;
                      }
                      // Ensure phone is set
                      if (!existingLead.phone) {
                        leadUpdate.phone = sanitizedPhone;
                      }
                      await supabase.from('leads').update(leadUpdate).eq('id', existingLead.id);
                      
                      await supabase.from('omnichat_conversations').update({
                        lead_id: existingLead.id,
                        contact_name: contactName && isFallback(existingConv?.contact_name ?? null) ? contactName : undefined,
                        contact_phone: sanitizedPhone,
                      }).eq('id', convId);

                      // Update CRM card
                      const crmUpdate: Record<string, unknown> = { 
                        telefone: sanitizedPhone,
                        updated_at: new Date().toISOString(),
                        last_interaction_at: new Date().toISOString(),
                      };
                      if (contactName && isFallback(existingLead.name)) {
                        crmUpdate.cliente = contactName;
                        crmUpdate.titulo = `Lead WhatsApp - ${contactName}`;
                      }
                      await supabase.from('crm_cards').update(crmUpdate).eq('lead_id', existingLead.id);
                      
                      // Notify broker if not yet notified for this lead
                      if (!existingLead.whatsapp_sent) {
                        try {
                          const BROKER_WHATSAPP = '556282251082';
                          const displayName = contactName || existingLead.name || sanitizedPhone;
                          const brokerMessage = `🚨 *Novo Lead WhatsApp*\n\n👤 Nome: ${displayName}\n📱 Telefone: ${sanitizedPhone}\n📍 Origem: WhatsApp\n💬 Mensagem: ${messageText.substring(0, 200) || '(mídia)'}\n\n📲 Responder: https://wa.me/${sanitizedPhone}`;
                          await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ to: BROKER_WHATSAPP, message: brokerMessage }),
                          });
                          await supabase.from('leads').update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() }).eq('id', existingLead.id);
                          console.log('[WhatsApp Webhook] ✅ Broker notificado (lead existente):', displayName);
                        } catch (notifyErr) {
                          console.error('[WhatsApp Webhook] Broker notification error (existing):', notifyErr);
                        }
                      }
                      
                      console.log('[WhatsApp Webhook] ✅ Lead existente atualizado:', existingLead.id, 'nome:', contactName);
                    } else {
                      const leadName = contactName || null;
                      const { data: newLead } = await supabase
                        .from('leads')
                        .insert({
                          name: leadName,
                          phone: sanitizedPhone,
                          origin: adSource,
                          source: adSource,
                          source_detail: isFromMetaAds ? 'click_to_whatsapp' : 'direct',
                          medium: isFromMetaAds ? 'paid' : 'messaging',
                          campaign: adCampaign || null,
                          status: 'novo',
                          page_url: adCampaign ? `meta_ads: ${adCampaign}` : undefined,
                        })
                        .select('id')
                        .single();
                      
                      if (newLead) {
                        await supabase.from('omnichat_conversations').update({
                          lead_id: newLead.id,
                          contact_name: contactName || undefined,
                          contact_phone: sanitizedPhone,
                        }).eq('id', convId);

                        // Create CRM card
                        await supabase.from('crm_cards').insert({
                          titulo: `Lead WhatsApp - ${leadName}`,
                          cliente: leadName,
                          telefone: sanitizedPhone,
                          coluna: 'leads',
                          origem_lead: 'whatsapp',
                          source: adSource,
                          source_detail: isFromMetaAds ? 'click_to_whatsapp' : 'direct',
                          campaign: adCampaign || null,
                          medium: isFromMetaAds ? 'paid' : 'messaging',
                          classificacao: 'frio',
                          prioridade: 'normal',
                          lead_id: newLead.id,
                          lead_score: 10,
                          probabilidade_fechamento: 5,
                          valor_estimado: 0,
                        });
                        
                        // Notify broker for EVERY new lead
                        try {
                          const BROKER_WHATSAPP = '556282251082';
                          const displayName = contactName || sanitizedPhone;
                          const brokerMessage = `🚨 *Novo Lead WhatsApp*\n\n👤 Nome: ${displayName}\n📱 Telefone: ${sanitizedPhone}\n📍 Origem: WhatsApp\n💬 Mensagem: ${messageText.substring(0, 200) || '(mídia)'}\n\n📲 Responder: https://wa.me/${sanitizedPhone}`;
                          await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ to: BROKER_WHATSAPP, message: brokerMessage }),
                          });
                          await supabase.from('leads').update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() }).eq('id', newLead.id);
                          console.log('[WhatsApp Webhook] ✅ Broker notificado (novo lead):', displayName);
                        } catch (notifyErr) {
                          console.error('[WhatsApp Webhook] Broker notification error:', notifyErr);
                        }
                        
                        console.log('[WhatsApp Webhook] ✅ Novo lead + CRM card criado:', sanitizedPhone, 'nome:', leadName);
                      }
                    }
                  } catch (leadErr) {
                    console.error('[WhatsApp Webhook] Lead sync error:', leadErr);
                  }

                  // =====================================================
                  // INTERCEPTOR: processIncomingMessage — ANTES da IA
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
                      'whatsapp',
                    );
                    if (interceptedName) {
                      // Use intercepted name for AI context
                      contactName = interceptedName;
                    }
                  } catch (interceptErr) {
                    console.error('[WhatsApp Webhook] processIncomingMessage error:', interceptErr);
                  }

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
