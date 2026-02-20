import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_APP_ID = '1594744215047248';
const GRAPH_API_VERSION = 'v19.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!META_APP_SECRET) {
      console.error('[Meta OAuth] META_APP_SECRET not configured');
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { code, user_id, redirect_uri } = await req.json();

    if (!code || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing code or user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callbackUri = redirect_uri || 'https://supremeempreendimentos.com/api/meta/oauth/callback';

    // Step 1: Exchange code for access_token
    console.log('[Meta OAuth] Exchanging code for token...');
    const tokenUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?` +
      `client_id=${META_APP_ID}` +
      `&client_secret=${META_APP_SECRET}` +
      `&code=${encodeURIComponent(code)}` +
      `&redirect_uri=${encodeURIComponent(callbackUri)}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('[Meta OAuth] Token exchange error:', tokenData.error);
      return new Response(JSON.stringify({ error: 'Token exchange failed', details: tokenData.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = tokenData.access_token;
    console.log('[Meta OAuth] Token obtained successfully');

    // Step 2: Fetch WhatsApp Business Accounts
    console.log('[Meta OAuth] Fetching WABA data...');
    const wabaRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/me?fields=id,name&access_token=${accessToken}`
    );
    const meData = await wabaRes.json();

    // Fetch WhatsApp Business Accounts
    const wabaListRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/me/whatsapp_business_accounts?fields=id,name,phone_numbers{id,display_phone_number,verified_name}&access_token=${accessToken}`
    );
    const wabaListData = await wabaListRes.json();

    console.log('[Meta OAuth] WABA data:', JSON.stringify(wabaListData));

    let wabaId: string | null = null;
    let phoneNumberId: string | null = null;
    let phoneDisplay: string | null = null;
    let accountName: string | null = meData.name || null;

    if (wabaListData.data && wabaListData.data.length > 0) {
      const waba = wabaListData.data[0];
      wabaId = waba.id;
      accountName = waba.name || accountName;

      if (waba.phone_numbers?.data && waba.phone_numbers.data.length > 0) {
        const phone = waba.phone_numbers.data[0];
        phoneNumberId = phone.id;
        phoneDisplay = phone.display_phone_number;
      }
    }

    // Step 3: Save to Supabase using service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if connection already exists for this user
    const { data: existing } = await supabase
      .from('meta_channel_connections')
      .select('id')
      .eq('user_id', user_id)
      .eq('channel_type', 'whatsapp')
      .maybeSingle();

    const connectionData = {
      user_id,
      channel_type: 'whatsapp',
      access_token_encrypted: accessToken, // In production, encrypt this
      phone_number_id: phoneNumberId,
      meta_business_id: wabaId,
      account_name: accountName,
      status: 'active',
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      // Update existing connection
      result = await supabase
        .from('meta_channel_connections')
        .update(connectionData)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Insert new connection
      result = await supabase
        .from('meta_channel_connections')
        .insert(connectionData)
        .select()
        .single();
    }

    if (result.error) {
      console.error('[Meta OAuth] DB save error:', result.error);
      return new Response(JSON.stringify({ error: 'Failed to save connection', details: result.error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Meta OAuth] Connection saved successfully');

    return new Response(JSON.stringify({
      success: true,
      connection: {
        id: result.data.id,
        channel_type: 'whatsapp',
        account_name: accountName,
        phone_number_id: phoneNumberId,
        phone_display: phoneDisplay,
        waba_id: wabaId,
        status: 'active',
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Meta OAuth] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
