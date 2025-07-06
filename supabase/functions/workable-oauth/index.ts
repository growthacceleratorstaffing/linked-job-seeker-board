import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.10";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, redirectUri } = await req.json();

    const workableClientId = Deno.env.get('WORKABLE_CLIENT_ID');
    const workableClientSecret = Deno.env.get('WORKABLE_CLIENT_SECRET');
    const workableSubdomain = Deno.env.get('WORKABLE_SUBDOMAIN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!workableClientId || !workableClientSecret || !workableSubdomain) {
      return new Response(
        JSON.stringify({ error: 'Workable OAuth configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanSubdomain = workableSubdomain.replace('.workable.com', '');

    switch (action) {
      case 'get_auth_url': {
        console.log('🔗 Generating Workable OAuth authorization URL...');
        
        const authUrl = `https://${cleanSubdomain}.workable.com/oauth/authorize?` +
          `client_id=${workableClientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri + '/auth/workable/callback')}&` +
          `response_type=code&` +
          `scope=r_candidates+r_jobs+r_members`;

        return new Response(
          JSON.stringify({ authUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'exchange_code': {
        console.log('🔑 Exchanging authorization code for access token...');
        
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error('Supabase configuration missing');
        }

        // Exchange authorization code for access token
        const tokenResponse = await fetch(`https://${cleanSubdomain}.workable.com/oauth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: workableClientId,
            client_secret: workableClientSecret,
            code: code,
            redirect_uri: redirectUri + '/auth/workable/callback'
          })
        });

        if (!tokenResponse.ok) {
          throw new Error(`Token exchange failed: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('✅ Token exchange successful');

        // Get user info from Workable
        const userResponse = await fetch(`https://${cleanSubdomain}.workable.com/spi/v3/members/me`, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!userResponse.ok) {
          throw new Error(`Failed to get user info: ${userResponse.status}`);
        }

        const userData = await userResponse.json();
        console.log('📋 User data retrieved:', userData.email);

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Store/update the user in workable_users table
        const { data: existingUser } = await supabase
          .from('workable_users')
          .select('*')
          .eq('workable_email', userData.email)
          .single();

        if (existingUser) {
          // Update existing user
          await supabase
            .from('workable_users')
            .update({
              workable_user_id: userData.id,
              workable_role: userData.role,
              updated_at: new Date().toISOString()
            })
            .eq('workable_email', userData.email);
        } else {
          // Create new user entry
          await supabase
            .from('workable_users')
            .insert([{
              workable_email: userData.email,
              workable_user_id: userData.id,
              workable_role: userData.role || 'reviewer'
            }]);
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            user: userData,
            message: 'Workable account linked successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync_members': {
        console.log('👥 Syncing Workable members...');
        
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error('Supabase configuration missing');
        }

        const workableApiToken = Deno.env.get('WORKABLE_API_TOKEN');
        if (!workableApiToken) {
          throw new Error('Workable API token missing');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get all members from Workable
        const membersResponse = await fetch(`https://${cleanSubdomain}.workable.com/spi/v3/members`, {
          headers: {
            'Authorization': `Bearer ${workableApiToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!membersResponse.ok) {
          throw new Error(`Failed to fetch members: ${membersResponse.status}`);
        }

        const membersData = await membersResponse.json();
        const members = membersData.members || [];

        console.log(`📊 Found ${members.length} members in Workable`);

        // Sync members to database
        let syncedCount = 0;
        for (const member of members) {
          if (member.active && member.email) {
            const { error } = await supabase
              .from('workable_users')
              .upsert({
                workable_email: member.email,
                workable_user_id: member.id,
                workable_role: member.role || 'reviewer',
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'workable_email'
              });

            if (!error) {
              syncedCount++;
            } else {
              console.error(`Failed to sync member ${member.email}:`, error);
            }
          }
        }

        console.log(`✅ Synced ${syncedCount}/${members.length} members`);

        return new Response(
          JSON.stringify({ 
            success: true,
            totalMembers: members.length,
            syncedMembers: syncedCount,
            message: `Synced ${syncedCount} Workable members`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error in workable-oauth function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});