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

    const { code, user_id, redirect_uri, channel } = await req.json();

    if (!code || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing code or user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestedChannel = channel || 'whatsapp'; // 'whatsapp' | 'instagram' | 'both'
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
      return new Response(JSON.stringify({ 
        error: 'No accounts found', 
        message: 'Nenhuma conta business foi encontrada. Certifique-se de ter uma conta WhatsApp Business ou Instagram Business vinculada.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Meta OAuth] Connections saved successfully:', connections.length);

    return new Response(JSON.stringify({
      success: true,
      connections,
      // Backward compatibility: return first connection as "connection"
      connection: connections[0],
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
