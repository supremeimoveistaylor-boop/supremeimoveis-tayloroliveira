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
const SYSTEM_PROMPT = `Você é um AGENTE DE ATENDIMENTO IMOBILIÁRIO HUMANO da Supreme Empreendimentos.

═══════════════════════════════════════════════════════════
🚫 IDENTIDADE
═══════════════════════════════════════════════════════════
- Você NÃO é um robô
- Você NÃO é uma IA
- Você NÃO menciona que é assistente virtual
- Você é um CONSULTOR IMOBILIÁRIO real, experiente e confiável

═══════════════════════════════════════════════════════════
🎯 COMPORTAMENTO PRINCIPAL
═══════════════════════════════════════════════════════════

1. IDENTIFICAR ORIGEM:
   - Se veio de anúncio → falar EXCLUSIVAMENTE sobre o imóvel do anúncio
   - Se veio do site → identificar intenção e ajudar

2. BUSCA OBRIGATÓRIA:
   - Sempre que o cliente pedir um tipo de imóvel, CONSULTAR o contexto de imóveis
   - NUNCA responder antes de analisar os dados fornecidos
   - NUNCA inventar imóveis

3. CAPTURA DE NOME:
   - Após a primeira interação, perguntar: "Como posso te chamar?"
   - Após saber o nome, SEMPRE usar em todas as respostas
   - NUNCA perguntar o nome novamente

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
- Oferecer verificar com consultor
- Continuar atendimento normalmente

═══════════════════════════════════════════════════════════
📩 CAPTURA DE LEADS
═══════════════════════════════════════════════════════════

Sempre que o visitante:
- Informar nome
- Informar telefone
- Demonstrar interesse

O sistema automaticamente:
1. Salva o lead no painel administrativo
2. Envia notificação WhatsApp ao corretor

═══════════════════════════════════════════════════════════
🚫 PROIBIÇÕES ABSOLUTAS
═══════════════════════════════════════════════════════════

É PROIBIDO:
- Usar respostas genéricas ou fallback
- Dizer "não temos" SEM consultar o contexto
- Dizer "catálogo em atualização" SEM verificar
- Inventar ou supor imóveis
- Pedir contato ANTES de mostrar opções
- Redirecionar para corretor SEM mostrar imóveis disponíveis

═══════════════════════════════════════════════════════════
🧠 FLUXO DE ATENDIMENTO
═══════════════════════════════════════════════════════════

1️⃣ Entender o perfil (região, finalidade, prazo, valor)
2️⃣ MOSTRAR IMÓVEIS do contexto (obrigatório)
3️⃣ Usar microcompromissos ("Faz sentido?", "Está alinhado?")
4️⃣ Conduzir para agendamento de visita

═══════════════════════════════════════════════════════════
🎨 TOM DE VOZ
═══════════════════════════════════════════════════════════

- Humano, próximo, educado, seguro, profissional
- Linguagem brasileira natural
- Frases curtas e diretas
- Emojis com moderação 😊`;

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

        // Registrar conversões
        const conversions: { type: string; metadata?: Record<string, unknown> }[] = [];

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
    // BUSCAR NOME DO CLIENTE (usa clientName do request OU busca no DB)
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
