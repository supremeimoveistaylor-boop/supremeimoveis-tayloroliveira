import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Follow-up stages with time thresholds
const FOLLOWUP_STAGES = [
  { stage: 1, delayHours: 1, type: 'suave', description: 'Mensagem suave de acompanhamento' },
  { stage: 2, delayHours: 24, type: 'abordagem', description: 'Nova abordagem com valor' },
  { stage: 3, delayHours: 72, type: 'escassez', description: 'Oferta com senso de urgência' },
  { stage: 4, delayHours: 168, type: 'ultima', description: 'Última tentativa de contato' },
];

// Broker reminder stages
const BROKER_STAGES = [
  { delayMinutes: 15, type: 'alerta', description: 'Alerta inicial' },
  { delayMinutes: 60, type: 'lembrete', description: 'Lembrete reforçado' },
  { delayMinutes: 240, type: 'sem_atendimento', description: 'Marcado como sem atendimento' },
];

// Nurturing content topics for cold leads (rotating every 5 days)
const NURTURING_TOPICS = [
  { topic: 'dicas_compra', description: '5 dicas essenciais para comprar seu primeiro imóvel' },
  { topic: 'financiamento', description: 'Como funciona o financiamento imobiliário em 2026' },
  { topic: 'valorizacao', description: 'Bairros que mais valorizam em Goiânia' },
  { topic: 'documentacao', description: 'Documentos necessários para comprar um imóvel' },
  { topic: 'investimento', description: 'Imóveis como investimento: por que vale a pena' },
  { topic: 'tendencias', description: 'Tendências do mercado imobiliário atual' },
  { topic: 'custos_ocultos', description: 'Custos além do preço do imóvel que você precisa conhecer' },
  { topic: 'decoracao', description: 'Dicas de decoração para valorizar seu imóvel' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');

    const results = {
      followups_sent: 0,
      broker_reminders_sent: 0,
      nurturing_sent: 0,
      errors: [] as string[],
    };

    // ===== 1. LEAD FOLLOW-UP =====
    // Get leads that need follow-up (have phone, not closed/lost, followup_stage < 4)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .not('phone', 'is', null)
      .lt('followup_stage', 4)
      .not('status', 'in', '("convertido","perdido")');

    if (leadsError) {
      console.error('[Follow-up] Error fetching leads:', leadsError);
      results.errors.push(`Leads fetch error: ${leadsError.message}`);
    }

    const now = new Date();

    for (const lead of (leads || [])) {
      try {
        const currentStage = lead.followup_stage || 0;
        const nextStageConfig = FOLLOWUP_STAGES[currentStage]; // 0-indexed = next stage
        if (!nextStageConfig) continue;

        // Calculate time since last interaction or creation
        const referenceTime = new Date(lead.last_followup_at || lead.last_interaction_at || lead.created_at);
        const hoursSince = (now.getTime() - referenceTime.getTime()) / (1000 * 60 * 60);

        if (hoursSince < nextStageConfig.delayHours) continue;

        // Get conversation history for context
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('content, role')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
          .limit(5);

        const conversationContext = (messages || [])
          .reverse()
          .map(m => `${m.role}: ${m.content}`)
          .join('\n');

        // Get CRM card for property interest
        const { data: crmCard } = await supabase
          .from('crm_cards')
          .select('titulo, notas')
          .eq('lead_id', lead.id)
          .limit(1)
          .single();

        // Generate AI follow-up message
        const aiMessage = await generateFollowUpMessage({
          leadName: lead.name || 'Cliente',
          interest: lead.intent || crmCard?.titulo || 'imóveis',
          stage: nextStageConfig.type,
          conversationContext,
          apiKey: LOVABLE_API_KEY,
        });

        if (!aiMessage) {
          results.errors.push(`AI generation failed for lead ${lead.id}`);
          continue;
        }

        // Send via WhatsApp
        let whatsappMessageId: string | null = null;
        if (lead.phone && WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN) {
          const sendResult = await sendWhatsAppMessage({
            to: lead.phone,
            message: aiMessage,
            phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
            accessToken: WHATSAPP_ACCESS_TOKEN,
          });
          whatsappMessageId = sendResult?.messageId || null;
        }

        // Update lead
        await supabase
          .from('leads')
          .update({
            followup_stage: nextStageConfig.stage,
            last_followup_at: now.toISOString(),
          })
          .eq('id', lead.id);

        // Log alert
        await supabase
          .from('followup_alerts')
          .insert({
            lead_id: lead.id,
            alert_type: 'lead_followup',
            stage: nextStageConfig.stage,
            message_sent: aiMessage,
            channel: 'whatsapp',
            status: whatsappMessageId ? 'sent' : 'failed',
            whatsapp_message_id: whatsappMessageId,
            metadata: {
              lead_name: lead.name,
              lead_phone: lead.phone,
              stage_type: nextStageConfig.type,
              hours_since_last: Math.round(hoursSince),
            },
          });

        results.followups_sent++;
        console.log(`[Follow-up] Stage ${nextStageConfig.stage} sent to lead ${lead.id} (${lead.name})`);

      } catch (e) {
        console.error(`[Follow-up] Error processing lead ${lead.id}:`, e);
        results.errors.push(`Lead ${lead.id}: ${e.message}`);
      }
    }

    // ===== 2. BROKER REMINDERS =====
    // Get leads assigned to brokers that haven't been attended
    const { data: unattendedLeads, error: brokerError } = await supabase
      .from('leads')
      .select('*, brokers!leads_broker_id_fkey(id, name, whatsapp, phone)')
      .not('broker_id', 'is', null)
      .eq('status', 'novo')
      .not('phone', 'is', null);

    if (brokerError) {
      console.error('[Follow-up] Error fetching broker leads:', brokerError);
    }

    for (const lead of (unattendedLeads || [])) {
      try {
        const broker = (lead as any).brokers;
        if (!broker) continue;

        const assignedAt = new Date(lead.updated_at || lead.created_at);
        const minutesSince = (now.getTime() - assignedAt.getTime()) / (1000 * 60);
        const lastNotification = lead.last_agent_notification ? new Date(lead.last_agent_notification) : null;
        const minutesSinceNotification = lastNotification
          ? (now.getTime() - lastNotification.getTime()) / (1000 * 60)
          : Infinity;

        // Determine which broker stage to send
        let stageToSend: typeof BROKER_STAGES[0] | null = null;

        for (let i = BROKER_STAGES.length - 1; i >= 0; i--) {
          const stage = BROKER_STAGES[i];
          if (minutesSince >= stage.delayMinutes && minutesSinceNotification >= stage.delayMinutes) {
            stageToSend = stage;
            break;
          }
        }

        if (!stageToSend) continue;

        const timeSinceStr = minutesSince >= 60
          ? `${Math.round(minutesSince / 60)} horas`
          : `${Math.round(minutesSince)} minutos`;

        const brokerMessage = `⚠️ *Lead aguardando atendimento*\n\n` +
          `Nome: ${lead.name || 'Não informado'}\n` +
          `Telefone: ${lead.phone}\n` +
          `Interesse: ${lead.intent || 'Não informado'}\n` +
          `Tempo sem resposta: ${timeSinceStr}\n\n` +
          `${stageToSend.type === 'sem_atendimento' ? '🔴 *URGENTE: Lead será remarcado se não houver atendimento.*' : 'Entre em contato imediatamente.'}`;

        // Send WhatsApp to broker
        const brokerPhone = broker.whatsapp || broker.phone;
        let whatsappMessageId: string | null = null;

        if (brokerPhone && WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN) {
          const sendResult = await sendWhatsAppMessage({
            to: brokerPhone,
            message: brokerMessage,
            phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
            accessToken: WHATSAPP_ACCESS_TOKEN,
          });
          whatsappMessageId = sendResult?.messageId || null;
        }

        // Update lead notification timestamp
        const updates: any = { last_agent_notification: now.toISOString() };
        if (stageToSend.type === 'sem_atendimento') {
          updates.status = 'sem_atendimento';
        }
        await supabase.from('leads').update(updates).eq('id', lead.id);

        // Log alert
        await supabase.from('followup_alerts').insert({
          lead_id: lead.id,
          alert_type: 'broker_reminder',
          stage: BROKER_STAGES.indexOf(stageToSend),
          message_sent: brokerMessage,
          channel: 'whatsapp',
          status: whatsappMessageId ? 'sent' : 'failed',
          whatsapp_message_id: whatsappMessageId,
          metadata: {
            broker_name: broker.name,
            broker_phone: brokerPhone,
            reminder_type: stageToSend.type,
            minutes_waiting: Math.round(minutesSince),
          },
        });

        results.broker_reminders_sent++;
        console.log(`[Follow-up] Broker reminder (${stageToSend.type}) sent for lead ${lead.id}`);

      } catch (e) {
        console.error(`[Follow-up] Broker reminder error for lead ${lead.id}:`, e);
        results.errors.push(`Broker reminder ${lead.id}: ${e.message}`);
      }
    }

    // ===== 3. COLD LEAD NURTURING (every 5 days) =====
    const NURTURING_INTERVAL_DAYS = 5;
    const { data: coldLeads, error: coldError } = await supabase
      .from('leads')
      .select('*')
      .not('phone', 'is', null)
      .in('qualification', ['frio', 'morno'])
      .gte('followup_stage', 4) // completed all follow-ups
      .not('nurturing_flow_status', 'eq', 'completed')
      .not('status', 'in', '("convertido","perdido")');

    if (coldError) {
      console.error('[Nurturing] Error fetching cold leads:', coldError);
      results.errors.push(`Cold leads fetch: ${coldError.message}`);
    }

    for (const lead of (coldLeads || [])) {
      try {
        // Check time since last nurturing or last follow-up
        const lastNurturing = lead.last_followup_at || lead.updated_at;
        const daysSince = (now.getTime() - new Date(lastNurturing).getTime()) / (1000 * 60 * 60 * 24);

        if (daysSince < NURTURING_INTERVAL_DAYS) continue;

        // Determine which topic to send (rotate through topics)
        const nurturingCount = lead.followup_stage - 4; // stages beyond 4 = nurturing count
        const topicIndex = nurturingCount % NURTURING_TOPICS.length;
        const topic = NURTURING_TOPICS[topicIndex];

        // Check if all topics exhausted (full cycle done)
        if (nurturingCount >= NURTURING_TOPICS.length) {
          await supabase.from('leads').update({ nurturing_flow_status: 'completed' }).eq('id', lead.id);
          continue;
        }

        // Generate nurturing message via AI
        const nurturingMessage = await generateNurturingMessage({
          leadName: lead.name || 'Cliente',
          topic: topic.description,
          apiKey: LOVABLE_API_KEY,
        });

        if (!nurturingMessage) {
          results.errors.push(`Nurturing AI failed for lead ${lead.id}`);
          continue;
        }

        // Send via WhatsApp
        let whatsappMessageId: string | null = null;
        if (lead.phone && WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN) {
          const sendResult = await sendWhatsAppMessage({
            to: lead.phone,
            message: nurturingMessage,
            phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
            accessToken: WHATSAPP_ACCESS_TOKEN,
          });
          whatsappMessageId = sendResult?.messageId || null;
        }

        // Update lead
        await supabase.from('leads').update({
          followup_stage: lead.followup_stage + 1,
          last_followup_at: now.toISOString(),
          nurturing_flow_status: 'active',
        }).eq('id', lead.id);

        // Log alert
        await supabase.from('followup_alerts').insert({
          lead_id: lead.id,
          alert_type: 'nurturing',
          stage: nurturingCount,
          message_sent: nurturingMessage,
          channel: 'whatsapp',
          status: whatsappMessageId ? 'sent' : 'failed',
          whatsapp_message_id: whatsappMessageId,
          metadata: {
            lead_name: lead.name,
            lead_phone: lead.phone,
            topic: topic.topic,
            topic_description: topic.description,
            days_since_last: Math.round(daysSince),
          },
        });

        results.nurturing_sent++;
        console.log(`[Nurturing] Topic "${topic.topic}" sent to lead ${lead.id} (${lead.name})`);
      } catch (e) {
        console.error(`[Nurturing] Error for lead ${lead.id}:`, e);
        results.errors.push(`Nurturing ${lead.id}: ${e.message}`);
      }
    }

    console.log('[Follow-up] Completed:', results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Follow-up] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate AI follow-up message
async function generateFollowUpMessage({
  leadName,
  interest,
  stage,
  conversationContext,
  apiKey,
}: {
  leadName: string;
  interest: string;
  stage: string;
  conversationContext: string;
  apiKey: string | undefined;
}): Promise<string | null> {
  if (!apiKey) {
    console.error('[Follow-up] LOVABLE_API_KEY not configured');
    return getDefaultMessage(leadName, interest, stage);
  }

  const stagePrompts: Record<string, string> = {
    suave: `Gere uma mensagem curta e amigável de acompanhamento para ${leadName}, que demonstrou interesse em ${interest}. Seja natural, como um corretor atencioso verificando se pode ajudar. NÃO use saudações formais demais. Máximo 3 linhas.`,
    abordagem: `Gere uma mensagem de valor para ${leadName}, destacando benefícios exclusivos sobre ${interest}. Inclua um dado relevante sobre o mercado imobiliário ou vantagem do imóvel. Seja persuasivo mas natural. Máximo 4 linhas.`,
    escassez: `Gere uma mensagem com senso de urgência para ${leadName} sobre ${interest}. Mencione que as unidades estão acabando ou que há outros interessados. Crie urgência real sem ser agressivo. Máximo 4 linhas.`,
    ultima: `Gere uma mensagem final e respeitosa para ${leadName} sobre ${interest}. Diga que essa é a última tentativa de contato, que está à disposição quando precisar. Deixe a porta aberta. Máximo 3 linhas.`,
  };

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `Você é Taylor, consultora imobiliária da Supreme Imóveis em Goiânia. Gere mensagens de WhatsApp naturais e personalizadas. Nunca mencione que é um robô ou sistema automático. Use emojis com moderação. Contexto da conversa anterior:\n${conversationContext || 'Nenhum histórico disponível.'}`,
          },
          { role: 'user', content: stagePrompts[stage] || stagePrompts.suave },
        ],
      }),
    });

    if (!response.ok) {
      console.error('[Follow-up] AI error:', response.status);
      return getDefaultMessage(leadName, interest, stage);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || getDefaultMessage(leadName, interest, stage);
  } catch (e) {
    console.error('[Follow-up] AI generation error:', e);
    return getDefaultMessage(leadName, interest, stage);
  }
}

// Fallback messages
function getDefaultMessage(name: string, interest: string, stage: string): string {
  const messages: Record<string, string> = {
    suave: `Olá ${name}! 😊 Vi que você demonstrou interesse em ${interest}. Posso te ajudar com mais informações? Estou à disposição!`,
    abordagem: `${name}, temos condições especiais para ${interest} que podem te interessar! Quer saber mais sobre as facilidades de pagamento? 🏠`,
    escassez: `${name}, as unidades de ${interest} estão com alta procura! ⚡ Não quero que você perca essa oportunidade. Podemos conversar?`,
    ultima: `${name}, essa é minha última mensagem sobre ${interest}. Quando precisar, estarei à disposição! Desejo tudo de melhor. 🙏`,
  };
  return messages[stage] || messages.suave;
}

// Generate nurturing content message
async function generateNurturingMessage({
  leadName,
  topic,
  apiKey,
}: {
  leadName: string;
  topic: string;
  apiKey: string | undefined;
}): Promise<string | null> {
  const defaultMsg = `Olá ${leadName}! 📚 Preparamos um conteúdo especial para você: ${topic}. Quer saber mais? Estamos à disposição! 🏠`;

  if (!apiKey) return defaultMsg;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `Você é Taylor, consultora imobiliária da Supreme Imóveis em Goiânia. Gere mensagens educativas de WhatsApp sobre mercado imobiliário. O objetivo é manter o lead engajado com conteúdo de valor, sem pressão de venda. Seja informativa, amigável e profissional. Use emojis com moderação. Máximo 6 linhas.`,
          },
          {
            role: 'user',
            content: `Gere uma mensagem educativa para ${leadName} sobre o tema: "${topic}". Inclua 2-3 dicas práticas e relevantes. Finalize convidando para tirar dúvidas. Não mencione que é automático.`,
          },
        ],
      }),
    });

    if (!response.ok) return defaultMsg;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || defaultMsg;
  } catch (e) {
    console.error('[Nurturing] AI error:', e);
    return defaultMsg;
  }
}

// Send WhatsApp message
async function sendWhatsAppMessage({
  to,
  message,
  phoneNumberId,
  accessToken,
}: {
  to: string;
  message: string;
  phoneNumberId: string;
  accessToken: string;
}): Promise<{ messageId: string } | null> {
  try {
    const formattedPhone = to.replace(/\D/g, '');
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: { preview_url: false, body: message },
        }),
      }
    );

    const result = await response.json();
    if (!response.ok) {
      console.error('[Follow-up] WhatsApp send error:', result);
      return null;
    }
    return { messageId: result.messages?.[0]?.id || 'unknown' };
  } catch (e) {
    console.error('[Follow-up] WhatsApp send failed:', e);
    return null;
  }
}
