import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      new_property_campaigns: 0,
      price_drop_campaigns: 0,
      errors: [] as string[],
    };

    const now = new Date();

    // Get leads with phone numbers that are active
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, phone, intent, qualification')
      .not('phone', 'is', null)
      .not('status', 'in', '("convertido","perdido")');

    if (leadsError) {
      console.error('[Campaigns] Error fetching leads:', leadsError);
      results.errors.push(`Leads fetch: ${leadsError.message}`);
    }

    const activeLeads = leads || [];
    if (activeLeads.length === 0) {
      console.log('[Campaigns] No active leads to notify');
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== 1. NEW PROPERTIES (created in last 30 minutes) =====
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const { data: newProperties, error: newPropsError } = await supabase
      .from('properties')
      .select('id, title, location, price, property_type, purpose, bedrooms, area')
      .eq('status', 'active')
      .gte('created_at', thirtyMinAgo);

    if (newPropsError) {
      console.error('[Campaigns] Error fetching new properties:', newPropsError);
      results.errors.push(`New properties fetch: ${newPropsError.message}`);
    }

    for (const property of (newProperties || [])) {
      for (const lead of activeLeads) {
        try {
          // Check if already sent
          const { data: existing } = await supabase
            .from('property_campaigns')
            .select('id')
            .eq('property_id', property.id)
            .eq('lead_id', lead.id)
            .eq('campaign_type', 'novo_imovel')
            .limit(1);

          if (existing && existing.length > 0) continue;

          // Generate message
          const message = await generateCampaignMessage({
            type: 'novo_imovel',
            leadName: lead.name || 'Cliente',
            propertyTitle: property.title,
            propertyLocation: property.location,
            propertyPrice: property.price,
            propertyType: property.property_type,
            bedrooms: property.bedrooms,
            area: property.area,
            apiKey: LOVABLE_API_KEY,
          });

          // Send WhatsApp
          let whatsappMessageId: string | null = null;
          if (WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN) {
            const sendResult = await sendWhatsAppMessage({
              to: lead.phone!,
              message,
              phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
              accessToken: WHATSAPP_ACCESS_TOKEN,
            });
            whatsappMessageId = sendResult?.messageId || null;
          }

          // Log campaign
          await supabase.from('property_campaigns').insert({
            property_id: property.id,
            lead_id: lead.id,
            campaign_type: 'novo_imovel',
            message_sent: message,
            status: whatsappMessageId ? 'sent' : 'failed',
            whatsapp_message_id: whatsappMessageId,
            new_price: property.price,
            metadata: {
              lead_name: lead.name,
              lead_phone: lead.phone,
              property_title: property.title,
              property_location: property.location,
            },
          });

          results.new_property_campaigns++;
          console.log(`[Campaigns] New property "${property.title}" sent to ${lead.name}`);
        } catch (e) {
          console.error(`[Campaigns] Error for property ${property.id}, lead ${lead.id}:`, e);
          results.errors.push(`New prop ${property.id}/${lead.id}: ${e.message}`);
        }
      }
    }

    // ===== 2. PRICE DROPS (properties with previous_price set, updated in last 30 min) =====
    const { data: priceDrops, error: priceDropError } = await supabase
      .from('properties')
      .select('id, title, location, price, previous_price, property_type, bedrooms, area')
      .eq('status', 'active')
      .not('previous_price', 'is', null)
      .gte('updated_at', thirtyMinAgo);

    if (priceDropError) {
      console.error('[Campaigns] Error fetching price drops:', priceDropError);
      results.errors.push(`Price drops fetch: ${priceDropError.message}`);
    }

    for (const property of (priceDrops || [])) {
      if (!property.previous_price || property.price >= property.previous_price) continue;

      const discount = Math.round(((property.previous_price - property.price) / property.previous_price) * 100);

      for (const lead of activeLeads) {
        try {
          // Check if already sent for this price change
          const { data: existing } = await supabase
            .from('property_campaigns')
            .select('id')
            .eq('property_id', property.id)
            .eq('lead_id', lead.id)
            .eq('campaign_type', 'queda_preco')
            .eq('new_price', property.price)
            .limit(1);

          if (existing && existing.length > 0) continue;

          const message = await generateCampaignMessage({
            type: 'queda_preco',
            leadName: lead.name || 'Cliente',
            propertyTitle: property.title,
            propertyLocation: property.location,
            propertyPrice: property.price,
            propertyType: property.property_type,
            bedrooms: property.bedrooms,
            area: property.area,
            oldPrice: property.previous_price,
            discount,
            apiKey: LOVABLE_API_KEY,
          });

          let whatsappMessageId: string | null = null;
          if (WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN) {
            const sendResult = await sendWhatsAppMessage({
              to: lead.phone!,
              message,
              phoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
              accessToken: WHATSAPP_ACCESS_TOKEN,
            });
            whatsappMessageId = sendResult?.messageId || null;
          }

          await supabase.from('property_campaigns').insert({
            property_id: property.id,
            lead_id: lead.id,
            campaign_type: 'queda_preco',
            message_sent: message,
            status: whatsappMessageId ? 'sent' : 'failed',
            whatsapp_message_id: whatsappMessageId,
            old_price: property.previous_price,
            new_price: property.price,
            metadata: {
              lead_name: lead.name,
              lead_phone: lead.phone,
              property_title: property.title,
              discount_percent: discount,
            },
          });

          results.price_drop_campaigns++;
          console.log(`[Campaigns] Price drop "${property.title}" (-${discount}%) sent to ${lead.name}`);
        } catch (e) {
          console.error(`[Campaigns] Price drop error ${property.id}/${lead.id}:`, e);
          results.errors.push(`Price drop ${property.id}/${lead.id}: ${e.message}`);
        }
      }

      // Clear previous_price after campaign sent
      await supabase.from('properties').update({ previous_price: null }).eq('id', property.id);
    }

    console.log('[Campaigns] Completed:', results);

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Campaigns] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate campaign message via AI
async function generateCampaignMessage({
  type,
  leadName,
  propertyTitle,
  propertyLocation,
  propertyPrice,
  propertyType,
  bedrooms,
  area,
  oldPrice,
  discount,
  apiKey,
}: {
  type: 'novo_imovel' | 'queda_preco';
  leadName: string;
  propertyTitle: string;
  propertyLocation: string;
  propertyPrice: number;
  propertyType: string;
  bedrooms?: number | null;
  area?: number | null;
  oldPrice?: number;
  discount?: number;
  apiKey: string | undefined;
}): Promise<string> {
  const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(propertyPrice);
  const typeLabel = { house: 'Casa', apartment: 'Apartamento', commercial: 'Comercial', land: 'Terreno' }[propertyType] || propertyType;

  const defaultMessages: Record<string, string> = {
    novo_imovel: `🏠 Novidade para você, ${leadName}!\n\n` +
      `Acabamos de cadastrar: *${propertyTitle}*\n` +
      `📍 ${propertyLocation}\n` +
      `💰 ${priceFormatted}\n` +
      `${bedrooms ? `🛏️ ${bedrooms} quartos` : ''}${area ? ` | 📐 ${area}m²` : ''}\n\n` +
      `Quer agendar uma visita? Responda esta mensagem! 😊`,
    queda_preco: `🔥 Oportunidade, ${leadName}!\n\n` +
      `O imóvel *${propertyTitle}* teve uma redução de ${discount}%!\n` +
      `📍 ${propertyLocation}\n` +
      `~~${oldPrice ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(oldPrice) : ''}~~  ➡️  *${priceFormatted}*\n` +
      `${bedrooms ? `🛏️ ${bedrooms} quartos` : ''}${area ? ` | 📐 ${area}m²` : ''}\n\n` +
      `Não perca essa chance! Responda para saber mais. ⚡`,
  };

  if (!apiKey) return defaultMessages[type];

  const prompts: Record<string, string> = {
    novo_imovel: `Gere uma mensagem WhatsApp empolgante para ${leadName} sobre um NOVO imóvel cadastrado: "${propertyTitle}" em ${propertyLocation}, tipo ${typeLabel}, preço ${priceFormatted}${bedrooms ? `, ${bedrooms} quartos` : ''}${area ? `, ${area}m²` : ''}. Destaque os pontos fortes e convide para uma visita. Máximo 5 linhas.`,
    queda_preco: `Gere uma mensagem WhatsApp urgente para ${leadName} sobre QUEDA DE PREÇO de ${discount}% no imóvel "${propertyTitle}" em ${propertyLocation}. Preço anterior: ${oldPrice ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(oldPrice) : 'N/A'}, novo preço: ${priceFormatted}. Crie senso de oportunidade. Máximo 5 linhas.`,
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
            content: 'Você é Taylor, consultora imobiliária da Supreme Imóveis em Goiânia. Gere mensagens de WhatsApp naturais e persuasivas sobre imóveis. Use emojis com moderação. Nunca mencione que é automático.',
          },
          { role: 'user', content: prompts[type] },
        ],
      }),
    });

    if (!response.ok) return defaultMessages[type];
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || defaultMessages[type];
  } catch (e) {
    console.error('[Campaigns] AI error:', e);
    return defaultMessages[type];
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
      console.error('[Campaigns] WhatsApp send error:', result);
      return null;
    }
    return { messageId: result.messages?.[0]?.id || 'unknown' };
  } catch (e) {
    console.error('[Campaigns] WhatsApp send failed:', e);
    return null;
  }
}
