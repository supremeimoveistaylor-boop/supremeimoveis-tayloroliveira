import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WHATSAPP_API_VERSION = 'v21.0';

interface SendMessageRequest {
  to: string; // Número do destinatário (formato: 5562999999999)
  message: string; // Mensagem de texto
  templateName?: string; // Nome do template (opcional)
  templateLanguage?: string; // Idioma do template (ex: pt_BR)
  templateComponents?: any[]; // Componentes do template
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');

    if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
      console.error('[Send WhatsApp] Missing configuration');
      return new Response(
        JSON.stringify({ error: 'WhatsApp API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SendMessageRequest = await req.json();
    const { to, message, templateName, templateLanguage, templateComponents } = body;

    if (!to) {
      return new Response(
        JSON.stringify({ error: 'Recipient phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formata o número (remove caracteres não numéricos)
    const formattedPhone = to.replace(/\D/g, '');

    let payload: any;

    if (templateName) {
      // Envio com template
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: templateLanguage || 'pt_BR',
          },
          components: templateComponents || [],
        },
      };
    } else if (message) {
      // Envio de texto simples
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: message,
        },
      };
    } else {
      return new Response(
        JSON.stringify({ error: 'Message or template is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Send WhatsApp] Sending message:', { to: formattedPhone, type: payload.type });

    const whatsappUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

    const response = await fetch(whatsappUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Send WhatsApp] API Error:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send message', details: result }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Send WhatsApp] Message sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true, messageId: result.messages?.[0]?.id, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Send WhatsApp] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
