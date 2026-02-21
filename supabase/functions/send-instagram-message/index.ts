import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GRAPH_API_VERSION = 'v19.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await authSupabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;
    console.log('[Send Instagram] Authenticated user:', userId);

    const { recipient_id, message, connection_id } = await req.json();

    if (!recipient_id || !message) {
      return new Response(JSON.stringify({ error: 'Missing recipient_id or message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the tenant's Instagram connection using service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let connectionQuery = supabase
      .from('meta_channel_connections')
      .select('id, instagram_id, page_id, access_token_encrypted, user_id')
      .eq('channel_type', 'instagram')
      .eq('status', 'connected');

    if (connection_id) {
      connectionQuery = connectionQuery.eq('id', connection_id);
    } else {
      connectionQuery = connectionQuery.eq('user_id', userId);
    }

    const { data: connection, error: connErr } = await connectionQuery.maybeSingle();

    if (connErr || !connection) {
      console.error('[Send Instagram] Connection not found:', connErr);
      return new Response(JSON.stringify({ error: 'No active Instagram connection found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user owns this connection
    if (connection.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const igUserId = connection.instagram_id;
    const accessToken = connection.access_token_encrypted;

    if (!igUserId || !accessToken) {
      return new Response(JSON.stringify({ error: 'Instagram connection is incomplete (missing instagram_id or token)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send DM via Instagram Graph API
    // Instagram uses Page ID for sending messages, not IG User ID
    const sendUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/${connection.page_id}/messages`;

    console.log('[Send Instagram] Sending DM to:', recipient_id, 'via page:', connection.page_id);

    const igResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        recipient: { id: recipient_id },
        message: { text: message },
      }),
    });

    const igResult = await igResponse.json();

    if (igResult.error) {
      console.error('[Send Instagram] API error:', igResult.error);

      // Save failed message
      await supabase.from('channel_messages').insert({
        connection_id: connection.id,
        user_id: userId,
        direction: 'outbound',
        message_type: 'text',
        content: message,
        contact_instagram_id: recipient_id,
        status: 'failed',
        error_message: igResult.error.message || JSON.stringify(igResult.error),
      });

      return new Response(JSON.stringify({ 
        error: 'Instagram API error', 
        details: igResult.error 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Send Instagram] ✅ Message sent:', igResult);

    // Save successful message
    const { data: savedMsg, error: saveErr } = await supabase
      .from('channel_messages')
      .insert({
        connection_id: connection.id,
        user_id: userId,
        direction: 'outbound',
        message_type: 'text',
        content: message,
        contact_instagram_id: recipient_id,
        meta_message_id: igResult.message_id || null,
        status: 'sent',
      })
      .select()
      .single();

    if (saveErr) {
      console.error('[Send Instagram] Error saving sent message:', saveErr);
    }

    // Update last_activity_at
    await supabase
      .from('meta_channel_connections')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', connection.id);

    return new Response(JSON.stringify({
      success: true,
      message_id: igResult.message_id,
      recipient_id: igResult.recipient_id,
      saved_message: savedMsg,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Send Instagram] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
