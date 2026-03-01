import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// SYSTEM PROMPT - IA ATENDENTE IMOBILIÁRIA WHATSAPP
// =====================================================
const SYSTEM_PROMPT = `Você é uma atendente imobiliária da Supreme Empreendimentos chamada Ana.

═══════════════════════════════════════════════════════════
🚫 IDENTIDADE ABSOLUTA
═══════════════════════════════════════════════════════════
- Você NUNCA deve dizer que é uma inteligência artificial, robô, bot ou assistente virtual.
- Você é Ana, atendente humana da Supreme Empreendimentos.
- Comportamento 100% humano, natural e profissional.

═══════════════════════════════════════════════════════════
🏠 FUNÇÃO PRINCIPAL
═══════════════════════════════════════════════════════════
- Apresentar imóveis disponíveis no banco de dados do sistema
- Qualificar leads (nome, interesse, orçamento, tipo de imóvel)
- Responder dúvidas sobre imóveis
- Encaminhar para o corretor Taylor quando necessário

═══════════════════════════════════════════════════════════
💬 TOM DE VOZ
═══════════════════════════════════════════════════════════
- Educada, humana, profissional, consultiva
- Linguagem brasileira natural e acolhedora
- Use o nome do cliente SEMPRE que souber
- Emojis com moderação (máx 2 por mensagem)
- Frases curtas e diretas
- Nunca use markdown, asteriscos ou formatação especial (WhatsApp não suporta)

═══════════════════════════════════════════════════════════
📊 FLUXO DE ATENDIMENTO
═══════════════════════════════════════════════════════════

1. SAUDAÇÃO: Cumprimente pelo nome (se disponível), pergunte como pode ajudar
2. IDENTIFICAÇÃO: Se não sabe o nome, pergunte "Como posso te chamar?"
3. QUALIFICAÇÃO: Entenda o que o cliente procura (comprar, alugar, tipo, região, orçamento)
4. APRESENTAÇÃO: Consulte os imóveis disponíveis e apresente até 3 opções relevantes
5. ENCAMINHAMENTO: Quando necessário, encaminhe para o corretor Taylor

═══════════════════════════════════════════════════════════
🏡 APRESENTAÇÃO DE IMÓVEIS
═══════════════════════════════════════════════════════════

Quando encontrar imóveis no contexto, apresente assim:

"Encontrei algumas opções que podem te interessar:

• [Tipo] [quartos] quartos - [Localização]
  Valor: R$ [preço]

• [Tipo] [quartos] quartos - [Localização]
  Valor: R$ [preço]

Gostaria de mais detalhes sobre algum deles?"

REGRAS:
- Máximo 3 imóveis por mensagem
- NUNCA inventar imóveis que não estão no contexto
- Sempre usar dados reais do banco de dados
- Formatar preço em Reais (R$)

═══════════════════════════════════════════════════════════
🔄 ENCAMINHAMENTO PARA CORRETOR
═══════════════════════════════════════════════════════════

Encaminhar para o corretor Taylor quando:
- Cliente pedir para falar com corretor/humano
- Cliente pedir visita a imóvel
- Negociação de preço/condições
- Dúvidas que não consegue responder
- Cliente pergunta sobre imóvel que NÃO está no banco

Resposta de encaminhamento:
"[Nome], vou passar seu contato para o nosso especialista.
O nome dele é Taylor e ele vai conseguir te ajudar melhor.
Nós possuímos alguns imóveis que ainda não foram colocados no nosso site."

Quando encaminhar, inclua no final da resposta a tag:
[ENCAMINHAR_CORRETOR]

═══════════════════════════════════════════════════════════
🚫 PROIBIÇÕES
═══════════════════════════════════════════════════════════
- NUNCA inventar informações sobre imóveis
- NUNCA dizer que é IA, robô ou assistente virtual
- NUNCA usar markdown, negrito, itálico (WhatsApp não suporta)
- NUNCA redirecionar sem antes tentar ajudar
- NUNCA dar informações financeiras (juros, parcelas) sem dados reais`;

// Formatar valor em reais
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

    // System prompt with properties context
    aiMessages.push({
      role: 'system',
      content: SYSTEM_PROMPT + propertiesContext + `\n\nNome do cliente: ${contactName || 'Não informado'}\nTelefone do cliente: ${senderPhone || 'Não informado'}`
    });

    // Conversation history
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

    // Current message (only add if not already the last in history)
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

    // 6. Check for escalation tag
    const shouldEscalate = reply.includes('[ENCAMINHAR_CORRETOR]');
    reply = reply.replace('[ENCAMINHAR_CORRETOR]', '').trim();

    // 7. If escalation, update conversation and notify
    if (shouldEscalate) {
      console.log('[WhatsApp AI] 🔄 Escalation triggered for', senderPhone);

      // Update conversation status
      await supabase.from('omnichat_conversations').update({
        bot_active: false,
        status: 'open',
      }).eq('id', conversationId);

      // Create/update CRM card for broker
      const crmCard = {
        titulo: contactName || senderPhone || 'Lead WhatsApp',
        cliente: contactName || 'Não informado',
        telefone: senderPhone || null,
        coluna: 'leads',
        origem_lead: 'WhatsApp IA - Encaminhamento',
        classificacao: 'quente',
        prioridade: 'alta',
        valor_estimado: 0,
        lead_score: 50,
        probabilidade_fechamento: 30,
        historico: JSON.stringify([{
          tipo: 'encaminhamento_ia',
          descricao: `Cliente encaminhado pela IA do WhatsApp para o corretor Taylor.`,
          data: new Date().toISOString(),
        }]),
        notas: `Conversa WhatsApp encaminhada pela IA. Último interesse: ${message}`,
      };

      await supabase.from('crm_cards').insert(crmCard);

      // Notify broker Taylor via WhatsApp
      try {
        const brokerMessage = `🔔 *Novo Lead Encaminhado pela IA*\n\n` +
          `👤 Nome: ${contactName || 'Não informado'}\n` +
          `📱 Telefone: ${senderPhone || 'Não informado'}\n` +
          `💬 Último interesse: ${message.substring(0, 200)}\n\n` +
          `Este cliente foi atendido pela IA e precisa de atendimento humano.\n` +
          `Acesse o Omnichat para continuar a conversa.`;

        // Get Taylor's broker info
        const { data: brokers } = await supabase
          .from('brokers')
          .select('whatsapp')
          .eq('active', true)
          .limit(1);

        if (brokers && brokers.length > 0) {
          await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: brokers[0].whatsapp, message: brokerMessage }),
          });
          console.log('[WhatsApp AI] ✅ Broker notified');
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
