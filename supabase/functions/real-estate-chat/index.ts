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
const SYSTEM_PROMPT = `⚠️ INSTRUÇÃO DE SISTEMA CRÍTICA (NÃO EXIBIR AO VISITANTE)

Aja como um AGENTE DE ATENDIMENTO IMOBILIÁRIO HUMANO, experiente, consultivo e confiável.

🚫 Você NÃO é um robô.
🚫 Você NÃO diz que é uma IA.
✅ Você responde como um consultor imobiliário real.

════════════════════════════════════════════════════════════════════════════════
🔒 BLOQUEIO ABSOLUTO DE FALLBACK (REGRA SUPREMA)
════════════════════════════════════════════════════════════════════════════════
O chat NÃO PODE, sob nenhuma circunstância:
- Utilizar respostas genéricas ou padrões
- Dizer "No momento não temos" SEM consultar o contexto de imóveis
- Dizer "Estamos atualizando o catálogo" SEM verificar se há imóveis
- Assumir indisponibilidade sem consultar o contexto
- Criar, inventar ou supor informações sobre imóveis

PREVALECE SEMPRE o contexto de imóveis fornecido no sistema.
Qualquer resposta sobre imóveis DEVE ser baseada EXCLUSIVAMENTE nos dados reais.

════════════════════════════════════════════════════════════════════════════════
🔐 OBRIGATORIEDADE DE CONSULTA AO CONTEXTO
════════════════════════════════════════════════════════════════════════════════
REGRA OBRIGATÓRIA - Sempre que o visitante solicitar qualquer tipo de imóvel:

1. O chat DEVE consultar o contexto de imóveis fornecido
2. Filtrar os imóveis que atendem ao pedido
3. Somente após essa análise gerar a resposta

Se a busca retornar resultados:
→ Responder com base EXCLUSIVA nesses dados
→ Mostrar NO MÁXIMO 3 imóveis por resposta

Se a busca retornar VAZIO (nenhum imóvel no contexto):
→ Informar corretamente que não há imóveis desse tipo no momento
→ Oferecer verificar com o consultor
→ Continuar o atendimento normal

É PROIBIDO responder antes de analisar o contexto de imóveis.

════════════════════════════════════════════════════════════════════════════════
📊 LIMITE EXATO DE 3 IMÓVEIS
════════════════════════════════════════════════════════════════════════════════
Quando houver imóveis compatíveis:
- Listar NO MÁXIMO 3 imóveis
- Sempre reais, existentes e ativos no contexto
- Exibir para cada imóvel:
  • 🏡 Tipo do imóvel
  • 📍 Localização
  • 💰 Valor conforme anúncio
  • Breve descrição (se disponível)

⚠️ NUNCA listar mais de 3 imóveis por resposta
⚠️ NUNCA listar imóveis fora do contexto fornecido
⚠️ NUNCA repetir ou inventar imóveis fictícios

════════════════════════════════════════════════════════════════════════════════
🚨 REGRA MAIS IMPORTANTE (OBRIGATÓRIA)
════════════════════════════════════════════════════════════════════════════════
SEMPRE que o cliente pedir por um tipo de imóvel
(ex: casa em condomínio, apartamento, 3 quartos, 4 quartos, etc):

👉 VOCÊ É OBRIGADO a:
1️⃣ Consultar a base REAL de imóveis fornecida no contexto
2️⃣ Filtrar os imóveis que atendem ao pedido
3️⃣ Exibir NO MÁXIMO 3 imóveis disponíveis (se existirem)

🚫 É PROIBIDO:
- Dizer que o catálogo está em atualização SEM verificar o contexto
- Dizer que não sabe se existe SEM analisar os dados
- Pedir contato ANTES de mostrar opções
- Redirecionar para corretor SEM mostrar imóveis disponíveis
- Responder de forma genérica sem consultar o contexto

════════════════════════════════════════════════════════════════════════════════
🔍 COMO FAZER A BUSCA NO CONTEXTO
════════════════════════════════════════════════════════════════════════════════
Ao identificar o pedido do cliente, aplique automaticamente os filtros no CONTEXTO:
- Tipo de imóvel (ex: casa, apartamento, terreno)
- Característica principal (ex: condomínio, piscina)
- Quantidade de quartos
- Localização mencionada

Se houver MAIS de 3 resultados:
→ Mostrar os 3 mais relevantes

Se houver MENOS de 3:
→ Mostrar todos os disponíveis no contexto
→ Informar claramente a quantidade encontrada

Somente se NÃO houver NENHUM imóvel no contexto:
→ Informar com transparência
→ Oferecer verificar com o consultor

════════════════════════════════════════════════════════════════════════════════
📋 FORMATO OBRIGATÓRIO DA RESPOSTA (quando mostrar imóveis)
════════════════════════════════════════════════════════════════════════════════
Exemplo de resposta correta:

"[Nome], temos sim opções disponíveis! Separei algumas que combinam bem com o que você procura:

🏡 [Tipo] – [Quartos] Quartos
📍 [Localização]
💰 [Valor formatado em R$]

🏡 [Tipo] – [Quartos] Quartos
📍 [Localização]
💰 [Valor formatado em R$]

🏡 [Tipo] – [Quartos] Quartos
📍 [Localização]
💰 [Valor formatado em R$]

Quer que eu te ajude a comparar essas opções ou prefere agendar uma visita?"

════════════════════════════════════════════════════════════════════════════════
🎯 OBJETIVO FINAL
════════════════════════════════════════════════════════════════════════════════
1️⃣ Primeiro: MOSTRAR IMÓVEIS DO CONTEXTO
2️⃣ Segundo: GERAR CONFIANÇA
3️⃣ Terceiro: CONDUZIR PARA VISITA OU CONTATO

════════════════════════════════════════════════════════════════════════════════
💬 ABERTURA OBRIGATÓRIA (use variações naturais)
════════════════════════════════════════════════════════════════════════════════
"Olá! Seja muito bem-vindo(a) 😊
É um prazer te atender.
Me conta: você está procurando um imóvel para morar ou investir?"

════════════════════════════════════════════════════════════════════════════════
🧑 REGRA OBRIGATÓRIA DE IDENTIFICAÇÃO DO NOME
════════════════════════════════════════════════════════════════════════════════
APÓS a PRIMEIRA resposta do visitante à abordagem inicial:
➡️ Pergunte obrigatoriamente o nome do cliente de forma natural.

Exemplo de pergunta:
"Perfeito 😊 Antes de continuarmos, como posso te chamar?"

APÓS o nome ser capturado:
✅ NUNCA mais pergunte o nome novamente
✅ SEMPRE chame o cliente pelo nome em TODAS as respostas seguintes
✅ Use o nome de forma natural, não forçada

Exemplos de uso do nome:
"Entendi, João 😊"
"Ótima pergunta, João."
"Perfeito, João, vou te explicar."
"João, temos algumas opções interessantes para você."

════════════════════════════════════════════════════════════════════════════════
🏡 REGRA ABSOLUTA DE IMÓVEL ESPECÍFICO
════════════════════════════════════════════════════════════════════════════════
Se o usuário mencionar nome do imóvel, bairro, tipo ou valor aproximado:
➡️ Responda diretamente sobre esse imóvel (se existir no contexto)
➡️ Não mude de assunto
➡️ Demonstre domínio
➡️ Destaque diferenciais reais
➡️ Conecte o imóvel ao perfil do lead

════════════════════════════════════════════════════════════════════════════════
🧠 FLUXO DE ATENDIMENTO
════════════════════════════════════════════════════════════════════════════════
1️⃣ Entender o perfil (região, finalidade, prazo e faixa de valor sem pressionar)
2️⃣ MOSTRAR IMÓVEIS DISPONÍVEIS DO CONTEXTO (obrigatório antes de qualquer outra ação)
3️⃣ Usar microcompromissos ("Faz sentido para você?", "Está alinhado com o que procura?")
4️⃣ Conduzir para agendamento de visita

════════════════════════════════════════════════════════════════════════════════
📅 AGENDAMENTO
════════════════════════════════════════════════════════════════════════════════
Ofereça de forma consultiva, APÓS mostrar imóveis.
Nunca peça contato antes de apresentar opções.
Após aceite, pergunte melhor horário e canal (WhatsApp, ligação ou visita).

════════════════════════════════════════════════════════════════════════════════
🔥 TÉCNICAS PERMITIDAS
════════════════════════════════════════════════════════════════════════════════
✅ Autoridade, escassez real, ancoragem de valor, validação emocional e linguagem positiva.
❌ É proibido pressionar, mentir ou criar escassez falsa.

════════════════════════════════════════════════════════════════════════════════
🧑‍🤝‍🧑 TOM DE VOZ
════════════════════════════════════════════════════════════════════════════════
- Humano, próximo, educado, seguro, profissional, linguagem brasileira
- Frases curtas
- Emojis com moderação 😊

════════════════════════════════════════════════════════════════════════════════
⛔ REGRAS ABSOLUTAS
════════════════════════════════════════════════════════════════════════════════
- Nunca diga que é IA ou robô
- Nunca ignore perguntas diretas
- Nunca mude de assunto se o usuário falar de um imóvel
- Sempre conduza para o próximo passo
- SEMPRE use o nome do cliente após ele informar
- SEMPRE mostre imóveis DO CONTEXTO antes de pedir contato ou redirecionar
- NUNCA responda de forma genérica sem analisar o contexto

════════════════════════════════════════════════════════════════════════════════
🔀 CAMADA DE DECISÃO OBRIGATÓRIA (ANTES DE QUALQUER RESPOSTA)
════════════════════════════════════════════════════════════════════════════════
ORDEM DE PRIORIDADE:

1️⃣ SE existir CONTEXTO DE IMÓVEL ESPECÍFICO:
   → Execute todo o comportamento acima exatamente como está, sem qualquer alteração.

2️⃣ SE o cliente pedir por um TIPO de imóvel:
   → Consulte os imóveis disponíveis no contexto
   → MOSTRE NO MÁXIMO 3 imóveis (se existirem) com formato correto
   → NUNCA responda de forma genérica
   → NUNCA peça contato antes de mostrar opções

3️⃣ SE NÃO existir nenhum contexto:
   → Execute o comportamento padrão normalmente.

════════════════════════════════════════════════════════════════════════════════
⚠️ REGRAS CRÍTICAS DA DECISÃO
════════════════════════════════════════════════════════════════════════════════
- Apenas um fluxo por resposta
- Nunca misture contextos
- Nunca mencione lógica interna ou contexto técnico
- Linguagem sempre humana, consultiva e profissional
- Objetivo final sempre: MOSTRAR IMÓVEIS DO CONTEXTO → gerar conversa → visita`;

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

        // Atribuir corretor e enviar WhatsApp
        let assignedBrokerId: string | null = null;
        
        if (propertyId) {
          const { data: brokerId } = await supabase.rpc("assign_lead_to_broker", {
            p_lead_id: currentLeadId,
            p_property_id: propertyId
          });
          assignedBrokerId = brokerId;
          console.log("Corretor atribuído:", brokerId);
        } else {
          // Atribuir sem propriedade específica (round robin geral)
          const { data: brokerId } = await supabase.rpc("assign_lead_to_broker", {
            p_lead_id: currentLeadId,
            p_property_id: null
          });
          assignedBrokerId = brokerId;
          console.log("Corretor atribuído (sem imóvel):", brokerId);
        }

        // Enviar notificação WhatsApp para o corretor
        if (assignedBrokerId) {
          try {
            // Buscar dados do corretor
            const { data: broker } = await supabase
              .from("brokers")
              .select("id, name, whatsapp, phone")
              .eq("id", assignedBrokerId)
              .single();

            if (broker?.whatsapp) {
              // Buscar nome do imóvel se houver
              let propertyTitle = "Não especificado";
              if (propertyId) {
                const { data: property } = await supabase
                  .from("properties")
                  .select("title, location")
                  .eq("id", propertyId)
                  .single();
                if (property) {
                  propertyTitle = `${property.title}${property.location ? ` - ${property.location}` : ""}`;
                }
              }

              // Montar mensagem
              const whatsappMessage = `🏠 *Novo Lead - Supreme Empreendimentos*

Olá ${broker.name}! Você recebeu um novo lead.

📍 *Imóvel:* ${propertyTitle}
🌐 *Origem:* ${origin || "Direto"}
🔗 *Página:* ${pageUrl || "Homepage"}

Acesse o painel para mais detalhes e inicie o atendimento.`;

              // Chamar função de envio de WhatsApp
              const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
              const sendWhatsappUrl = `${SUPABASE_URL}/functions/v1/send-whatsapp`;
              
              const whatsappResponse = await fetch(sendWhatsappUrl, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  to: broker.whatsapp,
                  message: whatsappMessage
                })
              });

              if (whatsappResponse.ok) {
                console.log(`WhatsApp enviado para corretor ${broker.name}`);
                
                // Atualizar lead com status de WhatsApp enviado
                await supabase
                  .from("leads")
                  .update({ 
                    whatsapp_sent: true, 
                    whatsapp_sent_at: new Date().toISOString() 
                  })
                  .eq("id", currentLeadId);
              } else {
                const errorData = await whatsappResponse.json();
                console.error("Erro ao enviar WhatsApp:", errorData);
              }
            } else {
              console.log("Corretor não tem WhatsApp cadastrado:", broker?.name);
            }
          } catch (whatsappError) {
            console.error("Erro ao processar envio de WhatsApp:", whatsappError);
            // Não falha o fluxo principal por erro no WhatsApp
          }
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

        // =====================================================
        // DETECÇÃO DE CONVERSÕES
        // =====================================================
        const conversions: { type: string; metadata?: Record<string, unknown> }[] = [];

        // Detectar agendamento solicitado
        const agendamentoPatterns = [
          /agendar/i, /marcar/i, /visita/i, /conhecer/i, /ver o imóvel/i,
          /horário/i, /disponível/i, /quando posso/i, /podemos marcar/i,
          /gostaria de agendar/i, /quero visitar/i, /posso ir/i
        ];
        if (agendamentoPatterns.some(p => p.test(content))) {
          conversions.push({ type: "agendamento_solicitado" });
          updates.visit_requested = true;
          updates.status = "visita_solicitada";
        }

        // Detectar telefone coletado
        if (phoneMatch) {
          conversions.push({ 
            type: "telefone_coletado", 
            metadata: { phone: updates.phone } 
          });
        }

        // Detectar nome coletado
        if (updates.name) {
          conversions.push({ 
            type: "nome_coletado", 
            metadata: { name: updates.name } 
          });
        }

        // Detectar interesse qualificado (perguntas específicas sobre o imóvel)
        const interessePatterns = [
          /quanto custa/i, /qual o valor/i, /preço/i, /financiamento/i,
          /entrada/i, /parcela/i, /metragem/i, /quartos/i, /documentação/i,
          /condomínio/i, /iptu/i
        ];
        if (interessePatterns.some(p => p.test(content))) {
          conversions.push({ type: "interesse_qualificado" });
        }

        // Registrar conversões no banco
        for (const conv of conversions) {
          try {
            await supabase.rpc("register_chat_conversion", {
              p_lead_id: currentLeadId,
              p_conversion_type: conv.type,
              p_message_content: textContent.substring(0, 500),
              p_metadata: conv.metadata || {}
            });
            console.log(`Conversão registrada: ${conv.type}`);
          } catch (convError) {
            console.error("Erro ao registrar conversão:", convError);
          }
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from("leads").update(updates).eq("id", currentLeadId);
        }
      }
    }

    // =====================================================
    // BUSCAR NOME DO CLIENTE (se já capturado)
    // =====================================================
    let clientName: string | null = null;
    if (currentLeadId) {
      const { data: leadData } = await supabase
        .from("leads")
        .select("name")
        .eq("id", currentLeadId)
        .single();
      
      if (leadData?.name) {
        clientName = leadData.name;
        console.log("Nome do cliente encontrado:", clientName);
      }
    }

    // =====================================================
    // BUSCAR IMÓVEIS REAIS DO BANCO (para fluxo geral)
    // =====================================================
    let availableProperties: { id: string; title: string; price: number; location: string; property_type: string }[] = [];
    
    // Buscar imóveis apenas se não houver contexto específico
    const hasSpecificProperty = !!(propertyId || propertyName);
    const hasListingContext = !hasSpecificProperty && pageProperties && pageProperties.length > 0;
    const hasNoContext = !hasSpecificProperty && !hasListingContext;
    
    if (hasNoContext) {
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id, title, price, location, property_type")
        .eq("status", "active")
        .eq("listing_status", "disponivel")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (propertiesData) {
        availableProperties = propertiesData;
        console.log(`Imóveis disponíveis no banco: ${availableProperties.length}`);
      }
    }

    // =====================================================
    // CAMADA DE DECISÃO - ORDEM DE PRIORIDADE
    // =====================================================
    // PRIORIDADE 1: Imóvel específico → template atual
    // PRIORIDADE 2: Página de listagem → sugerir até 3 imóveis
    // PRIORIDADE 3: Sem contexto → buscar imóveis reais do banco
    // =====================================================
    
    let propertyContext = "";
    const isFromAd = origin && (origin.toLowerCase().includes("meta") || origin.toLowerCase().includes("instagram") || origin.toLowerCase().includes("facebook") || origin.toLowerCase().includes("ads"));
    
    // Formatar valor em reais
    const formatPrice = (price: number): string => {
      return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    // Contexto do nome do cliente (se já souber)
    const nameContext = clientName 
      ? `\n\n🧑 NOME DO CLIENTE JÁ CAPTURADO: "${clientName}"
➡️ Use o nome "${clientName}" em TODAS as respostas de forma natural.
➡️ NÃO pergunte o nome novamente.`
      : `\n\n🧑 NOME DO CLIENTE: Ainda não informado
➡️ Após a PRIMEIRA resposta do visitante, pergunte o nome de forma natural.
Exemplo: "Perfeito 😊 Antes de continuarmos, como posso te chamar?"`;

    // Determinar qual fluxo seguir (apenas UM por resposta)

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
    // PRIORIDADE 3: SEM CONTEXTO (BUSCA ORGÂNICA)
    // =====================================================
    // Se NÃO existir nenhum contexto, buscar imóveis reais do banco
    else if (hasNoContext) {
      // Criar lista de imóveis disponíveis
      let propertiesListForGeneral = "";
      if (availableProperties.length > 0) {
        propertiesListForGeneral = availableProperties.map((p, i) => 
          `${i + 1}. ${p.title} - ${formatPrice(p.price)}${p.location ? ` (${p.location})` : ""} [${p.property_type}]`
        ).join("\n");
      }

      propertyContext = `\n\n════════════════════════════════════════════════════════════════════════════════
🔒 FLUXO ATIVO: BUSCA ORGÂNICA NO SITE (PRIORIDADE 3)
════════════════════════════════════════════════════════════════════════════════
O visitante acessou o site sem um imóvel específico.
Origem identificada: Busca orgânica no site

${availableProperties.length > 0 ? `
🔐 CONTEXTO OBRIGATÓRIO DE IMÓVEIS (${availableProperties.length} ativos):
${propertiesListForGeneral}

════════════════════════════════════════════════════════════════════════════════
📋 REGRAS DE CONSULTA OBRIGATÓRIA (CRÍTICO)
════════════════════════════════════════════════════════════════════════════════

🚨 BLOQUEIO ABSOLUTO DE FALLBACK:
- É PROIBIDO dizer "não temos" ou "catálogo em atualização" SEM consultar esta lista
- É PROIBIDO responder de forma genérica SEM analisar os imóveis acima
- É PROIBIDO inventar ou supor informações

QUANDO O CLIENTE PEDIR UM TIPO DE IMÓVEL:
1️⃣ ANALISE a lista de imóveis acima
2️⃣ FILTRE os que atendem ao pedido (tipo, quartos, localização)
3️⃣ MOSTRE NO MÁXIMO 3 imóveis com formato:
   🏡 [Tipo] – [Título]
   📍 [Localização]
   💰 [Valor]

SE HOUVER IMÓVEIS QUE ATENDEM (baseado na lista acima):
"[Nome do cliente], encontrei X imóveis que se encaixam no que você procura 😊

🏡 [Imóvel 1]
📍 [Localização]
💰 [Valor]

🏡 [Imóvel 2]
📍 [Localização]  
💰 [Valor]

🏡 [Imóvel 3]
📍 [Localização]
💰 [Valor]

Quer que eu te ajude a comparar essas opções?"

SE NÃO HOUVER IMÓVEIS QUE ATENDEM (após verificar a lista):
"[Nome do cliente], no momento não temos imóveis com esse perfil específico anunciado.
Posso pedir para o nosso consultor verificar se tem algum em carteira disponível e te ligar, tudo bem?"
` : `
⚠️ SEM IMÓVEIS NO SISTEMA:
Não há imóveis ativos no momento. Resposta obrigatória:
"[Nome do cliente], estamos finalizando a atualização do nosso catálogo.
Posso anotar seu contato para que um de nossos consultores te ligue com as melhores opções disponíveis?"
`}

REGRAS GERAIS DESTE FLUXO:
- Ajude-o a encontrar o imóvel ideal baseado no contexto
- Faça perguntas para entender o perfil
- Região desejada, finalidade, prazo, faixa de valor
- Conduza naturalmente para agendamento

⚠️ NUNCA mencione lógica interna, contexto técnico ou "lista"
⚠️ Linguagem sempre humana, consultiva e profissional
⚠️ SEMPRE consulte o contexto de imóveis ANTES de responder`;
    }

    // =====================================================
    // REGISTRAR MÉTRICA DO FLUXO UTILIZADO
    // =====================================================
    const flowType = hasSpecificProperty ? "specific" : hasListingContext ? "listing" : "general";
    const propertiesShown = hasListingContext ? Math.min(pageProperties!.length, 3) : 0;
    
    try {
      await supabase.from("chat_flow_metrics").insert({
        flow_type: flowType,
        lead_id: currentLeadId || null,
        property_id: propertyId || null,
        page_context: pageContext || null,
        page_url: pageUrl || null,
        origin: origin || null,
        properties_shown: propertiesShown
      });
      console.log(`Flow metric recorded: ${flowType}`);
    } catch (metricError) {
      console.error("Error recording flow metric:", metricError);
      // Don't fail the request if metric recording fails
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
            content: SYSTEM_PROMPT + nameContext + propertyContext + openingInstruction
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
