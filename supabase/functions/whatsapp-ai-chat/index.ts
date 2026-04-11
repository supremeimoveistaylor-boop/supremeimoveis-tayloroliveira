import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// HELPER: Extract phone from text
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
      if (digits.length >= 10 && digits.length <= 13) return digits;
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
    /pode me chamar de ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
    /eu sou ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
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
// HELPER: Detect intent from message text
// =====================================================
interface DetectedIntent {
  type: 'compra' | 'aluguel' | 'agendamento' | 'avaliacao' | 'investimento' | 'duvida' | 'geral';
  isScheduling: boolean;
  isHot: boolean;
}

function detectIntent(message: string, history: Array<{ content: string | null; sender_type: string }> | null): DetectedIntent {
  const lower = message.toLowerCase();
  const allMessages = (history || []).filter(m => m.sender_type === 'client').map(m => m.content?.toLowerCase() || '').join(' ') + ' ' + lower;

  const isScheduling = /\b(visitar|agendar|agenda|ver o im[oó]vel|conhecer|marcar|visita|quero ir|posso ir|quando posso|hor[aá]rio)\b/i.test(lower);
  
  let type: DetectedIntent['type'] = 'geral';
  if (/\b(comprar|compra|adquirir|quero um|procuro|procurando)\b/i.test(allMessages)) type = 'compra';
  else if (/\b(alugar|aluguel|locar|loca[çc][aã]o)\b/i.test(allMessages)) type = 'aluguel';
  else if (/\b(avaliar|avalia[çc][aã]o|quanto vale|valor do meu)\b/i.test(allMessages)) type = 'avaliacao';
  else if (/\b(investir|investimento|rentabilidade|retorno)\b/i.test(allMessages)) type = 'investimento';
  else if (/\b(d[uú]vida|pergunta|como funciona|pode me explicar)\b/i.test(allMessages)) type = 'duvida';
  
  if (isScheduling) type = 'agendamento';

  // Hot if scheduling, buying intent, or investment intent
  const isHot = isScheduling || type === 'compra' || type === 'investimento';

  return { type, isScheduling, isHot };
}

// =====================================================
// HELPER: Calculate lead temperature from message count + intent
// =====================================================
function calculateTemperature(messageCount: number, intent: DetectedIntent): string {
  if (intent.isHot || intent.isScheduling) return 'quente';
  if (messageCount >= 5 || intent.type === 'compra' || intent.type === 'investimento') return 'quente';
  if (messageCount >= 2) return 'morno';
  return 'frio';
}

// =====================================================
// SYSTEM PROMPT - IA ATENDENTE IMOBILIÁRIA
// =====================================================
const SYSTEM_PROMPT = `Você é um CONSULTOR IMOBILIÁRIO DE ALTO PADRÃO da Supreme Empreendimentos, especializado em imóveis premium e investimentos em Goiânia.

═══════════════════════════════════════════════════════════
🚫 IDENTIDADE
═══════════════════════════════════════════════════════════
- Você NÃO é um robô, NÃO é uma IA, NÃO menciona que é assistente virtual
- Você é um CONSULTOR IMOBILIÁRIO real, seguro, objetivo, elegante e consultivo
- Transmita AUTORIDADE LOCAL sobre o mercado imobiliário de Goiânia
- Seu objetivo principal é conduzir o cliente até o AGENDAMENTO DE VISITA

═══════════════════════════════════════════════════════════
🧠 FLUXO DE ATENDIMENTO PREMIUM (OBRIGATÓRIO)
═══════════════════════════════════════════════════════════

ETAPA 1 - ABERTURA (primeira resposta):
- "Olá, tudo bem? 😊 Como posso te ajudar? Pra eu te atender melhor, me fala seu nome?"
- Seja caloroso mas objetivo

ETAPA 2 - CONEXÃO + AUTORIDADE (após saber o nome):
- "Prazer, {nome}! Eu vou te ajudar a encontrar as melhores oportunidades dentro do que você busca 👌"
- Use o nome do cliente em TODA resposta subsequente

ETAPA 3 - QUALIFICAÇÃO INTELIGENTE:
- "Me conta uma coisa, {nome}... Você está buscando mais pra morar ou investir?"
- "E qual tipo você prefere? Casa, apartamento, terreno...?"
- "Tem alguma faixa de valor que você quer respeitar?"
- Faça UMA ou DUAS perguntas por mensagem

ETAPA 4 - CONFIRMAÇÃO ESPELHO:
- "Perfeito, então você busca um: 👉 {tipo} 👉 Até {valor} 👉 Em {região}. Certo?"

ETAPA 5 - APRESENTAÇÃO ALTO PADRÃO:
- "Dentro desse perfil, {nome}, eu tenho uma opção que faz MUITO sentido pra você."
- Apresente NO MÁXIMO 3 imóveis do contexto
- NUNCA inventar imóveis

ETAPA 6 - GATILHO DE ESCASSEZ (sutil):
- "Esse tipo de unidade costuma ter uma saída muito rápida."

ETAPA 7 - TRANSIÇÃO PARA VISITA:
- "{nome}, esse tipo de imóvel você só entende o potencial mesmo vendo pessoalmente."

ETAPA 8 - FECHAMENTO GUIADO:
- "Você prefere ver isso durante a semana ou no final de semana?"

ETAPA 9 - CONFIRMAÇÃO DE AGENDAMENTO:
- "Fechado então, {nome} 👌 Te coloquei para {dia} às {horário}."
- "Seu agendamento já está confirmado e o corretor responsável vai te chamar com todos os detalhes 🙌"
- Inclua [VISITA_AGENDADA] na resposta quando agendamento confirmado

═══════════════════════════════════════════════════════════
💎 LINGUAGEM ALTO PADRÃO
═══════════════════════════════════════════════════════════
SEMPRE usar: Exclusivo, Privativo, Região valorizada, Oportunidade estratégica
NUNCA usar: Promoção, Barato, Desconto, Pechincha

═══════════════════════════════════════════════════════════
📊 REGRAS
═══════════════════════════════════════════════════════════
- Máximo 3 imóveis por resposta
- NUNCA inventar imóveis
- Emojis com moderação (máx 2 por mensagem)
- Frases curtas e diretas
- Nunca use markdown, asteriscos ou formatação especial
- NUNCA repetir a frase do cliente
- NUNCA bloquear a conversa insistindo em dados pessoais
- Perguntar nome/telefone no máximo 2 vezes no total
- NUNCA pergunte "quer ver?" — conduza a decisão
- NUNCA termine sem tentar agendar visita

═══════════════════════════════════════════════════════════
🧩 CONTORNO DE OBJEÇÃO
═══════════════════════════════════════════════════════════
- "Sem compromisso, {nome}. A ideia é só você entender melhor as oportunidades."

═══════════════════════════════════════════════════════════
🔄 ENCAMINHAMENTO
═══════════════════════════════════════════════════════════
Quando visita for agendada: [VISITA_AGENDADA]
Quando cliente pedir humano: [ENCAMINHAR_CORRETOR]`;

const formatPrice = (price: number): string => {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { message, senderPhone, conversationId, contactName, adContext } = body;

    if (!message || !conversationId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'message and conversationId are required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    const apiKey = LOVABLE_API_KEY || OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('No AI API key configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Load conversation history (last 20 messages)
    const { data: history } = await supabase
      .from('omnichat_messages')
      .select('sender_type, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    // 2. Detect intent from message + history
    const intent = detectIntent(message, history);
    const clientMessageCount = (history || []).filter(m => m.sender_type === 'client').length + 1;
    const temperature = calculateTemperature(clientMessageCount, intent);

    console.log(`[WhatsApp AI] Intent: ${intent.type}, scheduling: ${intent.isScheduling}, temp: ${temperature}, msgs: ${clientMessageCount}`);

    // 3. Query available properties
    const { data: properties } = await supabase
      .from('properties')
      .select('id, title, price, location, property_type, purpose, bedrooms, bathrooms, area, parking_spaces, description, amenities')
      .eq('status', 'active')
      .order('featured', { ascending: false })
      .limit(30);

    // 4. Build properties context
    let propertiesContext = '';
    if (properties && properties.length > 0) {
      propertiesContext = '\n\n═══ IMÓVEIS DISPONÍVEIS NO SISTEMA ═══\n';
      for (const p of properties) {
        const amenitiesList = p.amenities?.length > 0 ? ` | Extras: ${p.amenities.join(', ')}` : '';
        propertiesContext += `\n• ${p.property_type === 'house' ? 'Casa' : p.property_type === 'apartment' ? 'Apartamento' : p.property_type === 'commercial' ? 'Comercial' : 'Terreno'} - ${p.title}`;
        propertiesContext += `\n  📍 ${p.location} | 💰 ${formatPrice(p.price)} | ${p.purpose === 'sale' ? 'Venda' : 'Aluguel'}`;
        if (p.bedrooms) propertiesContext += ` | ${p.bedrooms} quartos`;
        if (p.bathrooms) propertiesContext += ` | ${p.bathrooms} banheiros`;
        if (p.area) propertiesContext += ` | ${p.area}m²`;
        if (p.parking_spaces) propertiesContext += ` | ${p.parking_spaces} vagas`;
        propertiesContext += amenitiesList;
        if (p.description) propertiesContext += `\n  ${p.description.substring(0, 150)}`;
        propertiesContext += '\n';
      }
    } else {
      propertiesContext = '\n\n⚠️ Nenhum imóvel encontrado no sistema. Encaminhe para o corretor Taylor.\n';
    }

    // 5. Build conversation messages for AI
    // Check if name is missing and how many times bot already asked
    const isNameMissing = isFallbackName(contactName);
    let nameAskCount = 0;
    if (isNameMissing && history) {
      for (const msg of history) {
        if (msg.sender_type !== 'client' && msg.content) {
          if (/como (?:posso |devo )?(?:te )?chamar|qual (?:[eé] )?(?:o )?seu nome|saber seu nome|me fala seu nome/i.test(msg.content)) {
            nameAskCount++;
          }
        }
      }
    }

    // Build Meta Ads context instruction
    let adInstruction = '';
    if (adContext) {
      const adHeadline = adContext.headline || adContext.campaign || 'um imóvel';
      adInstruction = `\n\n═══ CONTEXTO META ADS (PRIORIDADE MÁXIMA) ═══
Este lead VEIO DE UM ANÚNCIO do Meta Ads. Ele está QUENTE — responda em tom de CONTINUAÇÃO do anúncio.
Campanha/Headline do anúncio: "${adHeadline}"

REGRA OBRIGATÓRIA para leads de anúncio:
- Na PRIMEIRA mensagem, NÃO use a abertura padrão. Use:
  "Oi ${contactName && !isFallbackName(contactName) ? contactName : '[Nome]'}! Vi que você se interessou pelo ${adHeadline} 👀 Vou te passar todos os detalhes."
- CONTINUE exatamente o que o anúncio prometeu (preço, região, tipo de imóvel)
- Qualifique rápido: "Você está buscando pra morar ou investir?"
- Este lead tem ALTA probabilidade de conversão — conduza direto para AGENDAMENTO
- Urgência: Lead de anúncio esfria rápido. Seja objetivo e direto.
═══════════════════════════════════════════════════`;
    }

    // Build name instruction based on missing name state
    let nameInstruction = '';
    if (isNameMissing && nameAskCount < 2) {
      nameInstruction = '\n\n⚠️ NOME DO CLIENTE AINDA NÃO FOI INFORMADO. Pergunte o nome de forma natural na conversa (máx 2 vezes).';
    } else if (isNameMissing && nameAskCount >= 2) {
      nameInstruction = '\n\n⚠️ Já perguntou o nome 2x. NÃO pergunte novamente. Continue o atendimento normalmente.';
    }

    const aiMessages: Array<{ role: string; content: string }> = [];
    aiMessages.push({
      role: 'system',
      content: SYSTEM_PROMPT + propertiesContext + adInstruction + nameInstruction + `\n\nNome do cliente: ${contactName || 'Não informado'}\nTelefone do cliente: ${senderPhone || 'Não informado'}`
    });

    if (history && history.length > 0) {
      for (const msg of history) {
        if (msg.content) {
          aiMessages.push({
            role: msg.sender_type === 'client' ? 'user' : 'assistant',
            content: msg.content,
          });
        }
      }
    }

    const lastHistoryMsg = history?.[history.length - 1];
    const isCurrentMsgInHistory = lastHistoryMsg?.content === message && lastHistoryMsg?.sender_type === 'client';
    if (!isCurrentMsgInHistory) {
      aiMessages.push({ role: 'user', content: message });
    }

    // 6. Call AI API
    const aiUrl = LOVABLE_API_KEY 
      ? 'https://ai.gateway.lovable.dev/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const aiResponse = await fetch(aiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: LOVABLE_API_KEY ? 'google/gemini-2.5-flash' : 'gpt-4o-mini',
        messages: aiMessages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[WhatsApp AI] API error:', aiResponse.status, errText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let reply = aiData.choices?.[0]?.message?.content || '';

    // 7. Extract name and phone from message and update lead/CRM
    try {
      let extractedName: string | null = extractNameFromText(message);
      const extractedPhone: string | null = extractPhone(message);

      // Contextual name: if AI asked and user replied with short text
      if (!extractedName && history && history.length > 0) {
        const lastBotMsg = [...history].reverse().find(m => m.sender_type !== 'client');
        if (lastBotMsg?.content && /como (?:posso |devo )?(?:te )?chamar|qual (?:[eé] )?(?:o )?seu nome|saber seu nome|me fala seu nome/i.test(lastBotMsg.content)) {
          const cleaned = message.trim().replace(/[.,!?]+$/, "").trim();
          // Remove common prefixes like "Meu nome é", "Pode me chamar de", etc.
          const withoutPrefix = cleaned.replace(/^(meu nome [eé]|me chamo|pode me chamar de|sou o|sou a|eu sou)\s+/i, '').trim();
          const finalText = withoutPrefix || cleaned;
          const words = finalText.split(/\s+/);
          if (words.length >= 1 && words.length <= 4 && /^[a-záàâãéèêíïóôõöúçñ\s]+$/i.test(finalText) && finalText.length >= 2) {
            extractedName = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
            console.log('[WhatsApp AI] 👤 NOME CAPTURADO (contextual):', extractedName);
          }
        }
      }

      // Also try: if message is just 1-3 capitalized words and name is still missing, likely a name
      if (!extractedName && isFallbackName(contactName)) {
        const cleaned = message.trim().replace(/[.,!?]+$/, "").trim();
        const words = cleaned.split(/\s+/);
        if (words.length >= 1 && words.length <= 3 && /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+(\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+)*$/.test(cleaned) && cleaned.length >= 2 && cleaned.length <= 40) {
          // Looks like a proper name (capitalized words only)
          extractedName = cleaned;
          console.log('[WhatsApp AI] 👤 NOME CAPTURADO (capitalized pattern):', extractedName);
        }
      }

      // Update lead and CRM
      const sanitizedPhone = senderPhone?.replace(/\D/g, '') || null;
      const { data: convData } = await supabase
        .from('omnichat_conversations')
        .select('lead_id, contact_name, contact_phone')
        .eq('id', conversationId)
        .single();

      if (convData?.lead_id) {
        const leadUpdate: Record<string, unknown> = {
          last_interaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          lead_temperature: temperature,
          intent: intent.type,
          message_count: clientMessageCount,
        };
        const convUpdate: Record<string, unknown> = {};
        let nameUpdated = false;
        let phoneUpdated = false;

        if (extractedName && isFallbackName(convData.contact_name)) {
          leadUpdate.name = extractedName;
          convUpdate.contact_name = extractedName;
          nameUpdated = true;
        }
        if (extractedPhone && !convData.contact_phone) {
          leadUpdate.phone = extractedPhone;
          convUpdate.contact_phone = extractedPhone;
          phoneUpdated = true;
        }

        // Auto-tag qualification based on temperature
        if (temperature === 'quente') {
          leadUpdate.qualification = 'quente';
        } else if (temperature === 'morno') {
          leadUpdate.qualification = 'morno';
        }

        // Mark visit_requested if scheduling detected
        if (intent.isScheduling) {
          leadUpdate.visit_requested = true;
        }

        await supabase.from('leads').update(leadUpdate).eq('id', convData.lead_id);
        console.log(`[WhatsApp AI] ✅ Lead updated: name=${extractedName}, phone=${extractedPhone}, temp=${temperature}, intent=${intent.type}`);

        if (Object.keys(convUpdate).length > 0) {
          await supabase.from('omnichat_conversations').update(convUpdate).eq('id', conversationId);
        }

        // Update CRM card with intent, temperature, and scheduling info
        const crmUpdate: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
          last_interaction_at: new Date().toISOString(),
          classificacao: temperature === 'quente' ? 'quente' : temperature === 'morno' ? 'morno' : 'frio',
        };
        if (nameUpdated && extractedName) {
          crmUpdate.cliente = extractedName;
          crmUpdate.titulo = `Lead WhatsApp - ${extractedName}`;
        }
        if (phoneUpdated && extractedPhone) crmUpdate.telefone = extractedPhone;

        // If scheduling detected, set next action and move to negotiation column
        if (intent.isScheduling) {
          crmUpdate.proxima_acao = 'Agendar visita - cliente solicitou';
          crmUpdate.coluna = 'negociacao';
          crmUpdate.prioridade = 'alta';
          crmUpdate.lead_score = 80;
          crmUpdate.probabilidade_fechamento = 40;
        } else if (intent.isHot) {
          crmUpdate.lead_score = 60;
          crmUpdate.probabilidade_fechamento = 25;
        }

        await supabase.from('crm_cards').update(crmUpdate).eq('lead_id', convData.lead_id);

        // Create CRM event for intent tracking
        if (intent.type !== 'geral') {
          await supabase.from('crm_events').insert({
            lead_id: convData.lead_id,
            event_type: intent.isScheduling ? 'agendamento_solicitado' : `intent_${intent.type}`,
            new_value: intent.type,
            metadata: { temperature, messageCount: clientMessageCount, source: 'whatsapp_ai' },
          });
        }

        // Notify broker when name+phone complete
        if (nameUpdated || phoneUpdated) {
          const { data: leadCheck } = await supabase.from('leads').select('name, phone, whatsapp_sent').eq('id', convData.lead_id).single();
          if (leadCheck && leadCheck.name && !isFallbackName(leadCheck.name) && leadCheck.phone && !leadCheck.whatsapp_sent) {
            // Round-robin broker distribution
            const { data: brokers } = await supabase.from('brokers').select('id, whatsapp, name').eq('active', true).order('created_at');
            if (brokers && brokers.length > 0) {
              // Get last assigned broker for round-robin
              const { data: settings } = await supabase.from('company_settings').select('last_assigned_broker_id').limit(1).single();
              let brokerIndex = 0;
              if (settings?.last_assigned_broker_id) {
                const lastIdx = brokers.findIndex(b => b.id === settings.last_assigned_broker_id);
                brokerIndex = (lastIdx + 1) % brokers.length;
              }
              const selectedBroker = brokers[brokerIndex];

              // Assign broker to lead
              await supabase.from('leads').update({ broker_id: selectedBroker.id }).eq('id', convData.lead_id);
              await supabase.from('company_settings').update({ last_assigned_broker_id: selectedBroker.id }).limit(1);

              const scheduleTag = intent.isScheduling ? '\n📅 Cliente pediu AGENDAMENTO de visita' : '';
              const brokerMessage = `🚨 Novo Lead no Sistema\n\n` +
                `👤 Nome: ${leadCheck.name}\n` +
                `📱 Telefone: ${leadCheck.phone}\n` +
                `🎯 Interesse: ${intent.type}\n` +
                `🌡️ Temperatura: ${temperature}\n` +
                `📍 Origem: WhatsApp${scheduleTag}\n\n` +
                `O cliente entrou em contato e aguarda retorno.\n` +
                `Clique para atender: https://wa.me/${leadCheck.phone}`;

              await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: selectedBroker.whatsapp, message: brokerMessage }),
              });
              console.log(`[WhatsApp AI] ✅ Broker ${selectedBroker.name} notified (round-robin)`);
            }
            await supabase.from('leads').update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() }).eq('id', convData.lead_id);
          }
        }
      } else if (sanitizedPhone) {
        // No lead linked yet — try to find by phone or create
        const { data: existingLead } = await supabase.from('leads').select('id').eq('phone', sanitizedPhone).maybeSingle();
        if (existingLead) {
          await supabase.from('omnichat_conversations').update({ lead_id: existingLead.id }).eq('id', conversationId);
          const leadPatch: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
            lead_temperature: temperature,
            intent: intent.type,
          };
          if (extractedName) leadPatch.name = extractedName;
          await supabase.from('leads').update(leadPatch).eq('id', existingLead.id);
        }
      }
    } catch (extractErr) {
      console.error('[WhatsApp AI] Data extraction error:', extractErr);
    }

    // 8. Check for escalation tags
    const isVisitScheduled = reply.includes('[VISITA_AGENDADA]');
    const shouldEscalate = reply.includes('[ENCAMINHAR_CORRETOR]') || isVisitScheduled || intent.isScheduling;
    reply = reply.replace('[VISITA_AGENDADA]', '').replace('[ENCAMINHAR_CORRETOR]', '').trim();

    if (shouldEscalate) {
      console.log('[WhatsApp AI] 🔄 Escalation triggered for', senderPhone, 'reason:', isVisitScheduled ? 'visit_scheduled' : intent.isScheduling ? 'scheduling' : 'ai_tag');

      // Update CRM to "visita_agendada" stage
      if (isVisitScheduled && convData?.lead_id) {
        await supabase.from('crm_cards').update({
          coluna: 'negociacao',
          proxima_acao: 'Visita agendada pelo chat - confirmar com cliente',
          prioridade: 'alta',
          lead_score: 90,
          probabilidade_fechamento: 50,
          updated_at: new Date().toISOString(),
        }).eq('lead_id', convData.lead_id);

        await supabase.from('leads').update({
          visit_requested: true,
          status: 'em_atendimento',
          updated_at: new Date().toISOString(),
        }).eq('id', convData.lead_id);

        await supabase.from('crm_events').insert({
          lead_id: convData.lead_id,
          event_type: 'visita_agendada',
          new_value: 'agendada_via_chat',
          metadata: { source: 'whatsapp_ai', temperature, messageCount: clientMessageCount },
        });
      }

      await supabase.from('omnichat_conversations').update({
        bot_active: false,
        status: 'open',
      }).eq('id', conversationId);

      // Notify broker for escalation
      try {
        const { data: brokers } = await supabase.from('brokers').select('whatsapp, name').eq('active', true).limit(1);
        if (brokers && brokers.length > 0) {
          const reason = isVisitScheduled 
            ? '📅 VISITA AGENDADA pelo chat — cliente confirmou!'
            : intent.isScheduling 
              ? '📅 Cliente quer AGENDAR VISITA' 
              : '💬 Cliente precisa de atendimento humano';
          
          const brokerMessage = isVisitScheduled
            ? `🚨 NOVO LEAD + AGENDAMENTO\n\n` +
              `👤 Nome: ${contactName || 'Não informado'}\n` +
              `📱 Telefone: ${senderPhone || 'Não informado'}\n` +
              `🎯 Interesse: ${intent.type}\n` +
              `🌡️ Temperatura: ${temperature}\n` +
              `📍 Origem: WhatsApp\n\n` +
              `📅 Visita agendada pelo chat\n` +
              `O cliente já confirmou — entre em contato para alinhar detalhes.\n\n` +
              `Clique para atender: https://wa.me/${senderPhone}`
            : `🔔 Lead Encaminhado pela IA\n\n` +
              `👤 Nome: ${contactName || 'Não informado'}\n` +
              `📱 Telefone: ${senderPhone || 'Não informado'}\n` +
              `🎯 ${reason}\n` +
              `💬 Último: ${message.substring(0, 200)}\n\n` +
              `Clique para atender: https://wa.me/${senderPhone}`;

          await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: brokers[0].whatsapp, message: brokerMessage }),
          });
          console.log('[WhatsApp AI] ✅ Broker notified for escalation');
        }
      } catch (notifyErr) {
        console.error('[WhatsApp AI] Broker notification error:', notifyErr);
      }
    }

    console.log('[WhatsApp AI] ✅ Reply generated, escalate:', shouldEscalate);

    return new Response(
      JSON.stringify({ reply, escalate: shouldEscalate }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[WhatsApp AI] Error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message || 'Internal error', reply: null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
