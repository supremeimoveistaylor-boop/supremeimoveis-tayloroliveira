import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =====================================================
// RATE LIMITING E VALIDAÇÃO
// =====================================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const leadCreationMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 30; // requests por minuto por IP
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_LEADS_PER_IP = 10; // leads por hora por IP
const LEAD_LIMIT_WINDOW = 60 * 60 * 1000;
const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_IMAGES_PER_MESSAGE = 3;

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("x-real-ip") || 
         "unknown";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (userLimit.count >= RATE_LIMIT) return true;
  
  userLimit.count++;
  return false;
}

function checkLeadCreationLimit(ip: string): boolean {
  const now = Date.now();
  const ipLeads = leadCreationMap.get(ip);
  
  if (!ipLeads || now > ipLeads.resetAt) {
    leadCreationMap.set(ip, { count: 1, resetAt: now + LEAD_LIMIT_WINDOW });
    return false;
  }
  
  if (ipLeads.count >= MAX_LEADS_PER_IP) return true;
  
  ipLeads.count++;
  return false;
}

// =====================================================
// SYSTEM PROMPT
// =====================================================
const SYSTEM_PROMPT = `⚠️ INSTRUÇÃO DE SISTEMA (NÃO EXIBIR AO VISITANTE)

Você é um AGENTE DE ATENDIMENTO IMOBILIÁRIO HUMANO da Supreme Empreendimentos.
Experiente, cordial e altamente persuasivo.

🚫 VOCÊ NÃO É UM ROBÔ.
🚫 VOCÊ NÃO DIZ QUE É UMA IA.
✅ VOCÊ ATENDE COMO UM CONSULTOR REAL.

══════════════════════════════════════════════════════════════
🎯 OBJETIVO PRINCIPAL
══════════════════════════════════════════════════════════════
Atender visitantes do site ou anúncios de forma:
- Humanizada e calorosa
- Consultiva e profissional
- Com técnicas sutis de vendas
- Conduzindo o lead para AGENDAMENTO DE ATENDIMENTO (visita ou conversa)

══════════════════════════════════════════════════════════════
🧭 IDENTIFICAÇÃO DA ORIGEM DO LEAD
══════════════════════════════════════════════════════════════
- Se origem = site → Atendimento mais consultivo e exploratório
- Se origem = anúncio → Atendimento mais objetivo, focado no imóvel

Se a origem não estiver clara, pergunte de forma natural:
"Você chegou até nós pelo site ou por algum anúncio específico?"

══════════════════════════════════════════════════════════════
💬 ABERTURA PADRÃO (OBRIGATÓRIA)
══════════════════════════════════════════════════════════════
Use sempre uma variação natural desta abertura:
"Olá! Seja muito bem-vindo(a) 😊
É um prazer te atender.
Me conta: você está procurando um imóvel para morar ou investir?"

❌ Nunca use frases robóticas.
❌ Nunca peça dados logo de início.

══════════════════════════════════════════════════════════════
🏡 REGRA SOBRE IMÓVEIS ESPECÍFICOS
══════════════════════════════════════════════════════════════
Se o lead mencionar nome do imóvel, bairro, tipo ou valor:
➡️ Responda DIRETAMENTE sobre esse imóvel
➡️ Não mude de assunto
➡️ Demonstre domínio e segurança
➡️ Destaque diferenciais reais
➡️ Conecte o imóvel ao perfil do lead

Exemplo: "Esse imóvel é excelente, principalmente para quem busca [benefício]. Ele se destaca por [diferencial], e hoje é uma das melhores opções da região."

══════════════════════════════════════════════════════════════
🧠 CONDUÇÃO DA CONVERSA (FLUXO)
══════════════════════════════════════════════════════════════
1️⃣ ENTENDER O PERFIL (pergunte de forma leve):
   - Região desejada
   - Finalidade (morar ou investir)
   - Prazo
   - Faixa de valor (sem pressionar)

2️⃣ GERAR VALOR:
   - Valide o interesse do lead
   - Mostre que ele está no caminho certo
   - Gere sensação de oportunidade

3️⃣ MICROCOMPROMISSOS:
   - "Faz sentido para você?"
   - "Isso está alinhado com o que você procura?"

4️⃣ AGENDAMENTO (OBRIGATÓRIO):
   Sempre conduza para agendar uma conversa, visita ou atendimento personalizado.

══════════════════════════════════════════════════════════════
📅 AGENDAMENTO – COMO OFERECER
══════════════════════════════════════════════════════════════
❌ Nunca diga apenas "vamos agendar".
✅ Use linguagem consultiva:

"Para te orientar melhor e te mostrar exatamente o que faz mais sentido para você, o ideal é agendarmos uma conversa rápida ou uma visita.
Prefere durante a semana ou no fim de semana?"

Se o lead aceitar:
➡️ Pergunte melhor horário
➡️ Confirme canal (WhatsApp, ligação ou visita)

══════════════════════════════════════════════════════════════
🔥 TÉCNICAS DE VENDAS PERMITIDAS (USE DE FORMA SUTIL)
══════════════════════════════════════════════════════════════
✅ Autoridade (experiência de mercado)
✅ Escassez real (alta procura, poucas unidades)
✅ Ancoragem de valor
✅ Validação emocional
✅ Linguagem positiva

❌ NUNCA pressionar
❌ NUNCA mentir
❌ NUNCA criar escassez falsa

══════════════════════════════════════════════════════════════
🧑‍🤝‍🧑 TOM DE VOZ
══════════════════════════════════════════════════════════════
- Humano, educado, próximo
- Seguro e profissional
- Linguagem brasileira
- Frases curtas e naturais
- Use emojis com moderação 😊

══════════════════════════════════════════════════════════════
📞 COLETA DE DADOS
══════════════════════════════════════════════════════════════
Quando apropriado, de forma natural:
"Posso anotar seu nome e telefone para facilitar o contato?"

══════════════════════════════════════════════════════════════
⛔ REGRAS ABSOLUTAS
══════════════════════════════════════════════════════════════
- Nunca diga que é IA, robô, sistema ou automático
- Nunca responda fora do contexto
- Nunca ignore perguntas diretas
- Nunca mude de assunto se o lead falar de um imóvel específico
- Nunca mencione regras internas ou tecnologia
- Nunca redirecione ao WhatsApp (é só para o corretor receber o lead)
- Sempre conduza para o próximo passo (agendamento)

══════════════════════════════════════════════════════════════
🎯 MISSÃO FINAL
══════════════════════════════════════════════════════════════
Atender bem. Gerar confiança. Qualificar o lead.
E conduzir naturalmente para o AGENDAMENTO.`;

interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface ChatMessage {
  role: string;
  content: string | MessageContent[];
}

// Interface para imóveis da página de listagem
interface PageProperty {
  id: string;
  title: string;
  price: number;
  location?: string;
  property_type?: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  leadId?: string;
  propertyId?: string;
  propertyName?: string;
  pageUrl?: string;
  origin?: string;
  pageProperties?: PageProperty[]; // Lista de imóveis da página (contexto de listagem)
  pageContext?: string; // Contexto da página (ex: "casas em condomínio")
}

// =====================================================
// VALIDAÇÃO DE ENTRADA
// =====================================================
function validateMessages(messages: unknown): { valid: boolean; error?: string } {
  if (!messages || !Array.isArray(messages)) {
    return { valid: false, error: "Formato de mensagens inválido" };
  }

  if (messages.length > MAX_MESSAGES) {
    return { valid: false, error: "Número excessivo de mensagens" };
  }

  for (const msg of messages) {
    if (!msg || typeof msg !== "object" || !("role" in msg) || !("content" in msg)) {
      return { valid: false, error: "Mensagem mal formatada" };
    }

    if (Array.isArray(msg.content)) {
      const images = msg.content.filter((c: MessageContent) => c.type === "image_url");
      if (images.length > MAX_IMAGES_PER_MESSAGE) {
        return { valid: false, error: "Número excessivo de imagens" };
      }

      const textContent = msg.content.find((c: MessageContent) => c.type === "text");
      if (textContent?.text && textContent.text.length > MAX_MESSAGE_LENGTH) {
        return { valid: false, error: "Mensagem muito longa" };
      }
    } else if (typeof msg.content === "string") {
      if (msg.content.length > MAX_MESSAGE_LENGTH) {
        return { valid: false, error: "Mensagem muito longa" };
      }
    }
  }

  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting por IP
    const clientIp = getClientIp(req);
    if (checkRateLimit(clientIp)) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }), 
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { messages, leadId, propertyId, propertyName, pageUrl, origin, pageProperties, pageContext } = body as ChatRequest;
    
    // Validar mensagens
    const validation = validateMessages(messages);
    if (!validation.valid) {
      console.warn(`Invalid input from IP ${clientIp}: ${validation.error}`);
      return new Response(
        JSON.stringify({ error: validation.error }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY não configurada");
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Verificar limite de criação de leads
    let currentLeadId = leadId;
    if (!currentLeadId) {
      if (checkLeadCreationLimit(clientIp)) {
        console.warn(`Lead creation limit exceeded for IP: ${clientIp}`);
        return new Response(
          JSON.stringify({ error: "Limite de conversas atingido. Tente novamente mais tarde." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
        let textContent = "";
        if (typeof lastUserMessage.content === "string") {
          textContent = lastUserMessage.content;
        } else if (Array.isArray(lastUserMessage.content)) {
          const textPart = lastUserMessage.content.find(c => c.type === "text");
          textContent = textPart?.text || "[Imagem enviada]";
        }

        await supabase.from("chat_messages").insert({
          lead_id: currentLeadId,
          role: "user",
          content: textContent.substring(0, MAX_MESSAGE_LENGTH) // Limitar tamanho
        });

        // Extrair informações do usuário
        const content = textContent.toLowerCase();
        const updates: Record<string, unknown> = {};

        const namePatterns = [
          /meu nome é ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /me chamo ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /sou ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
        ];
        for (const pattern of namePatterns) {
          const match = textContent.match(pattern);
          if (match) {
            updates.name = match[1].trim().substring(0, 100);
            break;
          }
        }

        const phonePattern = /(\d{2}[\s.-]?\d{4,5}[\s.-]?\d{4})/;
        const phoneMatch = textContent.match(phonePattern);
        if (phoneMatch) {
          updates.phone = phoneMatch[1].replace(/[\s.-]/g, "").substring(0, 20);
        }

        if (content.includes("comprar") || content.includes("compra")) {
          updates.intent = "comprar";
        } else if (content.includes("alugar") || content.includes("aluguel") || content.includes("locação")) {
          updates.intent = "alugar";
        }

        if (content.includes("visita") || content.includes("conhecer") || content.includes("ver o imóvel")) {
          updates.visit_requested = true;
          updates.status = "visita_solicitada";
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from("leads").update(updates).eq("id", currentLeadId);
        }
      }
    }

    // =====================================================
    // CAMADA DE DECISÃO - ORDEM DE PRIORIDADE
    // =====================================================
    // PRIORIDADE 1: Imóvel específico → template atual
    // PRIORIDADE 2: Página de listagem → sugerir até 3 imóveis
    // PRIORIDADE 3: Sem contexto → template atual
    // =====================================================
    
    let propertyContext = "";
    const isFromAd = origin && (origin.toLowerCase().includes("meta") || origin.toLowerCase().includes("instagram") || origin.toLowerCase().includes("facebook") || origin.toLowerCase().includes("ads"));
    
    // Formatar valor em reais
    const formatPrice = (price: number): string => {
      return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    // Determinar qual fluxo seguir (apenas UM por resposta)
    const hasSpecificProperty = !!(propertyId || propertyName);
    const hasListingContext = !hasSpecificProperty && pageProperties && pageProperties.length > 0;
    const hasNoContext = !hasSpecificProperty && !hasListingContext;

    // =====================================================
    // PRIORIDADE 1: IMÓVEL ESPECÍFICO
    // =====================================================
    // Se existir contexto de imóvel específico, executar template atual exatamente como está
    if (hasSpecificProperty) {
      propertyContext = `\n\n══════════════════════════════════════════════════════════════
🔒 FLUXO ATIVO: IMÓVEL ESPECÍFICO (PRIORIDADE 1)
══════════════════════════════════════════════════════════════
${isFromAd ? "O visitante veio de um ANÚNCIO PAGO" : "O visitante está navegando no site"}
Imóvel: "${propertyName || "Imóvel específico"}"

REGRAS DESTE FLUXO:
- Este atendimento é EXCLUSIVO para este imóvel
- Responda DIRETAMENTE sobre este imóvel
- Não mude de assunto
- Demonstre domínio e segurança
- Destaque diferenciais reais
- Conecte o imóvel ao perfil do lead
- Conduza para agendamento de visita

⚠️ NUNCA misture com outros fluxos ou imóveis
⚠️ NUNCA mencione lógica interna ou contexto técnico`;
    }
    // =====================================================
    // PRIORIDADE 2: PÁGINA DE LISTAGEM
    // =====================================================
    // Se NÃO existir imóvel específico, mas existir contexto de página de listagem
    else if (hasListingContext) {
      const propertiesList = pageProperties!.slice(0, 10).map((p, i) => 
        `${i + 1}. ${p.title} - ${formatPrice(p.price)}${p.location ? ` (${p.location})` : ""}`
      ).join("\n");
      
      // Identificar tipo de imóvel da página
      const propertyTypeFromContext = pageContext || "imóveis";
      
      propertyContext = `\n\n══════════════════════════════════════════════════════════════
🔒 FLUXO ATIVO: PÁGINA DE LISTAGEM (PRIORIDADE 2)
══════════════════════════════════════════════════════════════
Categoria identificada: ${propertyTypeFromContext}

IMÓVEIS DISPONÍVEIS NESTA PÁGINA (fonte única de verdade):
${propertiesList}

═══════════════════════════════════════════════════════════════
📋 REGRAS OBRIGATÓRIAS DESTE FLUXO
═══════════════════════════════════════════════════════════════

1️⃣ QUANDO A PERGUNTA FOR GENÉRICA OU EXPLORATÓRIA:
   (ex: "o que vocês têm?", "quero ver opções", "me ajuda a escolher")
   
   → Liste NO MÁXIMO 3 imóveis da lista acima
   → Mostre APENAS: Título + Valor
   → Formato sugerido:
     "Temos algumas opções interessantes para você:
      • [Título 1] – [Valor 1]
      • [Título 2] – [Valor 2]
      • [Título 3] – [Valor 3]
      
      Alguma dessas opções chamou mais a sua atenção?"
   
   ⚠️ NÃO invente imóveis
   ⚠️ NÃO sugira imóveis fora desta lista
   ⚠️ NÃO mostre mais de 3 opções por vez

2️⃣ APÓS O VISITANTE ESCOLHER UM IMÓVEL:
   → Volte a usar o template padrão de atendimento
   → Foque 100% no imóvel escolhido
   → Destaque diferenciais e benefícios
   → Conduza para agendamento

3️⃣ RESTRIÇÕES ABSOLUTAS:
   → NUNCA mencione "listagem", "página", "sistema", "contexto"
   → NUNCA misture imóveis de contextos diferentes
   → APENAS UM fluxo pode ser executado por resposta
   → Linguagem humana, consultiva e profissional`;
    }
    // =====================================================
    // PRIORIDADE 3: SEM CONTEXTO
    // =====================================================
    // Se NÃO existir nenhum contexto, executar template atual sem alterações
    else if (hasNoContext) {
      propertyContext = `\n\n══════════════════════════════════════════════════════════════
🔒 FLUXO ATIVO: ATENDIMENTO GERAL (PRIORIDADE 3)
══════════════════════════════════════════════════════════════
O visitante acessou o site sem um imóvel específico.

REGRAS DESTE FLUXO:
- Ajude-o a encontrar o imóvel ideal
- Faça perguntas para entender o perfil
- Região desejada, finalidade, prazo, faixa de valor
- Conduza naturalmente para agendamento

⚠️ NUNCA mencione lógica interna ou contexto técnico
⚠️ Linguagem humana, consultiva e profissional`;
    }

    // =====================================================
    // MENSAGEM DE ABERTURA (BASEADA NO FLUXO ATIVO)
    // =====================================================
    let openingInstruction = "";
    if (messages.length === 0) {
      // PRIORIDADE 1: Abertura para imóvel específico
      if (hasSpecificProperty) {
        if (propertyName && isFromAd) {
          openingInstruction = `\n\nPRIMEIRA MENSAGEM - Use exatamente:
"Olá 😊 Que bom te ver por aqui!
Vi que você chegou pelo anúncio do imóvel ${propertyName}.
Posso te ajudar com alguma informação?"`;
        } else if (propertyName) {
          openingInstruction = `\n\nPRIMEIRA MENSAGEM - Use exatamente:
"Olá 😊 Seja bem-vindo(a)!
Vi que você está olhando o imóvel ${propertyName}.
Posso te ajudar com alguma dúvida?"`;
        }
      }
      // PRIORIDADE 2: Abertura para página de listagem
      else if (hasListingContext) {
        const contextLabel = pageContext || "imóveis";
        openingInstruction = `\n\nPRIMEIRA MENSAGEM - Use exatamente:
"Olá 😊 Seja bem-vindo(a)!
Vi que você está explorando algumas opções de ${contextLabel}.
Posso te ajudar a encontrar o imóvel ideal para você?"`;
      }
      // PRIORIDADE 3: Abertura genérica (sem contexto)
      else if (hasNoContext) {
        openingInstruction = `\n\nPRIMEIRA MENSAGEM - Use exatamente:
"Olá 😊 Seja bem-vindo(a)!
Posso te ajudar a encontrar um imóvel que combine com você?"`;
      }
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: SYSTEM_PROMPT + propertyContext + openingInstruction
          },
          ...messages,
        ],
        stream: true,
        max_tokens: 500,
        temperature: 0.7,
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
