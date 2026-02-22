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

    let code: string | null = null;
    let user_id: string | null = null;
    let redirect_uri: string | null = null;
    let channel: string | null = null;
    let stateAppId: string | null = null;
    let clientOrigin: string = 'https://supremeempreendimentos.com';

    if (req.method === 'GET') {
      const url = new URL(req.url);
      code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorReason = url.searchParams.get('error_reason');

      console.log('[Meta OAuth] GET callback:', { hasCode: !!code, hasState: !!state, error, errorReason });

      if (state) {
        try {
          const stateData = JSON.parse(atob(state));
          user_id = stateData.user_id || null;
          channel = stateData.channel || 'instagram';
          redirect_uri = stateData.redirect_uri || null;
          stateAppId = stateData.app_id || null;
          clientOrigin = stateData.origin || clientOrigin;
        } catch (e) {
          user_id = state;
          channel = 'instagram';
        }
      }

      console.log('[Meta OAuth] Client origin:', clientOrigin);

      if (error) {
        const redirectUrl = `${clientOrigin}/#/super-admin?tab=omnichat&error=auth_denied`;
        return new Response(null, { status: 302, headers: { 'Location': redirectUrl } });
      }

      if (!code || !user_id) {
        const redirectUrl = `${clientOrigin}/#/super-admin?tab=omnichat&error=missing_params`;
        return new Response(null, { status: 302, headers: { 'Location': redirectUrl } });
      }
    } else {
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
    const appId = stateAppId || META_APP_ID;

    console.log('[Meta OAuth] Channel:', requestedChannel, 'App ID:', appId);

    // Step 1: Exchange code for short-lived token
    const tokenUrl = `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?` +
      `client_id=${appId}&client_secret=${META_APP_SECRET}&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(callbackUri)}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('[Meta OAuth] Token exchange error:', tokenData.error);
      if (isGetRequest) {
        const redirectUrl = `${clientOrigin}/#/super-admin?tab=omnichat&error=token_exchange`;
        return new Response(null, { status: 302, headers: { 'Location': redirectUrl } });
      }
      return new Response(JSON.stringify({ error: 'Token exchange failed', details: tokenData.error }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = tokenData.access_token;
    console.log('[Meta OAuth] Token obtained');

    // Step 2: Exchange for long-lived token
    let longLivedToken = accessToken;
    try {
      const llRes = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${META_APP_SECRET}&fb_exchange_token=${accessToken}`
      );
      const llData = await llRes.json();
      if (llData.access_token) {
        longLivedToken = llData.access_token;
        console.log('[Meta OAuth] Long-lived token obtained');
      }
    } catch (e) {
      console.log('[Meta OAuth] Long-lived token exchange failed, using short-lived');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const connections: any[] = [];

    // ========== WHATSAPP ==========
    if (requestedChannel === 'whatsapp' || requestedChannel === 'both') {
      console.log('[Meta OAuth] Fetching WhatsApp data...');

      // Try via me/businesses first to get WABA
      let wabaId: string | null = null;
      let phoneNumberId: string | null = null;
      let phoneDisplay: string | null = null;
      let waAccountName: string | null = null;

      // Method 1: Direct WABA endpoint
      try {
        const wabaRes = await fetch(
          `https://graph.facebook.com/${GRAPH_API_VERSION}/me/whatsapp_business_accounts?fields=id,name,phone_numbers{id,display_phone_number,verified_name}&access_token=${longLivedToken}`
        );
        const wabaData = await wabaRes.json();
        console.log('[Meta OAuth] WABA direct:', JSON.stringify(wabaData));

        if (wabaData.data?.length > 0) {
          const waba = wabaData.data[0];
          wabaId = waba.id;
          waAccountName = waba.name || null;
          if (waba.phone_numbers?.data?.length > 0) {
            phoneNumberId = waba.phone_numbers.data[0].id;
            phoneDisplay = waba.phone_numbers.data[0].display_phone_number;
          }
        }
      } catch (e) {
        console.log('[Meta OAuth] WABA direct failed:', e);
      }

      // Method 2: Via business accounts
      if (!wabaId) {
        try {
          const bizRes = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/me/businesses?fields=id,name&access_token=${longLivedToken}`
          );
          const bizData = await bizRes.json();
          console.log('[Meta OAuth] Businesses:', JSON.stringify(bizData));

          if (bizData.data?.length > 0) {
            for (const biz of bizData.data) {
              const wabaListRes = await fetch(
                `https://graph.facebook.com/${GRAPH_API_VERSION}/${biz.id}/owned_whatsapp_business_accounts?fields=id,name,phone_numbers{id,display_phone_number,verified_name}&access_token=${longLivedToken}`
              );
              const wabaListData = await wabaListRes.json();
              console.log('[Meta OAuth] Biz', biz.id, 'WABAs:', JSON.stringify(wabaListData));

              if (wabaListData.data?.length > 0) {
                const waba = wabaListData.data[0];
                wabaId = waba.id;
                waAccountName = waba.name || biz.name;
                if (waba.phone_numbers?.data?.length > 0) {
                  phoneNumberId = waba.phone_numbers.data[0].id;
                  phoneDisplay = waba.phone_numbers.data[0].display_phone_number;
                }
                break;
              }
            }
          }
        } catch (e) {
          console.log('[Meta OAuth] Biz WABA lookup failed:', e);
        }
      }

      if (wabaId) {
        const waConnection = await upsertConnection(supabase, {
          user_id,
          channel_type: 'whatsapp',
          access_token_encrypted: longLivedToken,
          phone_number_id: phoneNumberId,
          meta_business_id: wabaId,
          account_name: waAccountName,
          status: 'connected',
        });
        connections.push({
          id: waConnection.id, channel_type: 'whatsapp', account_name: waAccountName,
          phone_number_id: phoneNumberId, phone_display: phoneDisplay, waba_id: wabaId, status: 'connected',
        });
      } else {
        console.log('[Meta OAuth] No WhatsApp Business Account found');
      }
    }

    // ========== INSTAGRAM ==========
    if (requestedChannel === 'instagram' || requestedChannel === 'both') {
      console.log('[Meta OAuth] Fetching Instagram data...');

      let igAccountId: string | null = null;
      let igAccountName: string | null = null;
      let pageId: string | null = null;
      let pageAccessToken: string | null = null;

      // Method 1: Get all pages and check for instagram_business_account
      const pagesRes = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account{id,name,username,profile_picture_url}&access_token=${longLivedToken}`
      );
      const pagesData = await pagesRes.json();
      console.log('[Meta OAuth] Pages:', JSON.stringify(pagesData));

      if (pagesData.data?.length > 0) {
        for (const page of pagesData.data) {
          if (page.instagram_business_account) {
            igAccountId = page.instagram_business_account.id;
            igAccountName = page.instagram_business_account.name || page.instagram_business_account.username || page.name;
            pageId = page.id;
            pageAccessToken = page.access_token || longLivedToken;
            console.log('[Meta OAuth] Found IG via page:', igAccountId, igAccountName);
            break;
          }
        }

        // Method 2: If no page has IG linked, try each page individually
        if (!igAccountId) {
          console.log('[Meta OAuth] No IG on pages directly, trying individual page lookups...');
          for (const page of pagesData.data) {
            try {
              const pageIgRes = await fetch(
                `https://graph.facebook.com/${GRAPH_API_VERSION}/${page.id}?fields=instagram_business_account{id,name,username}&access_token=${page.access_token || longLivedToken}`
              );
              const pageIgData = await pageIgRes.json();
              console.log('[Meta OAuth] Page', page.id, 'IG check:', JSON.stringify(pageIgData));
              if (pageIgData.instagram_business_account) {
                igAccountId = pageIgData.instagram_business_account.id;
                igAccountName = pageIgData.instagram_business_account.name || pageIgData.instagram_business_account.username || page.name;
                pageId = page.id;
                pageAccessToken = page.access_token || longLivedToken;
                console.log('[Meta OAuth] Found IG via individual page lookup:', igAccountId);
                break;
              }
            } catch (e) {
              console.log('[Meta OAuth] Page IG lookup failed for', page.id);
            }
          }
        }
      }

      // Method 3: Try via business accounts - owned Instagram accounts
      if (!igAccountId) {
        console.log('[Meta OAuth] Trying via business accounts...');
        try {
          const bizRes = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/me/businesses?fields=id,name&access_token=${longLivedToken}`
          );
          const bizData = await bizRes.json();
          console.log('[Meta OAuth] Businesses for IG:', JSON.stringify(bizData));

          if (bizData.data?.length > 0) {
            for (const biz of bizData.data) {
              // Get owned Instagram accounts from business
              const igListRes = await fetch(
                `https://graph.facebook.com/${GRAPH_API_VERSION}/${biz.id}/owned_instagram_accounts?fields=id,name,username,profile_picture_url&access_token=${longLivedToken}`
              );
              const igListData = await igListRes.json();
              console.log('[Meta OAuth] Biz', biz.id, 'IG accounts:', JSON.stringify(igListData));

              if (igListData.data?.length > 0) {
                igAccountId = igListData.data[0].id;
                igAccountName = igListData.data[0].name || igListData.data[0].username;
                
                // Now find the page connected to this IG account
                const bizPagesRes = await fetch(
                  `https://graph.facebook.com/${GRAPH_API_VERSION}/${biz.id}/owned_pages?fields=id,name,access_token,instagram_business_account{id}&access_token=${longLivedToken}`
                );
                const bizPagesData = await bizPagesRes.json();
                console.log('[Meta OAuth] Biz pages:', JSON.stringify(bizPagesData));

                if (bizPagesData.data?.length > 0) {
                  for (const bp of bizPagesData.data) {
                    if (bp.instagram_business_account?.id === igAccountId) {
                      pageId = bp.id;
                      pageAccessToken = bp.access_token || longLivedToken;
                      console.log('[Meta OAuth] Found matching page for IG:', pageId);
                      break;
                    }
                  }
                  // If no specific match, use first page with access token
                  if (!pageId && bizPagesData.data[0]) {
                    pageId = bizPagesData.data[0].id;
                    pageAccessToken = bizPagesData.data[0].access_token || longLivedToken;
                    console.log('[Meta OAuth] Using first biz page as fallback:', pageId);
                  }
                }
                break;
              }
            }
          }
        } catch (e) {
          console.log('[Meta OAuth] Business IG lookup failed:', e);
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
          id: igConnection.id, channel_type: 'instagram', account_name: igAccountName,
          instagram_id: igAccountId, page_id: pageId, status: 'connected',
        });
      } else {
        console.log('[Meta OAuth] No Instagram Business Account found after all methods');
        console.log('[Meta OAuth] IMPORTANT: Make sure the Facebook Page with the IG account is selected during OAuth authorization');
      }
    }

    if (connections.length === 0) {
      const errorMsg = requestedChannel === 'instagram'
        ? 'Nenhuma conta Instagram Business encontrada. Certifique-se de selecionar TODAS as Páginas do Facebook durante a autorização, especialmente a página vinculada à sua conta Instagram Business.'
        : 'Nenhuma conta business encontrada. Certifique-se de ter uma conta WhatsApp Business ou Instagram Business vinculada.';
      
      if (isGetRequest) {
        const redirectUrl = `${clientOrigin}/#/super-admin?tab=omnichat&error=no_accounts`;
        return new Response(null, { status: 302, headers: { 'Location': redirectUrl } });
      }
      return new Response(JSON.stringify({ error: 'No accounts found', message: errorMsg }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Meta OAuth] Success! Connections:', connections.length);

    if (isGetRequest) {
      const channelNames = connections.map((c: any) => c.channel_type).join(',');
      const redirectUrl = `${clientOrigin}/#/super-admin?tab=omnichat&success=true&channels=${channelNames}`;
      return new Response(null, { status: 302, headers: { 'Location': redirectUrl } });
    }

    return new Response(JSON.stringify({ success: true, connections, connection: connections[0] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Meta OAuth] Error:', error);
    // Try to extract origin from state for error redirect
    let errorOrigin = 'https://supremeempreendimentos.com';
    try {
      if (req.method === 'GET') {
        const url = new URL(req.url);
        const state = url.searchParams.get('state');
        if (state) {
          const stateData = JSON.parse(atob(state));
          errorOrigin = stateData.origin || errorOrigin;
        }
      }
    } catch (_) {}
    if (req.method === 'GET') {
      const redirectUrl = `${errorOrigin}/#/super-admin?tab=omnichat&error=internal`;
      return new Response(null, { status: 302, headers: { 'Location': redirectUrl } });
    }
    return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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
    result = await supabase.from('meta_channel_connections').update(connectionData).eq('id', existing.id).select().single();
  } else {
    result = await supabase.from('meta_channel_connections').insert(connectionData).select().single();
  }

  if (result.error) {
    console.error(`[Meta OAuth] DB error (${data.channel_type}):`, result.error);
    throw new Error(`Failed to save ${data.channel_type}: ${result.error.message}`);
  }
  return result.data;
}
