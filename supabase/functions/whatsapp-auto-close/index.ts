import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INACTIVITY_MINUTES = 3;
const BROKER_WHATSAPP = '5562999918353';
const CLOSING_MESSAGE = 'Vou encerrar o atendimento por agora e nosso consultor entrará em contato. Muito obrigado(a)!';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const cutoff = new Date(Date.now() - INACTIVITY_MINUTES * 60 * 1000).toISOString();

    // Find open WhatsApp conversations with bot_active where last message is older than cutoff
    const { data: conversations, error: convError } = await supabase
      .from('omnichat_conversations')
      .select('id, external_contact_id, contact_name, contact_phone, lead_id, last_message_at, last_message_preview, connection_id')
      .eq('channel', 'whatsapp')
      .eq('status', 'open')
      .eq('bot_active', true)
      .lt('last_message_at', cutoff);

    if (convError) {
      console.error('[Auto-Close] Query error:', convError);
      return new Response(JSON.stringify({ error: convError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!conversations || conversations.length === 0) {
      console.log('[Auto-Close] No inactive conversations found');
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Auto-Close] Found ${conversations.length} inactive conversation(s)`);

    let processed = 0;

    for (const conv of conversations) {
      try {
        // Double-check: get the last CLIENT message timestamp to confirm true inactivity
        const { data: lastClientMsg } = await supabase
          .from('omnichat_messages')
          .select('created_at, content')
          .eq('conversation_id', conv.id)
          .eq('sender_type', 'client')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!lastClientMsg) {
          console.log(`[Auto-Close] No client messages in conv ${conv.id}, skipping`);
          continue;
        }

        const lastClientTime = new Date(lastClientMsg.created_at).getTime();
        const now = Date.now();
        const diffMs = now - lastClientTime;

        if (diffMs < INACTIVITY_MINUTES * 60 * 1000) {
          console.log(`[Auto-Close] Conv ${conv.id} client active ${Math.round(diffMs / 1000)}s ago, skipping`);
          continue;
        }

        // Check if closing message was already sent (prevent duplicates)
        const { data: alreadyClosed } = await supabase
          .from('omnichat_messages')
          .select('id')
          .eq('conversation_id', conv.id)
          .eq('sender_type', 'bot')
          .eq('content', CLOSING_MESSAGE)
          .limit(1)
          .maybeSingle();

        if (alreadyClosed) {
          console.log(`[Auto-Close] Conv ${conv.id} already closed, skipping`);
          continue;
        }

        const senderPhone = conv.external_contact_id || conv.contact_phone;
        if (!senderPhone) {
          console.log(`[Auto-Close] Conv ${conv.id} no phone, skipping`);
          continue;
        }

        // 1. Send closing message to client via WhatsApp
        console.log(`[Auto-Close] Sending closing message to ${senderPhone}`);
        await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: senderPhone, message: CLOSING_MESSAGE }),
        });

        // Save bot closing message
        await supabase.from('omnichat_messages').insert({
          conversation_id: conv.id,
          sender_type: 'bot',
          channel: 'whatsapp',
          content: CLOSING_MESSAGE,
        });

        // 2. Mark conversation as closed
        await supabase.from('omnichat_conversations').update({
          status: 'closed',
          bot_active: false,
          last_message_at: new Date().toISOString(),
          last_message_preview: CLOSING_MESSAGE.substring(0, 100),
        }).eq('id', conv.id);

        // 3. Get lead data for broker notification
        let leadName = conv.contact_name || senderPhone;
        let leadPhone = conv.contact_phone || senderPhone;
        const lastMessage = lastClientMsg.content || conv.last_message_preview || '(sem mensagem)';

        if (conv.lead_id) {
          const { data: lead } = await supabase
            .from('leads')
            .select('name, phone, intent, lead_temperature')
            .eq('id', conv.lead_id)
            .maybeSingle();

          if (lead) {
            leadName = lead.name || leadName;
            leadPhone = lead.phone || leadPhone;
          }
        }

        // 4. Send lead data to broker
        const sanitizedPhone = leadPhone.replace(/\D/g, '');
        const brokerMessage = `📋 *Atendimento Encerrado - Lead WhatsApp*\n\n👤 Nome: ${leadName}\n📱 Telefone: ${sanitizedPhone}\n📍 Origem: WhatsApp\n💬 Última mensagem: "${lastMessage.substring(0, 200)}"\n\n📲 Falar com o cliente: https://wa.me/${sanitizedPhone}\n\n⏰ Encerrado automaticamente após ${INACTIVITY_MINUTES} min de inatividade.`;

        console.log(`[Auto-Close] Notifying broker for lead: ${leadName}`);
        await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: BROKER_WHATSAPP, message: brokerMessage }),
        });

        // 5. Update lead status
        if (conv.lead_id) {
          await supabase.from('leads').update({
            status: 'atendido',
            whatsapp_sent: true,
            whatsapp_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('id', conv.lead_id);
        }

        processed++;
        console.log(`[Auto-Close] ✅ Conv ${conv.id} closed and broker notified`);

      } catch (convErr) {
        console.error(`[Auto-Close] Error processing conv ${conv.id}:`, convErr);
      }
    }

    console.log(`[Auto-Close] Done. Processed: ${processed}/${conversations.length}`);

    return new Response(JSON.stringify({ processed, total: conversations.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Auto-Close] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
