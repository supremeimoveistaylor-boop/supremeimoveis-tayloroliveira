import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um ATENDENTE IMOBILIÁRIO HUMANIZADO da Supreme Empreendimentos.

REGRAS FUNDAMENTAIS:
- NUNCA diga que é IA, robô ou atendimento automático
- Linguagem humana, profissional e acolhedora
- Máximo 1 emoji ocasional
- Responder uma pergunta por vez
- Nunca pressionar o visitante
- Nunca misturar informações de imóveis diferentes

IDENTIFICAÇÃO DO IMÓVEL:
- Se houver imóvel identificado, o atendimento é EXCLUSIVO para ele
- Nunca sugerir outro imóvel sem autorização explícita

QUALIFICAÇÃO DO LEAD:
Durante a conversa, buscar identificar naturalmente:
- Intenção (comprar/alugar)
- Interesse real
- Desejo de visita

AGENDAMENTO DE VISITA:
Quando houver interesse, oferecer agendar visita de forma natural:
"Se quiser, posso agendar uma visita para você 😊 Qual dia e horário ficam melhores?"

COLETA DE DADOS:
Buscar coletar de forma natural:
- Nome do visitante
- Telefone para contato (WhatsApp)

SILÊNCIO DO USUÁRIO:
Se o usuário não responder:
1º: "Fico à disposição se precisar de algo 😊"
2º: "Vamos entrar em contato com você para te ajudar da melhor forma."

OBJETIVO:
- Atendimento profissional 24h
- Experiência humanizada
- Qualificar leads
- Agendar visitas
- Coletar informações de contato`;

interface ChatRequest {
  messages: { role: string; content: string }[];
  leadId?: string;
  propertyId?: string;
  propertyName?: string;
  pageUrl?: string;
  origin?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, leadId, propertyId, propertyName, pageUrl, origin } = await req.json() as ChatRequest;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY não configurada");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Criar cliente Supabase com service role para operações do sistema
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Criar ou atualizar lead
    let currentLeadId = leadId;
    if (!currentLeadId) {
      // Criar novo lead
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          property_id: propertyId || null,
          origin: origin || "Direto",
          page_url: pageUrl || null,
          status: "em_atendimento"
        })
        .select()
        .single();

      if (leadError) {
        console.error("Erro ao criar lead:", leadError);
      } else {
        currentLeadId = newLead.id;
        console.log("Lead criado:", currentLeadId);

        // Atribuir corretor automaticamente
        if (propertyId) {
          const { data: brokerId } = await supabase.rpc("assign_lead_to_broker", {
            p_lead_id: currentLeadId,
            p_property_id: propertyId
          });
          console.log("Corretor atribuído:", brokerId);
        }
      }
    }

    // Salvar mensagem do usuário
    if (currentLeadId && messages.length > 0) {
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage.role === "user") {
        await supabase.from("chat_messages").insert({
          lead_id: currentLeadId,
          role: "user",
          content: lastUserMessage.content
        });

        // Tentar extrair informações do usuário da mensagem
        const content = lastUserMessage.content.toLowerCase();
        const updates: Record<string, any> = {};

        // Detectar nome (padrões simples)
        const namePatterns = [
          /meu nome é ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /me chamo ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /sou ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
        ];
        for (const pattern of namePatterns) {
          const match = lastUserMessage.content.match(pattern);
          if (match) {
            updates.name = match[1].trim();
            break;
          }
        }

        // Detectar telefone
        const phonePattern = /(\d{2}[\s.-]?\d{4,5}[\s.-]?\d{4})/;
        const phoneMatch = lastUserMessage.content.match(phonePattern);
        if (phoneMatch) {
          updates.phone = phoneMatch[1].replace(/[\s.-]/g, "");
        }

        // Detectar intenção
        if (content.includes("comprar") || content.includes("compra")) {
          updates.intent = "comprar";
        } else if (content.includes("alugar") || content.includes("aluguel") || content.includes("locação")) {
          updates.intent = "alugar";
        }

        // Detectar interesse em visita
        if (content.includes("visita") || content.includes("conhecer") || content.includes("ver o imóvel")) {
          updates.visit_requested = true;
          updates.status = "visita_solicitada";
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from("leads").update(updates).eq("id", currentLeadId);
        }
      }
    }

    // Construir contexto do imóvel
    let propertyContext = "";
    if (propertyId || propertyName) {
      propertyContext = `\n\nCONTEXTO DO ATENDIMENTO:
O visitante está olhando ${propertyName ? `o imóvel "${propertyName}"` : "um imóvel específico"}.
Este atendimento é EXCLUSIVO para este imóvel.
${propertyId ? `ID do imóvel: ${propertyId}` : ""}`;
    } else {
      propertyContext = "\n\nCONTEXTO: O visitante acessou o site sem um imóvel específico. Ajude-o a encontrar o imóvel ideal.";
    }

    // Mensagem de abertura se for primeira interação
    const isFirstMessage = messages.length === 1 && messages[0].role === "user";
    let openingInstruction = "";
    if (messages.length === 0 || (isFirstMessage && !messages[0].content.trim())) {
      if (propertyName) {
        openingInstruction = `\nPRIMEIRA MENSAGEM: Cumprimente o visitante mencionando que viu que ele está olhando o imóvel "${propertyName}" e pergunte como pode ajudar.`;
      } else {
        openingInstruction = "\nPRIMEIRA MENSAGEM: Dê boas-vindas e pergunte como pode ajudar a encontrar o imóvel ideal.";
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: SYSTEM_PROMPT + propertyContext + openingInstruction
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retornar stream e leadId
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "text/event-stream");
    headers.set("X-Lead-Id", currentLeadId || "");

    return new Response(response.body, { headers });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
