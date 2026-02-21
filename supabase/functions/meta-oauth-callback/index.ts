import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Single Meta App ID for both WhatsApp and Instagram
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

    let code: string | null = null;
    let user_id: string | null = null;
    let redirect_uri: string | null = null;
    let channel: string | null = null;
    let stateAppId: string | null = null;

    // ========== GET — Instagram/Meta redirect callback ==========
    if (req.method === 'GET') {
      const url = new URL(req.url);
      code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorReason = url.searchParams.get('error_reason');

      console.log('[Meta OAuth] GET callback received:', { 
        hasCode: !!code, 
        hasState: !!state, 
        error, 
        errorReason 
      });

      if (error) {
        console.error('[Meta OAuth] Authorization denied:', error, errorReason);
        const redirectUrl = 'https://supremeempreendimentos.com/#/super-admin?tab=omnichat&error=auth_denied';
        return new Response(null, { status: 302, headers: { 'Location': redirectUrl } });
      }

      // Parse state (expected: JSON with user_id and channel)
      if (state) {
        try {
          const stateData = JSON.parse(atob(state));
          user_id = stateData.user_id || null;
          channel = stateData.channel || 'instagram';
          redirect_uri = stateData.redirect_uri || null;
          stateAppId = stateData.app_id || null;
          console.log('[Meta OAuth] State parsed:', { user_id, channel, stateAppId });
        } catch (e) {
          // If state is just user_id string
          user_id = state;
          channel = 'instagram';
          console.log('[Meta OAuth] State used as user_id:', user_id);
        }
      }

      if (!code || !user_id) {
        console.error('[Meta OAuth] GET missing code or user_id');
        const redirectUrl = 'https://supremeempreendimentos.com/#/super-admin?tab=omnichat&error=missing_params';
        return new Response(null, { status: 302, headers: { 'Location': redirectUrl } });
      }
    } else {
      // ========== POST — API call from frontend ==========
      const body = await req.json();
      code = body.code;
      user_id = body.user_id;
      redirect_uri = body.redirect_uri;
      channel = body.channel;
    }

    if (!code || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing code or user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestedChannel = channel || 'instagram';
    const callbackUri = redirect_uri || 'https://ypkmorgcpooygsvhcpvo.supabase.co/functions/v1/meta-oauth-callback';
    const isGetRequest = req.method === 'GET';

    // Single app — same ID and secret for both channels
    const appId = stateAppId || META_APP_ID;
    const appSecret = META_APP_SECRET;

    console.log('[Meta OAuth] Using App ID:', appId, 'for channel:', requestedChannel);

    // Step 1: Exchange code for access_token
    console.log('[Meta OAuth] Exchanging code for token...');
    const tokenUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?` +
      `client_id=${appId}` +
      `&client_secret=${appSecret}` +
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const connections: any[] = [];

    // ========== WHATSAPP ==========
    if (requestedChannel === 'whatsapp' || requestedChannel === 'both') {
      console.log('[Meta OAuth] Fetching WhatsApp Business Account data...');

      const wabaListRes = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/me/whatsapp_business_accounts?fields=id,name,phone_numbers{id,display_phone_number,verified_name}&access_token=${accessToken}`
      );
      const wabaListData = await wabaListRes.json();
      console.log('[Meta OAuth] WABA data:', JSON.stringify(wabaListData));

      let wabaId: string | null = null;
      let phoneNumberId: string | null = null;
      let phoneDisplay: string | null = null;
      let waAccountName: string | null = null;

      if (wabaListData.data && wabaListData.data.length > 0) {
        const waba = wabaListData.data[0];
        wabaId = waba.id;
        waAccountName = waba.name || null;

        if (waba.phone_numbers?.data && waba.phone_numbers.data.length > 0) {
          const phone = waba.phone_numbers.data[0];
          phoneNumberId = phone.id;
          phoneDisplay = phone.display_phone_number;
        }
      }

      if (wabaId) {
        const waConnection = await upsertConnection(supabase, {
          user_id,
          channel_type: 'whatsapp',
          access_token_encrypted: accessToken,
          phone_number_id: phoneNumberId,
          meta_business_id: wabaId,
          account_name: waAccountName,
          status: 'connected',
        });

        connections.push({
          id: waConnection.id,
          channel_type: 'whatsapp',
          account_name: waAccountName,
          phone_number_id: phoneNumberId,
          phone_display: phoneDisplay,
          waba_id: wabaId,
          status: 'connected',
        });
      }
    }

    // ========== INSTAGRAM ==========
    if (requestedChannel === 'instagram' || requestedChannel === 'both') {
      console.log('[Meta OAuth] Fetching Instagram Business Account data...');

      // First get user's Facebook pages
      const pagesRes = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?fields=id,name,instagram_business_account{id,name,username,profile_picture_url}&access_token=${accessToken}`
      );
      const pagesData = await pagesRes.json();
      console.log('[Meta OAuth] Pages data:', JSON.stringify(pagesData));

      let igAccountId: string | null = null;
      let igAccountName: string | null = null;
      let pageId: string | null = null;
      let pageAccessToken: string | null = null;

      if (pagesData.data && pagesData.data.length > 0) {
        for (const page of pagesData.data) {
          if (page.instagram_business_account) {
            igAccountId = page.instagram_business_account.id;
            igAccountName = page.instagram_business_account.name || page.instagram_business_account.username || page.name;
            pageId = page.id;

            // Get long-lived page access token for this page
            const pageTokenRes = await fetch(
              `https://graph.facebook.com/${GRAPH_API_VERSION}/${page.id}?fields=access_token&access_token=${accessToken}`
            );
            const pageTokenData = await pageTokenRes.json();
            pageAccessToken = pageTokenData.access_token || accessToken;

            console.log('[Meta OAuth] Found IG Business Account:', igAccountId, igAccountName);
            break; // Use first page with IG account
          }
        }
      }

      if (igAccountId && pageAccessToken) {
        const igConnection = await upsertConnection(supabase, {
          user_id,
          channel_type: 'instagram',
          access_token_encrypted: pageAccessToken,
          instagram_id: igAccountId,
          page_id: pageId,
          account_name: igAccountName,
          status: 'connected',
        });

        connections.push({
          id: igConnection.id,
          channel_type: 'instagram',
          account_name: igAccountName,
          instagram_id: igAccountId,
          page_id: pageId,
          status: 'connected',
        });
      } else {
        console.log('[Meta OAuth] No Instagram Business Account found on any page');
      }
    }

    if (connections.length === 0) {
      if (isGetRequest) {
        const redirectUrl = 'https://supremeempreendimentos.com/#/super-admin?tab=omnichat&error=no_accounts';
        return new Response(null, { status: 302, headers: { 'Location': redirectUrl } });
      }
      return new Response(JSON.stringify({ 
        error: 'No accounts found', 
        message: 'Nenhuma conta business foi encontrada. Certifique-se de ter uma conta WhatsApp Business ou Instagram Business vinculada.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Meta OAuth] Connections saved successfully:', connections.length);

    // For GET requests (browser redirect from Meta), redirect back to admin panel
    if (isGetRequest) {
      const channelNames = connections.map((c: any) => c.channel_type).join(',');
      const redirectUrl = `https://supremeempreendimentos.com/#/super-admin?tab=omnichat&success=true&channels=${channelNames}`;
      return new Response(null, { status: 302, headers: { 'Location': redirectUrl } });
    }

    return new Response(JSON.stringify({
      success: true,
      connections,
      connection: connections[0],
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Meta OAuth] Error:', error);
    if (req.method === 'GET') {
      const redirectUrl = 'https://supremeempreendimentos.com/#/super-admin?tab=omnichat&error=internal';
      return new Response(null, { status: 302, headers: { 'Location': redirectUrl } });
    }
    return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper: upsert a connection record
async function upsertConnection(supabase: any, data: any) {
  const { data: existing } = await supabase
    .from('meta_channel_connections')
    .select('id')
    .eq('user_id', data.user_id)
    .eq('channel_type', data.channel_type)
    .maybeSingle();

  const connectionData = {
    ...data,
    last_activity_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let result;
  if (existing) {
    result = await supabase
      .from('meta_channel_connections')
      .update(connectionData)
      .eq('id', existing.id)
      .select()
      .single();
  } else {
    result = await supabase
      .from('meta_channel_connections')
      .insert(connectionData)
      .select()
      .single();
  }

  if (result.error) {
    console.error(`[Meta OAuth] DB save error (${data.channel_type}):`, result.error);
    throw new Error(`Failed to save ${data.channel_type} connection: ${result.error.message}`);
  }

  return result.data;
}
