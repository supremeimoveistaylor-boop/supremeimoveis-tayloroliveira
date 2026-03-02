import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get Instagram connection
    const { data: connection, error: connErr } = await supabase
      .from('meta_channel_connections')
      .select('id, access_token_encrypted, page_id, instagram_id')
      .eq('channel_type', 'instagram')
      .eq('status', 'connected')
      .maybeSingle();

    if (connErr || !connection) {
      return new Response(JSON.stringify({ error: 'No Instagram connection found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = connection.access_token_encrypted;
    const pageId = connection.page_id;

    console.log('[Update IG Names] Resolving Instagram usernames...');
    
    const igAccountId = connection.instagram_id;
    const nameMap = new Map<string, string>();
    const authHeader = { 'Authorization': `Bearer ${token}` };
    
    // Approach 1: Page conversations endpoint with instagram platform
    try {
      const convUrl = `https://graph.facebook.com/v21.0/${pageId}/conversations?fields=participants{name,username,id}&platform=instagram&limit=100`;
      console.log('[Update IG Names] Fetching page conversations...');
      const convRes = await fetch(convUrl, { headers: authHeader });
      const convText = await convRes.text();
      console.log(`[Update IG Names] Page conversations API ${convRes.status}:`, convText.substring(0, 500));
      
      if (convRes.ok) {
        const convData = JSON.parse(convText);
        const conversations = convData.data || [];
        for (const conv of conversations) {
          const participants = conv.participants?.data || [];
          for (const p of participants) {
            if (p.id && p.id !== pageId && p.id !== igAccountId) {
              const displayName = p.username ? `@${p.username}` : p.name || null;
              if (displayName) {
                nameMap.set(p.id, displayName);
                console.log(`[Update IG Names] Found: ${p.id} -> ${displayName}`);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[Update IG Names] Conversations API error:', e);
    }

    // Approach 2: IG account conversations
    if (nameMap.size === 0 && igAccountId) {
      try {
        const igConvUrl = `https://graph.facebook.com/v21.0/${igAccountId}/conversations?fields=participants{name,username,id}&limit=100`;
        const igConvRes = await fetch(igConvUrl, { headers: authHeader });
        const igConvText = await igConvRes.text();
        console.log(`[Update IG Names] IG conversations API ${igConvRes.status}:`, igConvText.substring(0, 500));
        
        if (igConvRes.ok) {
          const igConvData = JSON.parse(igConvText);
          for (const conv of (igConvData.data || [])) {
            for (const p of (conv.participants?.data || [])) {
              if (p.id && p.id !== pageId && p.id !== igAccountId) {
                const displayName = p.username ? `@${p.username}` : p.name || null;
                if (displayName) {
                  nameMap.set(p.id, displayName);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('[Update IG Names] IG conversations API error:', e);
      }
    }

    // Approach 3: Individual user lookups via Instagram Graph API
    if (nameMap.size === 0) {
      console.log('[Update IG Names] Trying individual lookups via IG Graph API...');
      const { data: conversations } = await supabase
        .from('omnichat_conversations')
        .select('external_contact_id')
        .eq('channel', 'instagram')
        .limit(10);

      for (const conv of (conversations || [])) {
        try {
          const res = await fetch(
            `https://graph.instagram.com/v21.0/${conv.external_contact_id}?fields=name,username`,
            { headers: authHeader }
          );
          const text = await res.text();
          console.log(`[Update IG Names] Lookup ${conv.external_contact_id} -> ${res.status}: ${text.substring(0, 200)}`);
          if (res.ok) {
            const data = JSON.parse(text);
            if (data.username) nameMap.set(conv.external_contact_id, `@${data.username}`);
            else if (data.name) nameMap.set(conv.external_contact_id, data.name);
          }
        } catch (e) { /* ignore */ }
        await new Promise(r => setTimeout(r, 200));
      }
    }

    console.log(`[Update IG Names] Total names resolved: ${nameMap.size}`);

    // Now update conversations with resolved names
    const { data: allConvs } = await supabase
      .from('omnichat_conversations')
      .select('id, external_contact_id, contact_name')
      .eq('channel', 'instagram');

    const results: Array<{ id: string; old_name: string | null; new_name: string | null; status: string }> = [];

    for (const conv of (allConvs || [])) {
      const resolvedName = nameMap.get(conv.external_contact_id);
      if (resolvedName && resolvedName !== conv.contact_name) {
        await supabase.from('omnichat_conversations')
          .update({ contact_name: resolvedName })
          .eq('id', conv.id);
        
        await supabase.from('channel_messages')
          .update({ contact_name: resolvedName })
          .eq('contact_instagram_id', conv.external_contact_id);

        results.push({ id: conv.id, old_name: conv.contact_name, new_name: resolvedName, status: 'updated' });
      } else {
        results.push({ 
          id: conv.id, 
          old_name: conv.contact_name, 
          new_name: resolvedName || null, 
          status: resolvedName ? 'no_change' : 'not_resolved' 
        });
      }
    }

    const updated = results.filter(r => r.status === 'updated').length;

    return new Response(JSON.stringify({
      message: `Updated ${updated} of ${results.length} conversations`,
      names_resolved: nameMap.size,
      updated,
      total: results.length,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Update IG Names] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
