import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =====================================================
// RATE LIMITING E VALIDAÇÃO
// =====================================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const leadCreationMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_LEADS_PER_IP = 10;
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
// SYSTEM PROMPT - RESET TOTAL - TEMPLATE LIMPO
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
- Seja caloroso mas objetivo, sem texto excessivo

ETAPA 2 - CONEXÃO + AUTORIDADE (após saber o nome):
- "Prazer, {nome}! Eu vou te ajudar a encontrar as melhores oportunidades dentro do que você busca 👌"
- Use o nome do cliente em TODA resposta subsequente

ETAPA 3 - QUALIFICAÇÃO INTELIGENTE:
- "Me conta uma coisa, {nome}... Você está buscando mais pra morar ou investir?"
- "E qual tipo você prefere? Casa, apartamento, terreno...?"
- "Tem alguma faixa de valor que você quer respeitar?"
- "Qual região de Goiânia te interessa mais?"
- Faça UMA ou DUAS perguntas por mensagem, nunca todas de uma vez

ETAPA 4 - CONFIRMAÇÃO ESPELHO:
- "Perfeito, então você busca um: 👉 {tipo} 👉 Até {valor} 👉 Em {região} 👉 Com foco em {objetivo}. Certo?"
- Confirme o perfil antes de apresentar imóveis

ETAPA 5 - APRESENTAÇÃO ALTO PADRÃO:
- "Dentro desse perfil, {nome}, eu tenho uma opção que faz MUITO sentido pra você."
- "É um projeto pensado exatamente pra quem busca {benefício}."
- "O que mais chama atenção nele é {diferencial}."
- Apresente NO MÁXIMO 3 imóveis do contexto fornecido
- NUNCA inventar imóveis

ETAPA 6 - GATILHO DE ESCASSEZ (sutil):
- "Esse tipo de unidade costuma ter uma saída muito rápida, principalmente por investidores."
- "Hoje é um dos perfis mais procurados."
- Use com naturalidade, sem parecer forçado

ETAPA 7 - TRANSIÇÃO PARA VISITA:
- "{nome}, esse tipo de imóvel você só entende o potencial mesmo vendo pessoalmente."
- "Eu posso te mostrar ele com mais detalhes e também outras opções dentro desse perfil."

ETAPA 8 - FECHAMENTO GUIADO:
- "Você prefere ver isso durante a semana ou no final de semana?"
- NUNCA pergunte "quer ver?" - conduza a decisão

ETAPA 9 - HORÁRIO:
- "Perfeito. Qual horário fica melhor pra você?"

ETAPA 10 - CONFIRMAÇÃO DE AGENDAMENTO:
- "Fechado então, {nome} 👌 Te coloquei para {dia} às {horário}."
- Se ainda não tem telefone: "Me passa seu telefone com DDD pra eu confirmar o agendamento?"
- Após confirmar: "Seu agendamento já está confirmado e o corretor responsável vai te chamar no WhatsApp com todos os detalhes 🙌"
- Inclua [VISITA_AGENDADA] na resposta quando o agendamento for confirmado

═══════════════════════════════════════════════════════════
📱 CAPTURA DE TELEFONE
═══════════════════════════════════════════════════════════
- Pedir telefone na PRIMEIRA mensagem junto com o nome, de forma natural
- Se não deu, continuar atendendo normalmente
- Pedir novamente quando for agendar a visita
- Pedir no máximo 2 vezes no total
- NUNCA bloquear a conversa esperando dados

═══════════════════════════════════════════════════════════
💎 LINGUAGEM ALTO PADRÃO GOIÂNIA
═══════════════════════════════════════════════════════════

SEMPRE usar:
- Exclusivo, Privativo, Região valorizada, Alto potencial de valorização
- Condições diferenciadas, Oportunidade estratégica, Selecionado
- Faz muito sentido pro seu objetivo, Você está no timing certo

NUNCA usar:
- Promoção, Barato, Desconto agressivo, Oferta imperdível
- Pechincha, Popular, Simples, Modesto

Regiões nobres: Jardins, Alphaville, Aldeia do Vale, Portal do Sol, Setor Bueno, Setor Marista, etc.

═══════════════════════════════════════════════════════════
📊 FUNIL DE QUALIFICAÇÃO
═══════════════════════════════════════════════════════════

Classifique mentalmente:
🟢 Alto padrão (acima de 2 milhões)
🔵 Médio padrão (800k a 2 milhões)
🟡 Econômico (até 800k)
🟣 Investidor
🟠 Avaliação de imóvel

═══════════════════════════════════════════════════════════
📊 REGRA DE LISTAGEM DE IMÓVEIS
═══════════════════════════════════════════════════════════

QUANDO HOUVER IMÓVEIS NO CONTEXTO:
- Listar NO MÁXIMO 3 imóveis por resposta
- Sempre reais e ativos (do contexto fornecido)
- Formato:
  🏡 [Tipo] – [Título]
  📍 [Localização]
  💰 [Valor em R$]
- NUNCA inventar ou supor imóveis

═══════════════════════════════════════════════════════════
🧩 CONTORNO DE OBJEÇÃO
═══════════════════════════════════════════════════════════

Se o cliente travar ou hesitar:
- "Sem compromisso, {nome}. A ideia é só você entender melhor as oportunidades — depois você decide com calma."
- "Esse tipo de oportunidade não fica muito tempo disponível"

═══════════════════════════════════════════════════════════
🔄 ENCAMINHAMENTO PARA CORRETOR
═══════════════════════════════════════════════════════════
- Quando visita for agendada, inclua: [VISITA_AGENDADA]
- Quando cliente pedir para falar com humano: [ENCAMINHAR_CORRETOR]

═══════════════════════════════════════════════════════════
🚫 PROIBIÇÕES ABSOLUTAS
═══════════════════════════════════════════════════════════

- Usar respostas genéricas ou fallback
- Inventar ou supor imóveis
- BLOQUEAR a conversa insistindo em dados pessoais
- Repetir a mesma pergunta mais de 2 vezes
- Usar linguagem de "promoção" ou "desconto"
- Mandar link wa.me para o cliente
- Perguntar "quer ver?" — sempre CONDUZA a decisão
- NUNCA repetir a frase do cliente
- NUNCA terminar conversa sem tentar agendar visita
- Nunca use markdown, asteriscos ou formatação especial

═══════════════════════════════════════════════════════════
🎨 TOM DE VOZ
═══════════════════════════════════════════════════════════

- Seguro, objetivo, elegante, consultivo (não insistente)
- Linguagem brasileira natural e sofisticada
- Frases curtas e diretas com autoridade
- Emojis com moderação (máx 2 por mensagem)
- Transmitir confiança e exclusividade`;

interface MessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface ChatMessage {
  role: string;
  content: string | MessageContent[];
}

interface PageProperty {
  id: string;
  title: string;
  price: number;
  location?: string;
  property_type?: string;
}

interface AdContext {
  source?: string;
  campaign?: string;
  headline?: string;
  body?: string;
  sourceUrl?: string;
  sourceType?: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  leadId?: string;
  leadImobId?: string;
  propertyId?: string;
  propertyName?: string;
  pageUrl?: string;
  origin?: string;
  pageProperties?: PageProperty[];
  pageContext?: string;
  clientName?: string;
  clientPhone?: string;
  skipLeadCreation?: boolean;
  adContext?: AdContext;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

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

// Formatar valor em reais
const formatPrice = (price: number): string => {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

// =====================================================
// DETECÇÃO DE INTENÇÃO UNIFICADA (mesmo que whatsapp-ai-chat)
// =====================================================
interface DetectedIntent {
  type: 'compra' | 'aluguel' | 'agendamento' | 'avaliacao' | 'investimento' | 'duvida' | 'geral';
  isScheduling: boolean;
  isHot: boolean;
}

function detectIntent(message: string, previousMessages: ChatMessage[]): DetectedIntent {
  const lower = message.toLowerCase();
  const allText = previousMessages
    .filter(m => m.role === 'user')
    .map(m => typeof m.content === 'string' ? m.content.toLowerCase() : '')
    .join(' ') + ' ' + lower;

  const isScheduling = /\b(visitar|agendar|agenda|ver o im[oó]vel|conhecer|marcar|visita|quero ir|posso ir|quando posso|hor[aá]rio)\b/i.test(lower);

  let type: DetectedIntent['type'] = 'geral';
  if (/\b(comprar|compra|adquirir|quero um|procuro|procurando)\b/i.test(allText)) type = 'compra';
  else if (/\b(alugar|aluguel|locar|loca[çc][aã]o)\b/i.test(allText)) type = 'aluguel';
  else if (/\b(avaliar|avalia[çc][aã]o|quanto vale|valor do meu)\b/i.test(allText)) type = 'avaliacao';
  else if (/\b(investir|investimento|rentabilidade|retorno)\b/i.test(allText)) type = 'investimento';
  else if (/\b(d[uú]vida|pergunta|como funciona|pode me explicar)\b/i.test(allText)) type = 'duvida';

  if (isScheduling) type = 'agendamento';

  const isHot = isScheduling || type === 'compra' || type === 'investimento';

  return { type, isScheduling, isHot };
}

function calculateTemperatureFromIntent(messageCount: number, intent: DetectedIntent): string {
  if (intent.isHot || intent.isScheduling) return 'quente';
  if (messageCount >= 5 || intent.type === 'compra' || intent.type === 'investimento') return 'quente';
  if (messageCount >= 2) return 'morno';
  return 'frio';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = getClientIp(req);
    if (checkRateLimit(clientIp)) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Aguarde um momento." }), 
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { messages, leadId, leadImobId, propertyId, propertyName, pageUrl, origin, pageProperties, pageContext, clientName, clientPhone, skipLeadCreation, adContext, utmSource, utmMedium, utmCampaign } = body as ChatRequest;
    
    const validation = validateMessages(messages);
    if (!validation.valid) {
      console.warn(`Invalid input from IP ${clientIp}: ${validation.error}`);
      return new Response(
        JSON.stringify({ error: validation.error }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    const AI_API_KEY = LOVABLE_API_KEY || OPENAI_API_KEY;
    if (!AI_API_KEY) {
      console.error("No AI API key configured (LOVABLE_API_KEY or OPENAI_API_KEY)");
      throw new Error("No AI API key is configured");
    }
    const AI_URL = LOVABLE_API_KEY 
      ? "https://ai.gateway.lovable.dev/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const AI_MODEL = LOVABLE_API_KEY ? "google/gemini-2.5-flash" : "gpt-4o";
    console.log(`[real-estate-chat] Using AI: ${LOVABLE_API_KEY ? 'Lovable Gateway' : 'OpenAI'} model: ${AI_MODEL}`);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // =====================================================
    // GESTÃO DE LEAD - FONTE ÚNICA: leads_imobiliarios
    // =====================================================
    let currentLeadId = leadId;
    let leadImobiliarioId: string | null = leadImobId || null;
    
    // Log para debug
    console.log("🔍 Dados recebidos:", { 
      leadId, 
      leadImobId, 
      clientName, 
      clientPhone, 
      skipLeadCreation,
      origin 
    });
    
    // Se skipLeadCreation é true, o lead já foi criado pelo widget
    // Apenas usar os IDs fornecidos e não criar novos
    if (skipLeadCreation && (currentLeadId || leadImobiliarioId)) {
      console.log("✅ Lead já criado pelo widget. Usando IDs existentes:", { currentLeadId, leadImobiliarioId });
      
      // Sincronizar dados se necessário
      if (clientName && clientPhone && leadImobiliarioId) {
        await supabase
          .from("leads_imobiliarios")
          .update({
            nome: clientName,
            telefone: clientPhone,
            updated_at: new Date().toISOString()
          })
          .eq("id", leadImobiliarioId);
        console.log("✅ Dados do lead atualizados:", { clientName, clientPhone });
      }
    } else if (currentLeadId && !skipLeadCreation) {
      // Lead existe - atualizar com dados do frontend se disponíveis
      console.log("Lead já existe:", currentLeadId);
      
      // Se o frontend extraiu nome/telefone, atualizar imediatamente
      const hasRealClientName = clientName && clientName !== "Visitante do Chat" && clientName.length >= 2;
      const hasRealClientPhone = clientPhone && clientPhone !== "A definir" && clientPhone.replace(/\D/g, "").length >= 10;
      
      if (hasRealClientName || hasRealClientPhone) {
        const leadUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (hasRealClientName) leadUpdate.name = clientName;
        if (hasRealClientPhone) leadUpdate.phone = clientPhone;
        
        await supabase.from("leads").update(leadUpdate).eq("id", currentLeadId);
        console.log(`✅ Lead atualizado com dados do frontend: name=${clientName}, phone=${clientPhone}`);
        
        // Também atualizar leads_imobiliarios
        if (leadImobiliarioId) {
          const imobUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (hasRealClientName) imobUpdate.nome = clientName;
          if (hasRealClientPhone) imobUpdate.telefone = clientPhone;
          await supabase.from("leads_imobiliarios").update(imobUpdate).eq("id", leadImobiliarioId);
          console.log(`✅ Lead imobiliário atualizado com dados do frontend`);
        }
      }
      
      // Sincronizar com leads_imobiliarios se ainda não existir
      if (!leadImobiliarioId) {
        const { data: existingLead } = await supabase
          .from("leads")
          .select("name, phone")
          .eq("id", currentLeadId)
          .single();
        
        const leadName = clientName || existingLead?.name || "Visitante do Chat";
        const leadPhone = clientPhone || existingLead?.phone || "A definir";
        
        if (leadPhone && leadPhone !== "A definir") {
          const cleanPhone = leadPhone.replace(/\D/g, "");
          const { data: existingImobLead } = await supabase
            .from("leads_imobiliarios")
            .select("id")
            .or(`telefone.eq.${leadPhone},telefone.eq.${cleanPhone}`)
            .limit(1)
            .maybeSingle();
          
          if (existingImobLead) {
            leadImobiliarioId = existingImobLead.id;
            const imobUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (hasRealClientName) imobUpdate.nome = clientName;
            await supabase.from("leads_imobiliarios").update(imobUpdate).eq("id", existingImobLead.id);
          }
        }
      }
    } else if (!skipLeadCreation) {
      // Criar novo lead se não existe
      if (checkLeadCreationLimit(clientIp)) {
        console.warn(`Lead creation limit exceeded for IP: ${clientIp}`);
        return new Response(
          JSON.stringify({ error: "Limite de conversas atingido. Tente novamente mais tarde." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar atendente ativo para atribuição automática
      const { data: activeAttendant } = await supabase
        .from("chat_attendants")
        .select("id, name, phone")
        .eq("active", true)
        .limit(1)
        .single();
      
      console.log("Atendente ativo encontrado:", activeAttendant?.name || "Nenhum");

      // Usar dados do clientName/clientPhone se fornecidos
      const leadName = clientName || "Visitante do Chat";
      const leadPhone = clientPhone || "A definir";

      // 1. Criar lead na tabela leads (para compatibilidade com funções existentes)
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          name: leadName,
          phone: leadPhone,
          property_id: propertyId || null,
          origin: origin || "site",
          page_url: pageUrl || null,
          status: "em_atendimento"
        })
        .select()
        .single();

      if (leadError) {
        console.error("Erro ao criar lead (tabela leads):", leadError);
      } else {
        currentLeadId = newLead.id;
        console.log("Lead criado (tabela leads):", currentLeadId, "Nome:", leadName);
      }

      // 2. SÓ criar em leads_imobiliarios se tiver dados REAIS (não defaults)
      const hasRealName = leadName && leadName !== "Visitante do Chat";
      const hasRealPhone = leadPhone && leadPhone !== "A definir" && leadPhone.replace(/\D/g, "").length >= 10;
      
      if (hasRealName || hasRealPhone) {
        // Verificar duplicidade por telefone antes de criar
        let existingImobLeadId: string | null = null;
        if (hasRealPhone) {
          const cleanPhone = leadPhone.replace(/\D/g, "");
          const { data: existingImob } = await supabase
            .from("leads_imobiliarios")
            .select("id")
            .or(`telefone.eq.${leadPhone},telefone.eq.${cleanPhone}`)
            .limit(1)
            .single();
          
          if (existingImob) {
            existingImobLeadId = existingImob.id;
            leadImobiliarioId = existingImob.id;
            await supabase
              .from("leads_imobiliarios")
              .update({
                nome: hasRealName ? leadName : undefined,
                telefone: leadPhone,
                pagina_origem: pageUrl || null,
                updated_at: new Date().toISOString()
              })
              .eq("id", existingImob.id);
            console.log("✅ Lead imobiliário existente atualizado:", existingImob.id);
          }
        }

        if (!existingImobLeadId) {
          const { data: newLeadImobiliario, error: leadImobError } = await supabase
            .from("leads_imobiliarios")
            .insert({
              nome: leadName,
              telefone: hasRealPhone ? leadPhone : "A definir",
              origem: origin || "site",
              pagina_origem: pageUrl || null,
              status: "novo",
              descricao: `Lead criado automaticamente via chat. Página: ${pageUrl || "Homepage"}`
            })
            .select()
            .single();

          if (leadImobError) {
            console.error("Erro ao criar lead_imobiliario:", leadImobError);
          } else {
            leadImobiliarioId = newLeadImobiliario.id;
            console.log("✅ Lead criado em leads_imobiliarios:", leadImobiliarioId);
          }
        }
      } else {
        console.log("⏳ Lead imobiliário NÃO criado - aguardando dados reais (nome/telefone)");
      }

      // 4. Atribuir corretor usando RPC (mantém compatibilidade)
      if (currentLeadId) {
        const { data: brokerId } = await supabase.rpc("assign_lead_to_broker", {
          p_lead_id: currentLeadId,
          p_property_id: propertyId || null
        });
        console.log("Corretor atribuído via RPC:", brokerId);
      }

      // 5. 🔥 Enviar WhatsApp ao corretor SOMENTE quando tiver nome E telefone reais
      {
        const hasRealName = leadName && leadName !== 'Visitante do Chat' && leadName !== 'Visitante' && !/^\d+$/.test(leadName);
        const hasRealPhone = leadPhone && leadPhone !== 'Não informado' && leadPhone.replace(/\D/g, '').length >= 10;
        
        if (hasRealName && hasRealPhone) {
          const BROKER_WHATSAPP_IMMEDIATE = '5562999918353';
          try {
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

            const whatsappMessage = `🔥 *NOVO LEAD NO CHAT*

👤 *Nome:* ${leadName}
📞 *Telefone:* ${leadPhone}
📍 *Imóvel:* ${propertyTitle}
🌐 *Origem:* ${origin || "site"}
🔗 *Página:* ${pageUrl || "Homepage"}

⚡ Atendimento imediato — acesse o painel.
📲 Responder: https://wa.me/${leadPhone.replace(/\D/g, '')}`;

            const sendWhatsappUrl = `${SUPABASE_URL}/functions/v1/send-whatsapp`;
            
            console.log('🔥 ENVIANDO NOTIFICAÇÃO AO CORRETOR (nome+telefone confirmados)');
            const whatsappResponse = await fetch(sendWhatsappUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: BROKER_WHATSAPP_IMMEDIATE,
                message: whatsappMessage
              })
            });

            if (whatsappResponse.ok) {
              console.log(`✅ WhatsApp enviado para corretor - Lead: ${leadName} (${leadPhone})`);
              await supabase.from("leads").update({
                whatsapp_sent: true,
                whatsapp_sent_at: new Date().toISOString()
              }).eq("id", currentLeadId);
            } else {
              const errorData = await whatsappResponse.json();
              console.error("Erro ao enviar WhatsApp:", errorData);
            }
          } catch (whatsappError) {
            console.error("Erro ao processar envio de WhatsApp:", whatsappError);
          }
        } else {
          console.log(`⏳ Aguardando dados completos para notificar corretor. Nome: ${leadName}, Telefone: ${leadPhone}`);
        }
      }
    }

    // =====================================================
    // INTEGRAÇÃO OMNICHAT - WEBCHAT
    // =====================================================
    let omnichatConvId: string | null = null;
    if (currentLeadId) {
      try {
        // Find tenant user (first admin/super_admin)
        const { data: tenantRole } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["super_admin", "admin"])
          .limit(1)
          .single();
        
        const tenantUserId = tenantRole?.user_id;
        
        if (tenantUserId) {
          const externalId = `webchat_${currentLeadId}`;
          
          // Check existing conversation
          const { data: existingConv } = await supabase
            .from("omnichat_conversations")
            .select("id, unread_count")
            .eq("channel", "webchat")
            .eq("external_contact_id", externalId)
            .maybeSingle();
          
          if (existingConv) {
            omnichatConvId = existingConv.id;
            // Get last user message for preview
            const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
            let preview = "...";
            if (lastMsg?.role === "user") {
              preview = typeof lastMsg.content === "string" ? lastMsg.content.substring(0, 100) : "...";
            }
            await supabase.from("omnichat_conversations").update({
              last_message_at: new Date().toISOString(),
              last_message_preview: preview,
              unread_count: (existingConv.unread_count || 0) + 1,
              status: "open",
              contact_name: clientName && clientName !== "Visitante do Chat" ? clientName : undefined,
              contact_phone: clientPhone && clientPhone !== "A definir" ? clientPhone : undefined,
            }).eq("id", existingConv.id);
          } else {
            const { data: newConv } = await supabase
              .from("omnichat_conversations")
              .insert({
                user_id: tenantUserId,
                channel: "webchat",
                external_contact_id: externalId,
                contact_name: clientName && clientName !== "Visitante do Chat" ? clientName : null,
                contact_phone: clientPhone && clientPhone !== "A definir" ? clientPhone : null,
                lead_id: currentLeadId,
                bot_active: true,
                last_message_at: new Date().toISOString(),
                last_message_preview: "Nova conversa via chat do site",
                unread_count: 1,
              })
              .select("id")
              .single();
            
            if (newConv) {
              omnichatConvId = newConv.id;
              console.log("✅ Omnichat webchat conversation created:", omnichatConvId);
            }
          }
        }
      } catch (omniErr) {
        console.error("Error creating omnichat conversation:", omniErr);
      }
    }

    // =====================================================
    // DETECÇÃO DE INTENÇÃO UNIFICADA (mesmo fluxo WhatsApp/Instagram)
    // =====================================================
    let unifiedIntent: DetectedIntent | null = null;
    let unifiedTemperature: string | null = null;
    if (currentLeadId && messages.length > 0) {
      try {
        const lastMsg = messages[messages.length - 1];
        const lastText = typeof lastMsg.content === 'string' ? lastMsg.content : '';
        if (lastText && lastMsg.role === 'user') {
          unifiedIntent = detectIntent(lastText, messages);
          unifiedTemperature = calculateTemperatureFromIntent(messages.filter(m => m.role === 'user').length, unifiedIntent);

          // Update lead with unified intent data
          const intentUpdate: Record<string, unknown> = {
            intent: unifiedIntent.type,
            lead_temperature: unifiedTemperature,
            last_interaction_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          if (unifiedTemperature === 'quente') intentUpdate.qualification = 'quente';
          else if (unifiedTemperature === 'morno') intentUpdate.qualification = 'morno';
          if (unifiedIntent.isScheduling) intentUpdate.visit_requested = true;
          
          await supabase.from("leads").update(intentUpdate).eq("id", currentLeadId);

          // Update CRM card with intent
          const crmIntentUpdate: Record<string, unknown> = {
            classificacao: unifiedTemperature,
            updated_at: new Date().toISOString(),
            last_interaction_at: new Date().toISOString(),
          };
          if (unifiedIntent.isScheduling) {
            crmIntentUpdate.proxima_acao = 'Agendar visita - cliente solicitou';
            crmIntentUpdate.coluna = 'negociacao';
            crmIntentUpdate.prioridade = 'alta';
            crmIntentUpdate.lead_score = 80;
            crmIntentUpdate.probabilidade_fechamento = 40;
          } else if (unifiedIntent.isHot) {
            crmIntentUpdate.lead_score = 60;
            crmIntentUpdate.probabilidade_fechamento = 25;
          }
          await supabase.from("crm_cards").update(crmIntentUpdate).eq("lead_id", currentLeadId);

          // Create CRM event for intent tracking
          if (unifiedIntent.type !== 'geral') {
            await supabase.from("crm_events").insert({
              lead_id: currentLeadId,
              event_type: unifiedIntent.isScheduling ? 'agendamento_solicitado' : `intent_${unifiedIntent.type}`,
              new_value: unifiedIntent.type,
              metadata: { temperature: unifiedTemperature, messageCount: messages.length, source: 'webchat_ai' },
            });
          }

          console.log(`[real-estate-chat] 🎯 Intent: ${unifiedIntent.type}, temp: ${unifiedTemperature}, scheduling: ${unifiedIntent.isScheduling}`);
        }
      } catch (intentErr) {
        console.error("[real-estate-chat] Intent detection error (non-blocking):", intentErr);
      }
    }

    // =====================================================
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
          content: textContent.substring(0, MAX_MESSAGE_LENGTH)
        });

        // Save to omnichat_messages for unified inbox
        if (omnichatConvId) {
          try {
            await supabase.from("omnichat_messages").insert({
              conversation_id: omnichatConvId,
              sender_type: "client",
              channel: "webchat",
              content: textContent.substring(0, MAX_MESSAGE_LENGTH),
              status: "received",
            });
          } catch (omniMsgErr) {
            console.error("Error saving omnichat message:", omniMsgErr);
          }
        }

        // Extrair informações do usuário
        const content = textContent.toLowerCase();
        const updates: Record<string, unknown> = {};
        const imobUpdates: Record<string, unknown> = {}; // Para leads_imobiliarios

        // =====================================================
        // EXTRAÇÃO INTELIGENTE DE NOME
        // =====================================================
        // 1. Padrões explícitos
        const namePatterns = [
          /meu nome [eé] ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /me chamo ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /sou o ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /sou a ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /pode me chamar de ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /eu sou ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /aqui [eé] o ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /aqui [eé] a ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /fala com (?:o |a )?([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /meu nome[,:]?\s*([a-záàâãéèêíïóôõöúçñ\s]+)/i,
        ];

        let nameExtracted = false;
        for (const pattern of namePatterns) {
          const match = textContent.match(pattern);
          if (match) {
            const extractedName = match[1].trim().replace(/[.,!?]+$/, "").substring(0, 100);
            if (extractedName.length >= 2) {
              updates.name = extractedName;
              imobUpdates.nome = extractedName;
              nameExtracted = true;
              console.log(`🧠 Nome extraído (padrão explícito): "${extractedName}"`);
              break;
            }
          }
        }

        // 2. Detecção contextual: se a mensagem anterior do AI perguntou o nome
        //    e o usuário respondeu com algo curto (1-3 palavras), provavelmente é o nome
        if (!nameExtracted && messages.length >= 2) {
          const prevMsg = messages[messages.length - 2];
          const prevText = typeof prevMsg.content === "string" ? prevMsg.content.toLowerCase() : "";
          
          const aiAskedName = /como (?:posso |devo )?(?:te )?chamar/i.test(prevText) ||
            /qual (?:[eé] )?(?:o )?seu nome/i.test(prevText) ||
            /me diga seu nome/i.test(prevText) ||
            /pode me dizer (?:o )?seu nome/i.test(prevText) ||
            /com quem (?:eu )?falo/i.test(prevText) ||
            /gostaria de saber seu nome/i.test(prevText);

          if (aiAskedName && prevMsg.role === "assistant") {
            // A resposta do usuário provavelmente é o nome
            const cleanedText = textContent.trim()
              .replace(/^(oi|olá|hey|eai|bom dia|boa tarde|boa noite|prazer)[,!.\s]*/i, "")
              .replace(/[.,!?]+$/, "")
              .trim();
            
            // Nome válido: 1-4 palavras, sem números, sem caracteres especiais
            const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
            const isLikelyName = words.length >= 1 && words.length <= 4 &&
              /^[a-záàâãéèêíïóôõöúçñ\s]+$/i.test(cleanedText) &&
              cleanedText.length >= 2 && cleanedText.length <= 60;

            if (isLikelyName) {
              // Capitalizar cada palavra
              const capitalizedName = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
              updates.name = capitalizedName;
              imobUpdates.nome = capitalizedName;
              nameExtracted = true;
              console.log(`🧠 Nome extraído (contextual): "${capitalizedName}"`);
            }
          }
        }

        // =====================================================
        // EXTRAÇÃO INTELIGENTE DE TELEFONE
        // =====================================================
        const phonePatterns = [
          /(\d{2}[\s.-]?\d{4,5}[\s.-]?\d{4})/,                   // 62 99999-9999
          /(?:\+?55\s?)(\d{2}\s?\d{4,5}\s?\d{4})/,                // +55 62 999999999
          /(?:fone|tel|whats|zap|whatsapp|telefone|celular|contato)[:\s]*(\d[\d\s.\-()]{8,})/i,
        ];
        
        let phoneExtracted = false;
        for (const pattern of phonePatterns) {
          const phoneMatch = textContent.match(pattern);
          if (phoneMatch) {
            const extractedPhone = phoneMatch[1].replace(/[\s.\-()]/g, "").substring(0, 20);
            if (extractedPhone.length >= 10 && extractedPhone.length <= 13) {
              updates.phone = extractedPhone;
              imobUpdates.telefone = extractedPhone;
              phoneExtracted = true;
              console.log(`📞 Telefone extraído: "${extractedPhone}"`);
              break;
            }
          }
        }

        // Detecção contextual de telefone: AI pediu telefone e usuário respondeu com números
        if (!phoneExtracted && messages.length >= 2) {
          const prevMsg = messages[messages.length - 2];
          const prevText = typeof prevMsg.content === "string" ? prevMsg.content.toLowerCase() : "";
          
          const aiAskedPhone = /(?:telefone|whatsapp|celular|contato|número)/i.test(prevText) &&
            /(?:qual|me (?:passa|envie|informe|diga)|pode)/i.test(prevText);

          if (aiAskedPhone && prevMsg.role === "assistant") {
            const phoneOnlyMatch = textContent.match(/(\d[\d\s.\-()]{8,})/);
            if (phoneOnlyMatch) {
              const cleanPhone = phoneOnlyMatch[1].replace(/[\s.\-()]/g, "");
              if (cleanPhone.length >= 10 && cleanPhone.length <= 13) {
                updates.phone = cleanPhone;
                imobUpdates.telefone = cleanPhone;
                phoneExtracted = true;
                console.log(`📞 Telefone extraído (contextual): "${cleanPhone}"`);
              }
            }
          }
        }

        // Extrair intenção / finalidade
        if (content.includes("comprar") || content.includes("compra")) {
          updates.intent = "comprar";
          imobUpdates.finalidade = "comprar";
        } else if (content.includes("alugar") || content.includes("aluguel") || content.includes("locação")) {
          updates.intent = "alugar";
          imobUpdates.finalidade = "alugar";
        }

        // Extrair tipo de imóvel
        if (content.includes("casa") || content.includes("casas")) {
          imobUpdates.tipo_imovel = "casa";
        } else if (content.includes("apartamento") || content.includes("apartamentos") || content.includes("apto")) {
          imobUpdates.tipo_imovel = "apartamento";
        } else if (content.includes("terreno") || content.includes("lote")) {
          imobUpdates.tipo_imovel = "terreno";
        } else if (content.includes("fazenda") || content.includes("chácara") || content.includes("sítio") || content.includes("rural")) {
          imobUpdates.tipo_imovel = "rural";
        } else if (content.includes("comercial") || content.includes("loja") || content.includes("sala")) {
          imobUpdates.tipo_imovel = "comercial";
        }

        // Extrair orçamento
        const budgetPatterns = [
          /(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:mil|k)/i,
          /R\$\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i,
          /(\d{3,})(?:\s*(?:reais|mil|k|milhão|milhões))/i,
        ];
        let extractedBudget: number | null = null;
        for (const bp of budgetPatterns) {
          const bMatch = textContent.match(bp);
          if (bMatch) {
            let val = bMatch[1].replace(/\./g, "").replace(",", ".");
            extractedBudget = parseFloat(val);
            if (/mil|k/i.test(textContent.substring(bMatch.index || 0, (bMatch.index || 0) + bMatch[0].length + 5))) {
              extractedBudget *= 1000;
            }
            break;
          }
        }

        // Registrar conversões
        const conversions: { type: string; metadata?: Record<string, unknown> }[] = [];

        // =====================================================
        // CLASSIFICAÇÃO AUTOMÁTICA DO LEAD POR ORÇAMENTO
        // =====================================================
        let leadCategory: string | null = null;
        let budgetRange: string | null = null;

        if (extractedBudget) {
          if (extractedBudget >= 2000000) {
            leadCategory = 'alto_padrao';
            budgetRange = 'acima_2m';
          } else if (extractedBudget >= 800000) {
            leadCategory = 'medio_padrao';
            budgetRange = '800k_2m';
          } else {
            leadCategory = 'economico';
            budgetRange = 'ate_800k';
          }
        }

        // Classificação por palavras-chave
        if (!leadCategory) {
          if (content.match(/\b(luxo|alto padr[aã]o|premium|exclusiv|milh[oõ]es|3 milh|4 milh|5 milh|mansão|mans[aã]o)\b/)) {
            leadCategory = 'alto_padrao';
          } else if (content.match(/\b(investir|investimento|investidor|rentabilidade|renda|retorno)\b/)) {
            leadCategory = 'investidor';
          } else if (content.match(/\b(avaliar|avalia[çc][aã]o|quanto vale|valor do meu|precificar)\b/)) {
            leadCategory = 'avaliacao';
          } else if (content.match(/\b(curiosidade|s[oó] olhando|apenas olhando|pesquisando|comparando)\b/)) {
            leadCategory = 'curioso';
          } else if (content.match(/\b(condom[ií]nio fechado|condominio)\b/)) {
            leadCategory = leadCategory || 'medio_padrao';
          }
        }

        // Salvar classificação
        if (leadCategory) {
          updates.lead_category = leadCategory;
          if (budgetRange) updates.budget_range = budgetRange;
          imobUpdates.lead_category = leadCategory;
          if (budgetRange) imobUpdates.budget_range = budgetRange;
          console.log(`🏷️ Lead classificado: ${leadCategory} (budget: ${budgetRange || 'N/A'})`);
        }

        // Agendamento
        const agendamentoPatterns = [
          /agendar/i, /marcar/i, /visita/i, /conhecer/i, /ver o imóvel/i,
          /horário/i, /disponível/i, /quando posso/i, /podemos marcar/i
        ];
        if (agendamentoPatterns.some(p => p.test(content))) {
          conversions.push({ type: "agendamento_solicitado" });
          updates.visit_requested = true;
          updates.status = "visita_solicitada";
          imobUpdates.status = "visita_agendada";

          // 🔥 PERSISTIR AGENDAMENTO em scheduled_visits
          try {
            const { data: tenantRole } = await supabase
              .from("user_roles")
              .select("user_id")
              .in("role", ["super_admin", "admin"])
              .limit(1)
              .single();
            
            if (tenantRole?.user_id) {
              const clientNameForVisit = clientName || "Visitante do Chat";
              const clientPhoneForVisit = (updates.phone as string) || clientPhone || "A definir";
              
              // Upsert visit_client
              const { data: existingClient } = await supabase
                .from("visit_clients")
                .select("id")
                .eq("phone", clientPhoneForVisit)
                .eq("tenant_id", tenantRole.user_id)
                .maybeSingle();
              
              let visitClientId: string;
              if (existingClient) {
                visitClientId = existingClient.id;
              } else {
                const { data: newClient } = await supabase
                  .from("visit_clients")
                  .insert({
                    name: clientNameForVisit,
                    phone: clientPhoneForVisit,
                    tenant_id: tenantRole.user_id,
                  })
                  .select("id")
                  .single();
                visitClientId = newClient!.id;
              }

              // Create scheduled visit for tomorrow 10:00
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const visitDate = tomorrow.toISOString().split("T")[0];

              await supabase.from("scheduled_visits").insert({
                client_id: visitClientId,
                tenant_id: tenantRole.user_id,
                property_id: propertyId || null,
                property_name: propertyName || "A definir",
                visit_date: visitDate,
                visit_time: "10:00",
                status: "pending",
                notes: `Agendamento automático via chat. Mensagem: "${textContent.substring(0, 200)}"`,
              });
              console.log(`📅 Agendamento salvo em scheduled_visits para ${visitDate}`);
            }
          } catch (schedErr) {
            console.error("Erro ao salvar agendamento:", schedErr);
          }
        }

        if (phoneExtracted) {
          conversions.push({ type: "telefone_coletado", metadata: { phone: updates.phone } });
          imobUpdates.status = "em_atendimento";
        }

        if (updates.name) {
          conversions.push({ type: "nome_coletado", metadata: { name: updates.name } });
        }

        // Interesse qualificado
        const interessePatterns = [
          /quanto custa/i, /qual o valor/i, /preço/i, /financiamento/i,
          /entrada/i, /parcela/i, /metragem/i, /quartos/i, /documentação/i
        ];
        if (interessePatterns.some(p => p.test(content))) {
          conversions.push({ type: "interesse_qualificado" });
        }

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

        // Atualizar tabela leads (compatibilidade)
        if (Object.keys(updates).length > 0) {
          console.log(`📝 Atualizando lead ${currentLeadId} com:`, JSON.stringify(updates));
          await supabase.from("leads").update(updates).eq("id", currentLeadId);
          
          // Se nome ou telefone extraído, atualizar CRM card e conversations
          if (updates.name || updates.phone) {
            const { data: existingCrmCard } = await supabase
              .from("crm_cards")
              .select("id, cliente")
              .eq("lead_id", currentLeadId)
              .limit(1)
              .maybeSingle();
            
            if (existingCrmCard) {
              const isFallbackName = (n: string | null) => !n || n === "Visitante do Chat" || n === "Cliente" || n === "A definir";
              const crmUpdate: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
                last_interaction_at: new Date().toISOString(),
              };
              if (updates.name && isFallbackName(existingCrmCard.cliente)) {
                crmUpdate.cliente = updates.name;
                crmUpdate.titulo = `Lead Chat - ${updates.name}`;
              }
              if (updates.phone) crmUpdate.telefone = updates.phone;
              await supabase.from("crm_cards").update(crmUpdate).eq("id", existingCrmCard.id);
              console.log(`✅ CRM card atualizado: ${existingCrmCard.id} → nome=${updates.name}, tel=${updates.phone}`);
            }

            // Atualizar omnichat_conversations se existir
            const convUpdate: Record<string, unknown> = {};
            if (updates.name) convUpdate.contact_name = updates.name;
            if (updates.phone) convUpdate.contact_phone = updates.phone;
            if (Object.keys(convUpdate).length > 0) {
              await supabase.from("omnichat_conversations")
                .update(convUpdate)
                .eq("lead_id", currentLeadId);
            }
          }

          // =====================================================
          // DISPARO AUTOMÁTICO WHATSAPP PARA CORRETOR
          // Verifica se o lead agora tem nome E telefone (mesmo de msgs diferentes)
          // =====================================================
          try {
            const { data: fullLead } = await supabase
              .from("leads")
              .select("name, phone, whatsapp_sent, origin, created_at")
              .eq("id", currentLeadId)
              .single();

            const hasName = fullLead?.name && fullLead.name !== "Visitante do Chat" && fullLead.name !== "A definir";
            const hasPhone = fullLead?.phone && fullLead.phone !== "A definir" && fullLead.phone.length >= 8;
            const alreadySent = fullLead?.whatsapp_sent === true;

            if (hasName && hasPhone && !alreadySent) {
              const BROKER_PHONE = "5562999918353";
              const createdDate = fullLead.created_at 
                ? new Date(fullLead.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
                : new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

              const brokerMessage = `🚨 Novo Lead Recebido

Nome: ${fullLead.name}
Telefone: ${fullLead.phone}
Origem: Chat do Site
Data: ${createdDate}

Acesse o CRM para atendimento imediato.`;

              const sendWhatsappUrl = `${SUPABASE_URL}/functions/v1/send-whatsapp`;
              const whatsappRes = await fetch(sendWhatsappUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: BROKER_PHONE,
                  message: brokerMessage
                })
              });

              if (whatsappRes.ok) {
                // Marcar como enviado para não duplicar
                await supabase.from("leads").update({
                  whatsapp_sent: true,
                  whatsapp_sent_at: new Date().toISOString()
                }).eq("id", currentLeadId);

                console.log(`✅ WhatsApp ENVIADO para corretor ${BROKER_PHONE} - Lead: ${fullLead.name}`);

                // Log de auditoria
                await supabase.from("security_logs").insert({
                  action: "whatsapp_notification",
                  table_name: "leads",
                  record_id: currentLeadId,
                  metadata: {
                    lead_name: fullLead.name,
                    lead_phone: fullLead.phone,
                    broker_phone: BROKER_PHONE,
                    status: "success"
                  }
                });
              } else {
                const errData = await whatsappRes.text();
                console.error(`❌ Erro WhatsApp para corretor: ${errData}`);
                
                await supabase.from("security_logs").insert({
                  action: "whatsapp_notification",
                  table_name: "leads",
                  record_id: currentLeadId,
                  metadata: {
                    lead_name: fullLead.name,
                    broker_phone: BROKER_PHONE,
                    status: "error",
                    error_message: errData.substring(0, 500)
                  }
                });
              }
            }
          } catch (whatsappAutoErr) {
            console.error("❌ Erro no disparo automático WhatsApp:", whatsappAutoErr);
            
            await supabase.from("security_logs").insert({
              action: "whatsapp_notification",
              table_name: "leads",
              record_id: currentLeadId,
              metadata: {
                status: "error",
                error_message: whatsappAutoErr instanceof Error ? whatsappAutoErr.message : "Unknown error"
              }
            }).catch(() => {});
          }
        }

        // =====================================================
        // SINCRONIZAR leads_imobiliarios (FONTE ÚNICA)
        // =====================================================
        if (Object.keys(imobUpdates).length > 0) {
          // Usar leadImobiliarioId diretamente se disponível
          let targetImobId = leadImobiliarioId;
          
          if (!targetImobId) {
            // Fallback: buscar por telefone
            if (updates.phone || clientPhone) {
              const searchPhone = (updates.phone || clientPhone || "").toString().replace(/\D/g, "");
              if (searchPhone.length >= 10) {
                const { data: imobByPhone } = await supabase
                  .from("leads_imobiliarios")
                  .select("id")
                  .or(`telefone.eq.${searchPhone}`)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();
                if (imobByPhone) targetImobId = imobByPhone.id;
              }
            }
          }
          
          if (targetImobId) {
            imobUpdates.updated_at = new Date().toISOString();
            await supabase
              .from("leads_imobiliarios")
              .update(imobUpdates)
              .eq("id", targetImobId);
            leadImobiliarioId = targetImobId;
            console.log(`✅ Lead imobiliário atualizado: ${targetImobId}`, imobUpdates);
          } else {
            // Se não existe leads_imobiliarios e agora temos dados reais, CRIAR
            const hasRealName = imobUpdates.nome && imobUpdates.nome !== "Visitante do Chat";
            const hasRealPhone = imobUpdates.telefone && String(imobUpdates.telefone).replace(/\D/g, "").length >= 10;
            
            if (hasRealName || hasRealPhone) {
              const { data: newImob } = await supabase
                .from("leads_imobiliarios")
                .insert({
                  nome: (imobUpdates.nome as string) || "Visitante do Chat",
                  telefone: (imobUpdates.telefone as string) || "A definir",
                  origem: origin || "site",
                  pagina_origem: pageUrl || null,
                  status: "novo",
                  tipo_imovel: (imobUpdates.tipo_imovel as string) || null,
                  finalidade: (imobUpdates.finalidade as string) || null,
                  lead_category: (imobUpdates.lead_category as string) || null,
                  budget_range: (imobUpdates.budget_range as string) || null,
                  descricao: `Lead capturado via chat. Dados extraídos da conversa.`
                })
                .select("id")
                .single();
              
              if (newImob) {
                leadImobiliarioId = newImob.id;
                console.log(`✅ Lead imobiliário CRIADO com dados reais: ${newImob.id}`, imobUpdates);
              }
            }
          }
          
          // Enviar WhatsApp com dados completos se capturou nome E telefone
          if (imobUpdates.nome && imobUpdates.telefone) {
            try {
              const { data: activeAttendant } = await supabase
                .from("chat_attendants")
                .select("id, name, phone")
                .eq("active", true)
                .limit(1)
                .single();
              
              if (activeAttendant?.phone) {
                const leadMessage = `📱 *Lead Qualificado - Chat*

👤 *Nome:* ${imobUpdates.nome}
📞 *Telefone:* ${imobUpdates.telefone}
🏡 *Interesse:* ${imobUpdates.tipo_imovel || "Não especificado"}
🎯 *Finalidade:* ${imobUpdates.finalidade || "Não informada"}

Lead coletado agora via chat!
Entre em contato o quanto antes.`;

                const sendWhatsappUrl = `${SUPABASE_URL}/functions/v1/send-whatsapp`;
                await fetch(sendWhatsappUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: activeAttendant.phone,
                    message: leadMessage
                  })
                });
                console.log(`✅ WhatsApp com lead qualificado enviado para ${activeAttendant.name}`);
              }
            } catch (err) {
              console.error("Erro ao enviar atualização WhatsApp:", err);
            }
          }
        }
      }
    }

    // =====================================================
    // PIPELINE INVISÍVEL: SCORING + CRM + DISTRIBUIÇÃO
    // =====================================================
    if (currentLeadId && messages.length >= 1) {
      try {
        // Concatenar todas as mensagens do usuário para análise
        const allUserText = messages
          .filter((m: ChatMessage) => m.role === "user")
          .map((m: ChatMessage) => typeof m.content === "string" ? m.content : 
            Array.isArray(m.content) ? m.content.find(c => c.type === "text")?.text || "" : "")
          .join(" ")
          .toLowerCase();

        // --- LEAD SCORING (quente/morno/frio) ---
        let leadScore: "quente" | "morno" | "frio" = "frio";
        let leadScoreNum = 0;
        let urgencia = "baixa";

        const hotPatterns = [
          /agendar/i, /visitar/i, /visita/i, /quero comprar/i, /vou comprar/i,
          /fechar/i, /contrato/i, /escritura/i, /quando posso ir/i,
          /marcar horário/i, /documentação/i, /financiamento/i,
          /entrada/i, /parcela/i, /sinal/i, /proposta/i,
          /meu telefone/i, /whatsapp/i, /me liga/i, /pode ligar/i,
        ];

        const warmPatterns = [
          /quanto custa/i, /qual o valor/i, /preço/i, /interesse/i,
          /gostei/i, /bonito/i, /bom/i, /legal/i, /bacana/i,
          /metragem/i, /quartos/i, /suíte/i, /garagem/i, /vagas/i,
          /localização/i, /bairro/i, /região/i, /condomínio/i,
          /pesquisando/i, /procurando/i, /opções/i, /alternativas/i,
        ];

        const urgentPatterns = [
          /urgente/i, /rápido/i, /hoje/i, /amanhã/i, /essa semana/i,
          /preciso mudar/i, /preciso sair/i, /o mais rápido/i,
          /imediato/i, /logo/i,
        ];

        const hotCount = hotPatterns.filter(p => p.test(allUserText)).length;
        const warmCount = warmPatterns.filter(p => p.test(allUserText)).length;
        const urgentCount = urgentPatterns.filter(p => p.test(allUserText)).length;

        // Verificar se forneceu telefone
        const hasPhone = /(\d{2}[\s.-]?\d{4,5}[\s.-]?\d{4})/.test(allUserText);

        if (hotCount >= 2 || (hotCount >= 1 && hasPhone) || urgentCount >= 1) {
          leadScore = "quente";
          leadScoreNum = Math.min(90 + hotCount * 3, 100);
        } else if (warmCount >= 2 || hotCount >= 1) {
          leadScore = "morno";
          leadScoreNum = Math.min(40 + warmCount * 5 + hotCount * 10, 70);
        } else {
          leadScore = "frio";
          leadScoreNum = Math.min(10 + warmCount * 5 + messages.length * 2, 35);
        }

        if (urgentCount >= 1) urgencia = "alta";
        else if (hotCount >= 1) urgencia = "media";

        // Extrair interesse resumido
        const { data: leadDataForCRM } = await supabase
          .from("leads")
          .select("name, phone, intent, property_id")
          .eq("id", currentLeadId)
          .single();

        const leadName = leadDataForCRM?.name || clientName || "Visitante";
        const leadPhone = leadDataForCRM?.phone || clientPhone || "";

        // Buscar nome do imóvel se houver
        let propertyInterest = "Não especificado";
        const propId = leadDataForCRM?.property_id || propertyId;
        if (propId) {
          const { data: propData } = await supabase
            .from("properties")
            .select("title, location")
            .eq("id", propId)
            .single();
          if (propData) propertyInterest = `${propData.title}${propData.location ? ` - ${propData.location}` : ""}`;
        }

        // --- AUTO CRM CARD CREATION ---
        // Criar card para qualquer lead com nome real OU que tenha telefone
        const isRealLead = (leadName && leadName !== "Visitante do Chat" && leadName !== "Visitante") || leadPhone;
        if (isRealLead) {
          // Usar o melhor nome disponível
          const cardName = (leadName && leadName !== "Visitante do Chat" && leadName !== "Visitante") 
            ? leadName 
            : `Lead ${leadPhone || "Chat"}`;
          // Verificar se já existe card para este lead
          const { data: existingCard } = await supabase
            .from("crm_cards")
            .select("id, lead_score, classificacao")
            .eq("lead_id", currentLeadId)
            .limit(1)
            .single();

          if (existingCard) {
            // Atualizar card existente se score mudou
            const cardUpdate: Record<string, unknown> = {
              lead_score: leadScoreNum,
              classificacao: leadScore,
              last_interaction_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            if (leadPhone) cardUpdate.telefone = leadPhone;
            if (leadDataForCRM?.intent) cardUpdate.notas = `Intenção: ${leadDataForCRM.intent}`;

            await supabase.from("crm_cards").update(cardUpdate).eq("id", existingCard.id);
            console.log(`✅ CRM card atualizado: ${existingCard.id} → ${leadScore} (${leadScoreNum})`);
          } else {
            // Criar novo card no Kanban
            const coluna = leadScore === "quente" ? "qualificado" : leadScore === "morno" ? "contato_iniciado" : "leads";

            const { data: newCard, error: cardErr } = await supabase
              .from("crm_cards")
              .insert({
                lead_id: currentLeadId,
                titulo: `Lead Chat - ${cardName}`,
                cliente: cardName,
                telefone: leadPhone || null,
                email: null,
                coluna,
                origem_lead: origin || "chat_ia",
                lead_score: leadScoreNum,
                classificacao: leadScore,
                probabilidade_fechamento: leadScore === "quente" ? 60 : leadScore === "morno" ? 30 : 10,
                prioridade: urgencia === "alta" ? "urgente" : urgencia === "media" ? "alta" : "normal",
                notas: `Imóvel: ${propertyInterest}\nIntenção: ${leadDataForCRM?.intent || "Não informada"}\nOrigem: ${origin || "chat"}`,
                historico: JSON.stringify([{
                  tipo: "sistema",
                  descricao: `Lead capturado automaticamente via chat. Classificação: ${leadScore}`,
                  data: new Date().toISOString(),
                }]),
              })
              .select("id")
              .single();

            if (cardErr) {
              console.error("❌ Erro ao criar CRM card:", cardErr);
            } else {
              console.log(`✅ CRM card criado: ${newCard?.id} | ${cardName} | ${leadScore} | coluna: ${coluna}`);

              // Registrar evento CRM
              await supabase.from("crm_events").insert({
                card_id: newCard?.id,
                lead_id: currentLeadId,
                event_type: leadScore === "quente" ? "HOT_LEAD_TRIGGERED" : "LEAD_CAPTURED",
                new_value: leadScore,
                metadata: {
                  score: leadScoreNum,
                  origem: origin || "chat_ia",
                  interesse: propertyInterest,
                  urgencia,
                },
              });
            }
          }
        }

        // --- DISTRIBUIÇÃO ROUND ROBIN PARA CORRETORES ---
        // Só distribuir se lead qualificado (morno ou quente) e tem telefone
        if ((leadScore === "quente" || leadScore === "morno") && leadPhone) {
          // Verificar se já tem corretor atribuído
          const { data: currentLead } = await supabase
            .from("leads")
            .select("broker_id")
            .eq("id", currentLeadId)
            .single();

          if (!currentLead?.broker_id) {
            const { data: brokerId } = await supabase.rpc("assign_lead_to_broker", {
              p_lead_id: currentLeadId,
              p_property_id: propId || null,
            });

            if (brokerId) {
              console.log(`✅ Corretor atribuído via round-robin: ${brokerId}`);

              // Buscar dados do corretor para notificação
              const { data: broker } = await supabase
                .from("brokers")
                .select("name, whatsapp, phone")
                .eq("id", brokerId)
                .single();

              if (broker?.whatsapp || broker?.phone) {
                const brokerPhone = broker.whatsapp || broker.phone || "";
                const scoreEmoji = leadScore === "quente" ? "🔥" : "🌤️";
                const scoreLabel = leadScore === "quente" ? "QUENTE" : "MORNO";

                const brokerMessage = `🚨 *Novo Lead Recebido*

${scoreEmoji} *Classificação: ${scoreLabel}*

👤 *Nome:* ${leadName}
📞 *Telefone:* ${leadPhone}
🏡 *Interesse:* ${propertyInterest}
🎯 *Intenção:* ${leadDataForCRM?.intent || "Não informada"}
📊 *Score:* ${leadScoreNum}/100
${urgencia === "alta" ? "⚡ *URGENTE* - Entre em contato IMEDIATAMENTE" : ""}

Entre em contato imediatamente.`;

                const sendWhatsappUrl = `${SUPABASE_URL}/functions/v1/send-whatsapp`;
                fetch(sendWhatsappUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ to: brokerPhone, message: brokerMessage }),
                }).then(r => {
                  if (r.ok) console.log(`✅ WhatsApp enviado ao corretor ${broker.name}`);
                  else console.error(`❌ Falha WhatsApp ao corretor ${broker.name}`);
                }).catch(err => console.error("WhatsApp broker error:", err));
              }
            }
          }
        }

        // --- NOTIFICAÇÃO UNIVERSAL PARA CORRETOR (todos os leads, todos os canais) ---
        // Enviar para o corretor fixo IMEDIATAMENTE, sem depender de nome/telefone
        try {
          const { data: leadForNotify } = await supabase
            .from("leads")
            .select("whatsapp_sent, name, phone")
            .eq("id", currentLeadId)
            .single();

          if (leadForNotify && !leadForNotify.whatsapp_sent) {
            const BROKER_WHATSAPP = '5562999918353';
            const displayName = (leadForNotify.name && leadForNotify.name !== 'Visitante do Chat' && leadForNotify.name !== 'Visitante') 
              ? leadForNotify.name : (leadForNotify.phone || 'Novo visitante');
            const contactLink = leadForNotify.phone ? `https://wa.me/${leadForNotify.phone.replace(/\D/g, '')}` : 'N/A';
            const lastUserMsg = messages.filter((m: ChatMessage) => m.role === 'user').pop();
            const lastMsgText = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : '';

            const brokerMessage = `🚨 *Novo Lead Chat do Site*\n\n` +
              `👤 Nome: ${displayName}\n` +
              `📱 Telefone: ${leadForNotify.phone || 'Ainda não informado'}\n` +
              `📍 Origem: Chat do Site\n` +
              `💬 Mensagem: ${lastMsgText.substring(0, 200) || '(primeira interação)'}\n` +
              `📊 Score: ${leadScoreNum}/100 (${leadScore})\n\n` +
              `📲 Responder: ${contactLink}`;

            console.log('📤 ENVIANDO LEAD PARA CORRETOR (Chat):', displayName);
            const sendWhatsappUrl = `${SUPABASE_URL}/functions/v1/send-whatsapp`;
            fetch(sendWhatsappUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to: BROKER_WHATSAPP, message: brokerMessage }),
            }).then(async (r) => {
              if (r.ok) {
                console.log(`✅ Corretor notificado (5562999918353) - Lead Chat: ${displayName}`);
                await supabase.from("leads").update({ whatsapp_sent: true, whatsapp_sent_at: new Date().toISOString() }).eq("id", currentLeadId);
              } else {
                console.error(`❌ Falha notificação corretor`);
              }
            }).catch(err => console.error("WhatsApp broker notification error:", err));
          }
        } catch (notifyErr) {
          console.error("Broker notification error (non-blocking):", notifyErr);
        }

        console.log(`📊 Pipeline invisível: ${leadName} → ${leadScore} (${leadScoreNum}) | urgência: ${urgencia}`);
      } catch (pipelineError) {
        // Pipeline silencioso - nunca bloqueia o chat
        console.error("Pipeline error (non-blocking):", pipelineError);
      }
    }
    // =====================================================
    let resolvedClientName: string | null = clientName || null;
    if (!resolvedClientName && currentLeadId) {
      const { data: leadData } = await supabase
        .from("leads")
        .select("name")
        .eq("id", currentLeadId)
        .single();
      
      if (leadData?.name && leadData.name !== "Visitante do Chat") {
        resolvedClientName = leadData.name;
      }
    }

    // =====================================================
    // BUSCAR IMÓVEIS DO BANCO
    // =====================================================
    const hasSpecificProperty = !!(propertyId || propertyName);
    const hasListingContext = !hasSpecificProperty && pageProperties && pageProperties.length > 0;
    const hasNoContext = !hasSpecificProperty && !hasListingContext;
    
    let availableProperties: { id: string; title: string; price: number; location: string; property_type: string }[] = [];
    
    if (hasNoContext) {
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id, title, price, location, property_type")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (propertiesData) {
        availableProperties = propertiesData;
        console.log(`Imóveis disponíveis: ${availableProperties.length}`);
      }
    }

    // =====================================================
    // MONTAR CONTEXTO DINÂMICO
    // =====================================================
    let dynamicContext = "";
    
    // Contexto do nome
    if (resolvedClientName) {
      dynamicContext += `\n\n👤 NOME DO CLIENTE: "${resolvedClientName}"
→ Use "${resolvedClientName}" em TODAS as respostas
→ NÃO pergunte o nome novamente`;
    } else {
      dynamicContext += `\n\n👤 NOME: Ainda não informado
→ Após a primeira resposta, pergunte: "Como posso te chamar?"`;
    }

    // Contexto baseado na origem
    const isFromAd = !!(adContext) || !!(utmSource && (utmSource.includes('meta') || utmSource.includes('facebook') || utmSource.includes('instagram') || utmMedium === 'paid' || utmMedium === 'cpc' || utmMedium === 'cpm')) || !!(origin && (origin.toLowerCase().includes("meta") || origin.toLowerCase().includes("instagram") || origin.toLowerCase().includes("facebook") || origin.toLowerCase().includes("ads")));
    const adHeadline = adContext?.headline || adContext?.campaign || utmCampaign || null;

    if (hasSpecificProperty) {
      // FLUXO 1: Imóvel específico
      dynamicContext += `\n\n═══════════════════════════════════════════════════════════
🎯 FLUXO: IMÓVEL ESPECÍFICO
═══════════════════════════════════════════════════════════
${isFromAd ? "Visitante veio de ANÚNCIO PAGO" : "Visitante está navegando no site"}
Imóvel: "${propertyName || "Imóvel específico"}"

REGRAS:
- Falar EXCLUSIVAMENTE sobre este imóvel
- Não mudar de assunto
- Destacar diferenciais reais
- Conduzir para agendamento`;
    } else if (hasListingContext) {
      // FLUXO 2: Página de listagem
      const propertiesList = pageProperties!.slice(0, 10).map((p, i) => 
        `${i + 1}. ${p.title} - ${formatPrice(p.price)}${p.location ? ` (${p.location})` : ""}`
      ).join("\n");
      
      dynamicContext += `\n\n═══════════════════════════════════════════════════════════
🎯 FLUXO: PÁGINA DE LISTAGEM
═══════════════════════════════════════════════════════════
Categoria: ${pageContext || "imóveis"}

IMÓVEIS DISPONÍVEIS (mostrar no máximo 3):
${propertiesList}

REGRAS:
- Quando pedirem opções, mostrar NO MÁXIMO 3 da lista acima
- NUNCA inventar imóveis
- Após escolha, focar 100% no imóvel escolhido`;
    } else {
      // FLUXO 3: Busca orgânica
      if (availableProperties.length > 0) {
        const propertiesList = availableProperties.map((p, i) => 
          `${i + 1}. ${p.title} - ${formatPrice(p.price)} (${p.location || "Local não informado"}) [${p.property_type}]`
        ).join("\n");
        
        dynamicContext += `\n\n═══════════════════════════════════════════════════════════
🎯 FLUXO: BUSCA ORGÂNICA
═══════════════════════════════════════════════════════════
IMÓVEIS DISPONÍVEIS NO SISTEMA (${availableProperties.length}):
${propertiesList}

REGRAS OBRIGATÓRIAS:
1. Quando pedirem um tipo de imóvel, FILTRAR esta lista
2. Mostrar NO MÁXIMO 3 imóveis que atendam
3. Se não houver compatíveis, informar com transparência
4. NUNCA dizer "não temos" sem verificar a lista acima`;
      } else {
        dynamicContext += `\n\n═══════════════════════════════════════════════════════════
🎯 FLUXO: SEM IMÓVEIS CADASTRADOS
═══════════════════════════════════════════════════════════
Não há imóveis ativos no sistema no momento.

RESPOSTA PADRÃO:
"Estamos finalizando a atualização do nosso catálogo.
Posso anotar seu contato para que um consultor te ligue com as melhores opções?"`;
      }
    }

    // =====================================================
    // MENSAGEM DE ABERTURA
    // =====================================================
    let openingInstruction = "";
    
    // Meta Ads context injection (priority over other flows)
    let adContextInstruction = "";
    if (isFromAd && adHeadline) {
      adContextInstruction = `\n\n═══ CONTEXTO META ADS (PRIORIDADE MÁXIMA) ═══
Este visitante VEIO DE UM ANÚNCIO do Meta Ads. Ele está QUENTE.
Campanha: "${adHeadline}"
REGRAS:
- CONTINUE exatamente o que o anúncio prometeu
- Qualifique rápido: "Você está buscando pra morar ou investir?"
- Lead de anúncio esfria rápido — seja objetivo e conduza para AGENDAMENTO
═══════════════════════════════════════════════════`;
    }

    if (messages.length === 0) {
      if (isFromAd) {
        // Meta Ads specific opening — continuação do anúncio
        const adProduct = adHeadline || propertyName || "um imóvel";
        const nameGreeting = resolvedClientName ? `${resolvedClientName}` : "";
        openingInstruction = `\n\nPRIMEIRA MENSAGEM (usar exatamente):
"Oi${nameGreeting ? ` ${nameGreeting}` : ""} 😊 Vi que você se interessou por ${adProduct} 👀
Vou te passar todos os detalhes.
Você está buscando pra morar ou investir?"`;
      } else if (hasSpecificProperty && propertyName) {
        openingInstruction = `\n\nPRIMEIRA MENSAGEM (usar exatamente):
"Olá 😊 Seja bem-vindo(a)!
Vi que você está olhando o ${propertyName}.
Posso te ajudar com alguma dúvida?"`;
      } else if (hasListingContext) {
        openingInstruction = `\n\nPRIMEIRA MENSAGEM (usar exatamente):
"Olá 😊 Seja bem-vindo(a)!
Vi que você está explorando opções de ${pageContext || "imóveis"}.
Posso te ajudar a encontrar o imóvel ideal?"`;
      } else {
        openingInstruction = `\n\nPRIMEIRA MENSAGEM (usar exatamente):
"Olá 😊 Seja bem-vindo(a)!
É um prazer te atender.
Me conta: você está procurando um imóvel para morar ou investir?"`;
      }
    }

    // =====================================================
    // REGISTRAR MÉTRICA
    // =====================================================
    const flowType = hasSpecificProperty ? "specific" : hasListingContext ? "listing" : "general";
    try {
      await supabase.from("chat_flow_metrics").insert({
        flow_type: flowType,
        lead_id: currentLeadId || null,
        property_id: propertyId || null,
        page_context: pageContext || null,
        page_url: pageUrl || null,
        origin: origin || null,
        properties_shown: hasListingContext ? Math.min(pageProperties!.length, 3) : 0
      });
    } catch (metricError) {
      console.error("Error recording flow metric:", metricError);
    }

    // =====================================================
    // CHAMADA OPENAI
    // =====================================================
    const response = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { 
            role: "system", 
            content: SYSTEM_PROMPT + dynamicContext + adContextInstruction + openingInstruction
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
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o suporte." }), {
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

    // =====================================================
    // STREAM PROCESSING: Intercept for escalation tags + save bot response to omnichat
    // =====================================================
    const originalStream = response.body;
    let fullReply = "";
    
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        // Accumulate text for post-processing
        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) fullReply += content;
          } catch {}
        }
      },
      async flush() {
        // Post-processing after stream completes
        if (fullReply && currentLeadId) {
          try {
            const SUPABASE_URL_INNER = Deno.env.get("SUPABASE_URL")!;
            const SUPABASE_KEY_INNER = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
            const spb = createClient(SUPABASE_URL_INNER, SUPABASE_KEY_INNER);
            
            // Save bot response to omnichat
            if (omnichatConvId) {
              const cleanReply = fullReply.replace('[VISITA_AGENDADA]', '').replace('[ENCAMINHAR_CORRETOR]', '').trim();
              await spb.from("omnichat_messages").insert({
                conversation_id: omnichatConvId,
                sender_type: "bot",
                channel: "webchat",
                content: cleanReply.substring(0, 5000),
                status: "sent",
              });
              await spb.from("omnichat_conversations").update({
                last_message_at: new Date().toISOString(),
                last_message_preview: cleanReply.substring(0, 100),
              }).eq("id", omnichatConvId);
            }

            // Save to chat_messages
            await spb.from("chat_messages").insert({
              lead_id: currentLeadId,
              role: "assistant",
              content: fullReply.replace('[VISITA_AGENDADA]', '').replace('[ENCAMINHAR_CORRETOR]', '').trim().substring(0, 5000),
            });
            
            // Handle escalation tags (same as whatsapp-ai-chat)
            const isVisitScheduled = fullReply.includes('[VISITA_AGENDADA]');
            const shouldEscalate = fullReply.includes('[ENCAMINHAR_CORRETOR]') || isVisitScheduled;

            if (shouldEscalate || (unifiedIntent && unifiedIntent.isScheduling)) {
              console.log('[real-estate-chat] 🔄 Escalation triggered:', isVisitScheduled ? 'visit_scheduled' : 'manual');

              if (isVisitScheduled) {
                await spb.from("crm_cards").update({
                  coluna: 'negociacao',
                  proxima_acao: 'Visita agendada pelo chat - confirmar com cliente',
                  prioridade: 'alta',
                  lead_score: 90,
                  probabilidade_fechamento: 50,
                  updated_at: new Date().toISOString(),
                }).eq("lead_id", currentLeadId);

                await spb.from("leads").update({
                  visit_requested: true,
                  status: 'em_atendimento',
                  updated_at: new Date().toISOString(),
                }).eq("id", currentLeadId);

                await spb.from("crm_events").insert({
                  lead_id: currentLeadId,
                  event_type: 'visita_agendada',
                  new_value: 'agendada_via_chat',
                  metadata: { source: 'webchat_ai', temperature: unifiedTemperature },
                });
              }

              // Disable bot and notify broker
              if (omnichatConvId) {
                await spb.from("omnichat_conversations").update({
                  bot_active: false,
                  status: 'open',
                }).eq("id", omnichatConvId);
              }

              // Notify FIXED broker for escalation
              try {
                const BROKER_WHATSAPP = '5562999918353';
                const { data: leadData } = await spb.from('leads').select('name, phone').eq('id', currentLeadId).single();
                const reason = isVisitScheduled 
                  ? '📅 VISITA AGENDADA pelo chat do site!'
                  : '💬 Cliente precisa de atendimento humano';
                
                const brokerMsg = `🚨 Lead Encaminhado (Chat do Site)\n\n` +
                  `👤 Nome: ${leadData?.name || 'Não informado'}\n` +
                  `📱 Telefone: ${leadData?.phone || 'Não informado'}\n` +
                  `🎯 ${reason}\n\n` +
                  (leadData?.phone ? `📲 Responder: https://wa.me/${leadData.phone.replace(/\D/g, '')}` : '');

                console.log('📤 ENVIANDO ESCALAÇÃO PARA CORRETOR:', leadData?.name || 'Lead');
                await fetch(`${SUPABASE_URL_INNER}/functions/v1/send-whatsapp`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ to: BROKER_WHATSAPP, message: brokerMsg }),
                });
                console.log('[real-estate-chat] ✅ Broker notified for escalation');
              } catch (notifyErr) {
                console.error('[real-estate-chat] Broker notification error:', notifyErr);
              }
            }
          } catch (postErr) {
            console.error("[real-estate-chat] Post-stream processing error:", postErr);
          }
        }
      }
    });

    const processedStream = originalStream!.pipeThrough(transformStream);

    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", "text/event-stream");
    headers.set("X-Lead-Id", currentLeadId || "");
    headers.set("X-Lead-Imob-Id", leadImobiliarioId || "");
    headers.set("Access-Control-Expose-Headers", "X-Lead-Id, X-Lead-Imob-Id");

    return new Response(processedStream, { headers });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
