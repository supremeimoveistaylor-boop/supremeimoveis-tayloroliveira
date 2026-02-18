import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { card_id, lead_id } = await req.json();
    if (!card_id) {
      return new Response(JSON.stringify({ error: "card_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch card data
    const { data: card, error: cardError } = await supabase
      .from("crm_cards")
      .select("*")
      .eq("id", card_id)
      .single();

    if (cardError || !card) {
      return new Response(JSON.stringify({ error: "Card not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch lead data if available
    let leadData = null;
    let chatMessages: any[] = [];
    const effectiveLeadId = lead_id || card.lead_id;

    if (effectiveLeadId) {
      const { data: lead } = await supabase
        .from("leads")
        .select("*")
        .eq("id", effectiveLeadId)
        .single();
      leadData = lead;

      // Fetch chat messages
      const { data: messages } = await supabase
        .from("chat_messages")
        .select("content, role, created_at")
        .eq("lead_id", effectiveLeadId)
        .order("created_at", { ascending: true })
        .limit(30);
      chatMessages = messages || [];
    }

    // Build context for AI
    const conversationText = chatMessages.length > 0
      ? chatMessages.map((m: any) => `${m.role === 'user' ? 'Cliente' : 'Assistente'}: ${m.content}`).join("\n")
      : "Sem histórico de conversa disponível.";

    const cardContext = `
Card: ${card.titulo}
Cliente: ${card.cliente}
Telefone: ${card.telefone || 'N/A'}
Email: ${card.email || 'N/A'}
Coluna atual: ${card.coluna}
Score atual: ${card.lead_score}
Classificação atual: ${card.classificacao}
Origem: ${card.origem_lead || 'N/A'}
Valor estimado: ${card.valor_estimado || 0}
Notas: ${card.notas || 'N/A'}
Última interação: ${card.last_interaction_at || card.created_at}
`;

    const leadContext = leadData ? `
Lead Score DB: ${leadData.lead_score || 0}
Qualificação DB: ${leadData.qualification || 'N/A'}
Intenção: ${leadData.intent || 'N/A'}
Visita solicitada: ${leadData.visit_requested ? 'Sim' : 'Não'}
Mensagens: ${leadData.message_count || 0}
` : '';

    // Call AI with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um analista de CRM imobiliário inteligente. Analise os dados do lead e da conversa para classificar o lead e sugerir ações.

REGRAS DE CLASSIFICAÇÃO:
- QUENTE: demonstra urgência, fala em pagamento/contrato, quer agendar visita, quer fechar
- MORNO: demonstra interesse genérico, faz perguntas sobre imóveis, pede informações
- FRIO: apenas curiosidade, sem engajamento claro, sem dados de contato

REGRAS DE MOVIMENTAÇÃO (coluna sugerida):
- "Quero informações" / primeiro contato → contato_iniciado
- "Tenho interesse" / faz perguntas específicas → qualificado
- "Quero visitar" / solicita agendamento → agendamento
- "Já visitei" / confirma visita → visita_realizada
- "Quero fechar" / fala de proposta → proposta
- "Fechei" / confirma negócio → fechado
- Sem resposta prolongada / desinteresse → sem_interesse

PROBABILIDADE DE FECHAMENTO:
- 0-20%: Lead frio, sem engajamento
- 20-40%: Interesse inicial, fazendo perguntas
- 40-60%: Qualificado, quer mais detalhes
- 60-80%: Agendou/visitou, negociando
- 80-100%: Proposta aceita, prestes a fechar`
          },
          {
            role: "user",
            content: `Analise este lead:\n\n${cardContext}\n${leadContext}\n\nHistórico de conversa:\n${conversationText}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_lead",
              description: "Retorna análise completa do lead",
              parameters: {
                type: "object",
                properties: {
                  classificacao: {
                    type: "string",
                    enum: ["frio", "morno", "quente"],
                    description: "Classificação térmica do lead"
                  },
                  coluna_sugerida: {
                    type: "string",
                    enum: ["leads", "contato_iniciado", "qualificado", "agendamento", "visita_realizada", "proposta", "fechado", "sem_interesse"],
                    description: "Coluna sugerida no Kanban"
                  },
                  probabilidade_fechamento: {
                    type: "number",
                    description: "Probabilidade de fechamento de 0 a 100"
                  },
                  lead_score: {
                    type: "number",
                    description: "Score do lead de 0 a 100"
                  },
                  resumo: {
                    type: "string",
                    description: "Resumo curto da análise (max 150 chars)"
                  },
                  proxima_acao: {
                    type: "string",
                    description: "Próxima ação recomendada (max 100 chars)"
                  },
                  prioridade: {
                    type: "string",
                    enum: ["normal", "alta", "urgente"],
                    description: "Nível de prioridade"
                  }
                },
                required: ["classificacao", "coluna_sugerida", "probabilidade_fechamento", "lead_score", "resumo", "proxima_acao", "prioridade"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_lead" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Add credits to workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    
    // Extract tool call result
    let analysis;
    try {
      const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
      analysis = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      return new Response(JSON.stringify({ error: "Failed to parse AI analysis" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the CRM card with AI analysis
    const oldClassificacao = card.classificacao;
    const oldColuna = card.coluna;

    const updateData: any = {
      classificacao: analysis.classificacao,
      probabilidade_fechamento: analysis.probabilidade_fechamento,
      lead_score: analysis.lead_score,
      prioridade: analysis.prioridade,
      ai_summary: analysis.resumo,
      proxima_acao: analysis.proxima_acao,
      ai_last_analysis_at: new Date().toISOString(),
    };

    // Only auto-move if AI suggests a different column
    if (analysis.coluna_sugerida !== card.coluna) {
      updateData.coluna = analysis.coluna_sugerida;

      // Add history entry
      const historico = Array.isArray(card.historico) ? card.historico : [];
      historico.push({
        tipo: 'ia',
        descricao: `IA moveu de "${oldColuna}" para "${analysis.coluna_sugerida}" - ${analysis.resumo}`,
        data: new Date().toISOString(),
      });
      updateData.historico = JSON.stringify(historico);
    }

    const { error: updateError } = await supabase
      .from("crm_cards")
      .update(updateData)
      .eq("id", card_id);

    if (updateError) {
      console.error("Error updating card:", updateError);
    }

    // Log events
    if (analysis.classificacao !== oldClassificacao) {
      await supabase.from("crm_events").insert({
        card_id,
        lead_id: effectiveLeadId,
        event_type: analysis.classificacao === 'quente' ? 'HOT_LEAD_TRIGGERED' : 'LEAD_SCORE_UPDATED',
        old_value: oldClassificacao,
        new_value: analysis.classificacao,
        metadata: { score: analysis.lead_score, probabilidade: analysis.probabilidade_fechamento },
      });
    }

    if (analysis.coluna_sugerida !== oldColuna) {
      await supabase.from("crm_events").insert({
        card_id,
        lead_id: effectiveLeadId,
        event_type: 'LEAD_STAGE_CHANGED',
        old_value: oldColuna,
        new_value: analysis.coluna_sugerida,
        metadata: { reason: analysis.resumo },
      });
    }

    await supabase.from("crm_events").insert({
      card_id,
      lead_id: effectiveLeadId,
      event_type: 'CONVERSATION_ANALYZED',
      metadata: analysis,
    });

    return new Response(JSON.stringify({
      success: true,
      analysis,
      card_updated: true,
      stage_changed: analysis.coluna_sugerida !== oldColuna,
      classification_changed: analysis.classificacao !== oldClassificacao,
      is_hot_lead: analysis.classificacao === 'quente',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("analyze-lead error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
