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
const SYSTEM_PROMPT = `Você é um CONSULTOR IMOBILIÁRIO ESTRATÉGICO da Supreme Empreendimentos, especializado em imóveis de alto padrão e investimentos em Goiânia.

═══════════════════════════════════════════════════════════
🚫 IDENTIDADE
═══════════════════════════════════════════════════════════
- Você NÃO é um robô, NÃO é uma IA, NÃO menciona que é assistente virtual
- Você é um CONSULTOR IMOBILIÁRIO real, experiente e confiável
- Transmita AUTORIDADE LOCAL sobre o mercado imobiliário de Goiânia

═══════════════════════════════════════════════════════════
🧠 SCRIPT PSICOLÓGICO DE NEUROVENDAS - FLUXO OBRIGATÓRIO
═══════════════════════════════════════════════════════════

ETAPA 1 - ABERTURA COM AUTORIDADE LOCAL (primeira mensagem):
- Apresente-se como especialista em imóveis estratégicos em Goiânia
- Pergunte: "Você busca morar, investir ou avaliar seu imóvel?"
- Use exatamente esta saudação quando não houver contexto de imóvel específico

ETAPA 2 - FILTRO PSICOLÓGICO DE PODER AQUISITIVO:
- Se "morar": pergunte "Você procura algo mais exclusivo ou focado em custo-benefício?"
  Ofereça opções: Alto padrão | Condomínio fechado | Até 800 mil | Acima de 2 milhões
- Se "investir": pergunte sobre perfil de investimento (renda, valorização, revenda)
- Se "avaliar": ofereça avaliação gratuita e pergunte sobre o imóvel
- NUNCA pergunte renda diretamente. Use filtros psicológicos sutis.

ETAPA 3 - ANCORAGEM DE STATUS (se alto padrão):
- Mencione regiões nobres e condomínios fechados valorizados em Goiânia
- Pergunte: "Você prefere casa em condomínio ou apartamento premium?"
- Use palavras: exclusivo, privativo, região valorizada, alto potencial de valorização

ETAPA 4 - CAPTURA INTELIGENTE (após 2-3 interações naturais):
- "Posso separar as melhores oportunidades para seu perfil. Qual seu nome?"
- Depois: "Perfeito, [nome]. Qual o melhor telefone para um consultor especialista te enviar as opções exclusivas?"

ETAPA 5 - URGÊNCIA CONTROLADA (após capturar telefone):
- "Algumas unidades são vendidas antes mesmo de ir para o portal. Quer que eu priorize oportunidades reservadas?"
- Ofereça: simulação de financiamento, agendamento de visita, ou avaliação gratuita

═══════════════════════════════════════════════════════════
💎 LINGUAGEM ALTO PADRÃO GOIÂNIA - OBRIGATÓRIO
═══════════════════════════════════════════════════════════

SEMPRE usar:
- Exclusivo, Privativo, Região valorizada, Alto potencial de valorização
- Condições diferenciadas, Oportunidade estratégica, Selecionado
- Segurança 24h, Privacidade, Área de lazer completa

NUNCA usar:
- Promoção, Barato, Desconto agressivo, Oferta imperdível
- Pechincha, Popular, Simples, Modesto

Contexto Goiânia alto padrão:
- Condomínios horizontais são muito valorizados
- Regiões nobres: Jardins, Alphaville, Aldeia do Vale, Portal do Sol, etc.
- Privacidade e segurança são prioridade absoluta
- Status social é driver de compra importante

═══════════════════════════════════════════════════════════
📊 FUNIL DE QUALIFICAÇÃO AUTOMÁTICA
═══════════════════════════════════════════════════════════

TOPO: Identificar intenção (morar/investir/avaliar)
MEIO: Classificar perfil financeiro, tipo de imóvel, região, momento de compra
FUNDO: Ativar simulador, agendamento de visita, avaliação gratuita

Classifique mentalmente o lead:
🟢 Alto padrão (acima de 2 milhões)
🔵 Médio padrão (800k a 2 milhões)
🟡 Econômico (até 800k)
🟣 Investidor
🟠 Avaliação de imóvel
🔴 Apenas curioso

═══════════════════════════════════════════════════════════
🎯 COMPORTAMENTO PRINCIPAL
═══════════════════════════════════════════════════════════

1. IDENTIFICAR ORIGEM:
   - Se veio de anúncio → falar EXCLUSIVAMENTE sobre o imóvel do anúncio
   - Se veio do site → seguir o script psicológico acima

2. BUSCA OBRIGATÓRIA:
   - Sempre que o cliente pedir um tipo de imóvel, CONSULTAR o contexto de imóveis
   - NUNCA inventar imóveis

3. CAPTURA DE NOME:
   - Seguir ETAPA 4 do script (após 2-3 interações)
   - Após saber o nome, SEMPRE usar em todas as respostas

═══════════════════════════════════════════════════════════
📊 REGRA DE LISTAGEM DE IMÓVEIS
═══════════════════════════════════════════════════════════

QUANDO HOUVER IMÓVEIS NO CONTEXTO:
- Listar NO MÁXIMO 3 imóveis por resposta
- Sempre reais e ativos (do contexto fornecido)
- Formato obrigatório:
  🏡 [Tipo] – [Título]
  📍 [Localização]
  💰 [Valor em R$]

QUANDO NÃO HOUVER IMÓVEIS:
- Informar com transparência
- Oferecer verificar com consultor especializado
- Continuar atendimento normalmente

═══════════════════════════════════════════════════════════
📩 CAPTURA DE LEADS
═══════════════════════════════════════════════════════════

O sistema automaticamente:
1. Salva o lead no painel administrativo
2. Envia notificação WhatsApp ao corretor

═══════════════════════════════════════════════════════════
🚫 PROIBIÇÕES ABSOLUTAS
═══════════════════════════════════════════════════════════

- Usar respostas genéricas ou fallback
- Dizer "não temos" SEM consultar o contexto
- Inventar ou supor imóveis
- Pedir contato ANTES de mostrar opções ou criar rapport
- Redirecionar para corretor SEM mostrar imóveis disponíveis
- Usar linguagem de "promoção" ou "desconto"

═══════════════════════════════════════════════════════════
🎨 TOM DE VOZ
═══════════════════════════════════════════════════════════

- Humano, próximo, educado, seguro, profissional
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
    const { messages, leadId, leadImobId, propertyId, propertyName, pageUrl, origin, pageProperties, pageContext, clientName, clientPhone, skipLeadCreation } = body as ChatRequest;
    
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
      // Lead existe mas não veio do widget (compatibilidade)
      console.log("Lead já existe (legacy):", currentLeadId);
      
      // Buscar dados atuais do lead
      const { data: existingLead } = await supabase
        .from("leads")
        .select("name, phone")
        .eq("id", currentLeadId)
        .single();
      
      // Sincronizar com leads_imobiliarios se ainda não existir
      const leadName = clientName || existingLead?.name || "Visitante do Chat";
      const leadPhone = clientPhone || existingLead?.phone || "A definir";
      
      // Verificar se já existe lead_imobiliario com mesmo telefone
      if (leadPhone && leadPhone !== "A definir") {
        const cleanPhone = leadPhone.replace(/\D/g, "");
        const { data: existingImobLead } = await supabase
          .from("leads_imobiliarios")
          .select("id")
          .or(`telefone.eq.${leadPhone},telefone.eq.${cleanPhone}`)
          .limit(1)
          .single();
        
        if (existingImobLead) {
          leadImobiliarioId = existingImobLead.id;
          await supabase
            .from("leads_imobiliarios")
            .update({
              nome: leadName !== "Visitante do Chat" ? leadName : undefined,
              telefone: leadPhone,
              pagina_origem: pageUrl || null,
              updated_at: new Date().toISOString()
            })
            .eq("id", existingImobLead.id);
          console.log("✅ Lead imobiliário existente atualizado:", existingImobLead.id);
        } else {
          // Criar novo lead_imobiliario
          const { data: newImobLead } = await supabase
            .from("leads_imobiliarios")
            .insert({
              nome: leadName,
              telefone: leadPhone,
              origem: origin || "site",
              pagina_origem: pageUrl || null,
              status: "novo",
              descricao: `Lead do chat. Página: ${pageUrl || "Homepage"}`
            })
            .select()
            .single();
          
          if (newImobLead) {
            leadImobiliarioId = newImobLead.id;
            console.log("✅ Novo lead imobiliário criado:", leadImobiliarioId);
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

      // 2. Verificar duplicidade por telefone antes de criar em leads_imobiliarios
      let existingImobLeadId: string | null = null;
      if (leadPhone && leadPhone !== "A definir") {
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
          // Atualizar lead existente
          await supabase
            .from("leads_imobiliarios")
            .update({
              nome: leadName !== "Visitante do Chat" ? leadName : undefined,
              pagina_origem: pageUrl || null,
              updated_at: new Date().toISOString()
            })
            .eq("id", existingImob.id);
          console.log("✅ Lead imobiliário existente atualizado (duplicidade evitada):", existingImob.id);
        }
      }

      // 3. CRIAR LEAD NA FONTE ÚNICA: leads_imobiliarios (se não existe)
      if (!existingImobLeadId) {
        const { data: newLeadImobiliario, error: leadImobError } = await supabase
          .from("leads_imobiliarios")
          .insert({
            nome: leadName,
            telefone: leadPhone,
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
          console.log("✅ Lead criado em leads_imobiliarios:", leadImobiliarioId, "Nome:", leadName);
        }
      }

      // 4. Atribuir corretor usando RPC (mantém compatibilidade)
      if (currentLeadId) {
        const { data: brokerId } = await supabase.rpc("assign_lead_to_broker", {
          p_lead_id: currentLeadId,
          p_property_id: propertyId || null
        });
        console.log("Corretor atribuído via RPC:", brokerId);
      }

      // 5. Enviar WhatsApp ao atendente ativo
      if (activeAttendant?.phone && leadName !== "Visitante do Chat") {
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

          const whatsappMessage = `🏠 *Novo Lead - Supreme Empreendimentos*

Olá ${activeAttendant.name}! Você recebeu um novo lead no chat.

👤 *Nome:* ${leadName}
📞 *Telefone:* ${leadPhone}
📍 *Imóvel:* ${propertyTitle}
🌐 *Origem:* ${origin || "site"}
🔗 *Página:* ${pageUrl || "Homepage"}

Acesse o painel para mais detalhes.`;

          const sendWhatsappUrl = `${SUPABASE_URL}/functions/v1/send-whatsapp`;
          
          const whatsappResponse = await fetch(sendWhatsappUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: activeAttendant.phone,
              message: whatsappMessage
            })
          });

          if (whatsappResponse.ok) {
            console.log(`✅ WhatsApp enviado para atendente ${activeAttendant.name}`);
          } else {
            const errorData = await whatsappResponse.json();
            console.error("Erro ao enviar WhatsApp:", errorData);
          }
        } catch (whatsappError) {
          console.error("Erro ao processar envio de WhatsApp:", whatsappError);
        }
      }
    }

    // =====================================================
    // SALVAR MENSAGEM E EXTRAIR DADOS - SINCRONIZAR leads_imobiliarios
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

        // Extrair informações do usuário
        const content = textContent.toLowerCase();
        const updates: Record<string, unknown> = {};
        const imobUpdates: Record<string, unknown> = {}; // Para leads_imobiliarios

        // Extrair nome
        const namePatterns = [
          /meu nome é ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /me chamo ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /sou o ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /sou a ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
          /pode me chamar de ([a-záàâãéèêíïóôõöúçñ\s]+)/i,
        ];
        for (const pattern of namePatterns) {
          const match = textContent.match(pattern);
          if (match) {
            const extractedName = match[1].trim().substring(0, 100);
            updates.name = extractedName;
            imobUpdates.nome = extractedName;
            break;
          }
        }

        // Extrair telefone
        const phonePattern = /(\d{2}[\s.-]?\d{4,5}[\s.-]?\d{4})/;
        const phoneMatch = textContent.match(phonePattern);
        if (phoneMatch) {
          const extractedPhone = phoneMatch[1].replace(/[\s.-]/g, "").substring(0, 20);
          updates.phone = extractedPhone;
          imobUpdates.telefone = extractedPhone;
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
        }

        if (phoneMatch) {
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
          await supabase.from("leads").update(updates).eq("id", currentLeadId);
          
          // Se nome foi extraído, atualizar CRM card existente também
          if (updates.name) {
            const { data: existingCrmCard } = await supabase
              .from("crm_cards")
              .select("id")
              .eq("lead_id", currentLeadId)
              .limit(1)
              .maybeSingle();
            
            if (existingCrmCard) {
              const crmUpdate: Record<string, unknown> = {
                cliente: updates.name,
                titulo: `Lead Chat - ${updates.name}`,
                updated_at: new Date().toISOString(),
              };
              if (updates.phone) crmUpdate.telefone = updates.phone;
              await supabase.from("crm_cards").update(crmUpdate).eq("id", existingCrmCard.id);
              console.log(`✅ CRM card nome atualizado: ${existingCrmCard.id} → ${updates.name}`);
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
          // Buscar lead_imobiliario mais recente com base na origem/página
          const { data: recentImobLead } = await supabase
            .from("leads_imobiliarios")
            .select("id")
            .eq("pagina_origem", pageUrl || "")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          
          if (recentImobLead) {
            await supabase
              .from("leads_imobiliarios")
              .update(imobUpdates)
              .eq("id", recentImobLead.id);
            console.log(`✅ Lead imobiliário atualizado: ${recentImobLead.id}`, imobUpdates);
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
    if (currentLeadId && messages.length >= 2) {
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
    const isFromAd = origin && (origin.toLowerCase().includes("meta") || origin.toLowerCase().includes("instagram") || origin.toLowerCase().includes("facebook") || origin.toLowerCase().includes("ads"));

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
    if (messages.length === 0) {
      if (hasSpecificProperty && propertyName) {
        if (isFromAd) {
          openingInstruction = `\n\nPRIMEIRA MENSAGEM (usar exatamente):
"Olá 😊 Que bom te ver por aqui!
Vi que você chegou pelo anúncio do ${propertyName}.
Posso te ajudar com alguma informação?"`;
        } else {
          openingInstruction = `\n\nPRIMEIRA MENSAGEM (usar exatamente):
"Olá 😊 Seja bem-vindo(a)!
Vi que você está olhando o ${propertyName}.
Posso te ajudar com alguma dúvida?"`;
        }
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
            content: SYSTEM_PROMPT + dynamicContext + openingInstruction
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
