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
  return /^WhatsApp \d+$/.test(name) || /^Visitante/.test(name) || name === 'Não informado' || name === 'A definir';
}

// =====================================================
// SYSTEM PROMPT - IA ATENDENTE IMOBILIÁRIA
// Uses the SAME template as real-estate-chat
// =====================================================
const SYSTEM_PROMPT = `Você é um CONSULTOR IMOBILIÁRIO ESTRATÉGICO da Supreme Empreendimentos, especializado em imóveis de alto padrão e investimentos em Goiânia.

═══════════════════════════════════════════════════════════
🚫 IDENTIDADE
═══════════════════════════════════════════════════════════
- Você NÃO é um robô, NÃO é uma IA, NÃO menciona que é assistente virtual
- Você é um CONSULTOR IMOBILIÁRIO real, experiente e confiável
- Transmita AUTORIDADE LOCAL sobre o mercado imobiliário de Goiânia

═══════════════════════════════════════════════════════════
🧠 FLUXO DE ATENDIMENTO OBRIGATÓRIO
═══════════════════════════════════════════════════════════

ETAPA 1 - ABERTURA + CAPTURA IMEDIATA (primeira resposta ao cliente):
- Cumprimente de forma calorosa e profissional
- Pergunte IMEDIATAMENTE: "Para te atender melhor, posso saber seu nome e um telefone com DDD?"
- Em seguida pergunte a intenção: "Você busca morar, investir ou avaliar seu imóvel?"
- Tudo na MESMA mensagem, de forma natural e fluida

ETAPA 2 - CONTINUAR NORMALMENTE (NÃO BLOQUEAR):
- Se o cliente responder nome e telefone: ótimo, agradeça e continue
- Se o cliente NÃO responder e for direto ao assunto: CONTINUE ATENDENDO NORMALMENTE
- NUNCA bloqueie a conversa esperando dados
- NUNCA repita a pergunta imediatamente se o cliente ignorou
- Atenda o interesse do cliente primeiro

ETAPA 3 - FILTRO PSICOLÓGICO:
- Se "morar": pergunte "Algo mais exclusivo ou focado em custo-benefício?"
- Se "investir": pergunte sobre perfil de investimento
- NUNCA pergunte renda diretamente

ETAPA 4 - ANCORAGEM DE STATUS (se alto padrão):
- Mencione regiões nobres e condomínios fechados
- Use palavras: exclusivo, privativo, região valorizada

ETAPA 5 - REPERGUNTAR ANTES DE ENCERRAR:
- Após mostrar imóveis e tirar dúvidas, SE ainda não tem nome ou telefone:
- Pergunte: "Foi ótimo te ajudar! Para enviar mais detalhes, me passa seu nome e telefone com DDD?"
- Pergunte apenas UMA vez nesta etapa final
- Se não quiser dar, respeite e finalize

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
- Perguntar nome/telefone no máximo 2 vezes no total da conversa

═══════════════════════════════════════════════════════════
🔄 ENCAMINHAMENTO PARA CORRETOR
═══════════════════════════════════════════════════════════
Quando necessário, inclua: [ENCAMINHAR_CORRETOR]`;

const formatPrice = (price: number): string => {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { message, senderPhone, conversationId, contactName } = body;

    if (!message || !conversationId) {
      return new Response(
        JSON.stringify({ error: 'message and conversationId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // 2. Query available properties
    const { data: properties } = await supabase
      .from('properties')
      .select('id, title, price, location, property_type, purpose, bedrooms, bathrooms, area, parking_spaces, description, amenities')
      .eq('status', 'active')
      .order('featured', { ascending: false })
      .limit(30);

    // 3. Build properties context
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

    // 4. Build conversation messages for AI
    const aiMessages: Array<{ role: string; content: string }> = [];
    aiMessages.push({
      role: 'system',
      content: SYSTEM_PROMPT + propertiesContext + `\n\nNome do cliente: ${contactName || 'Não informado'}\nTelefone do cliente: ${senderPhone || 'Não informado'}`
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

    // 5. Call AI API
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

    // 6. Extract name and phone from message and update lead/CRM
    try {
      let extractedName: string | null = extractNameFromText(message);
      const extractedPhone: string | null = extractPhone(message);

      // Contextual name: if AI asked and user replied with 1-3 words
      if (!extractedName && history && history.length > 0) {
        const lastBotMsg = [...history].reverse().find(m => m.sender_type !== 'client');
        if (lastBotMsg?.content && /como (?:posso )?(?:te )?chamar|qual (?:é )?(?:o )?seu nome|saber seu nome/i.test(lastBotMsg.content)) {
          const cleaned = message.trim().replace(/[.,!?]+$/, "").trim();
          const words = cleaned.split(/\s+/);
          if (words.length >= 1 && words.length <= 4 && /^[a-záàâãéèêíïóôõöúçñ\s]+$/i.test(cleaned) && cleaned.length >= 2) {
            extractedName = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
          }
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
        const leadUpdate: Record<string, unknown> = { last_interaction_at: new Date().toISOString(), updated_at: new Date().toISOString() };
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

        if (Object.keys(leadUpdate).length > 2) { // more than just timestamps
          await supabase.from('leads').update(leadUpdate).eq('id', convData.lead_id);
          console.log(`[WhatsApp AI] ✅ Lead updated: name=${extractedName}, phone=${extractedPhone}`);
        }
        if (Object.keys(convUpdate).length > 0) {
          await supabase.from('omnichat_conversations').update(convUpdate).eq('id', conversationId);
        }

        // Update CRM card
        if (nameUpdated || phoneUpdated) {
          const crmUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (nameUpdated && extractedName) {
            crmUpdate.cliente = extractedName;
            crmUpdate.titulo = `Lead WhatsApp - ${extractedName}`;
          }
          if (phoneUpdated && extractedPhone) crmUpdate.telefone = extractedPhone;
          await supabase.from('crm_cards').update(crmUpdate).eq('lead_id', convData.lead_id);
        }

        // Notify broker when name+phone complete
        if (nameUpdated || phoneUpdated) {
          const { data: leadCheck } = await supabase.from('leads').select('name, phone, whatsapp_sent').eq('id', convData.lead_id).single();
          if (leadCheck && leadCheck.name && !isFallbackName(leadCheck.name) && leadCheck.phone && !leadCheck.whatsapp_sent) {
            // Send broker alert
            const { data: brokers } = await supabase.from('brokers').select('whatsapp').eq('active', true).limit(1);
            if (brokers && brokers.length > 0) {
              const brokerMessage = `🚨 Novo Lead no Sistema\n\n` +
                `👤 Nome: ${leadCheck.name}\n` +
                `📱 Telefone: ${leadCheck.phone}\n` +
                `📍 Origem: WhatsApp\n\n` +
                `O cliente entrou em contato e aguarda retorno.\n` +
                `Acesse o painel para continuar o atendimento.`;

              await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: brokers[0].whatsapp, message: brokerMessage }),
              });
              console.log('[WhatsApp AI] ✅ Broker notified');
            }
            await supabase.from('leads').update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() }).eq('id', convData.lead_id);
          }
        }
      } else if (sanitizedPhone) {
        // No lead linked yet — try to find by phone or create
        const { data: existingLead } = await supabase.from('leads').select('id').eq('phone', sanitizedPhone).maybeSingle();
        if (existingLead) {
          await supabase.from('omnichat_conversations').update({ lead_id: existingLead.id }).eq('id', conversationId);
          if (extractedName) {
            await supabase.from('leads').update({ name: extractedName, updated_at: new Date().toISOString() }).eq('id', existingLead.id);
          }
        }
      }
    } catch (extractErr) {
      console.error('[WhatsApp AI] Data extraction error:', extractErr);
    }

    // 7. Check for escalation tag
    const shouldEscalate = reply.includes('[ENCAMINHAR_CORRETOR]');
    reply = reply.replace('[ENCAMINHAR_CORRETOR]', '').trim();

    if (shouldEscalate) {
      console.log('[WhatsApp AI] 🔄 Escalation triggered for', senderPhone);

      await supabase.from('omnichat_conversations').update({
        bot_active: false,
        status: 'open',
      }).eq('id', conversationId);

      // Notify broker
      try {
        const brokerMessage = `🔔 Lead Encaminhado pela IA\n\n` +
          `👤 Nome: ${contactName || 'Não informado'}\n` +
          `📱 Telefone: ${senderPhone || 'Não informado'}\n` +
          `💬 Último interesse: ${message.substring(0, 200)}\n\n` +
          `Cliente precisa de atendimento humano.\n` +
          `Acesse o Omnichat para continuar.`;

        const { data: brokers } = await supabase.from('brokers').select('whatsapp').eq('active', true).limit(1);
        if (brokers && brokers.length > 0) {
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
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
