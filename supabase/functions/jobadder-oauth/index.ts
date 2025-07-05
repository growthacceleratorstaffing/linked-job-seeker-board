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
    const { action, code, state, redirectUri } = await req.json();
    
    const jobadderClientId = Deno.env.get('JOBADDER_CLIENT_ID');
    const jobadderClientSecret = Deno.env.get('JOBADDER_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!jobadderClientId || !jobadderClientSecret) {
      return new Response(
        JSON.stringify({ error: 'JobAdder OAuth configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case 'get_auth_url': {
        // Generate state parameter for security
        const authState = crypto.randomUUID();
        const baseUrl = redirectUri || `${new URL(req.url).origin}`;
        const callbackUrl = `${baseUrl}/auth/jobadder/callback`;
        
        // Define required scopes based on JobAdder documentation
        const scopes = [
          'read',
          'read_candidate',
          'write_candidate', 
          'read_company',
          'write_company',
          'read_contact',
          'write_contact',
          'read_job',
          'write_job',
          'read_jobad',
          'write_jobad',
          'read_jobapplication',
          'write_jobapplication',
          'read_placement',
          'write_placement',
          'read_user',
          'partner_jobboard',
          'offline_access'
        ].join(' ');

        const authUrl = new URL('https://id.jobadder.com/connect/authorize');
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('client_id', jobadderClientId);
        authUrl.searchParams.append('scope', scopes);
        authUrl.searchParams.append('redirect_uri', callbackUrl);
        authUrl.searchParams.append('state', authState);

        return new Response(
          JSON.stringify({ 
            success: true,
            authUrl: authUrl.toString(),
            state: authState,
            callbackUrl
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'exchange_code': {
        console.log('Exchanging authorization code for access token...');
        
        // Get the authenticated user
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          throw new Error('Authorization header missing');
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );

        if (userError || !user) {
          throw new Error('Authentication failed');
        }

        // Exchange authorization code for access token
        const tokenUrl = 'https://id.jobadder.com/connect/token';
        const tokenParams = new URLSearchParams({
          client_id: jobadderClientId,
          client_secret: jobadderClientSecret,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri
        });

        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: tokenParams
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Token exchange failed:', errorText);
          throw new Error(`Token exchange failed: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('Token exchange successful');

        // Calculate expiration time
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

        // Store the token in the database
        const { data: tokenRecord, error: tokenError } = await supabase
          .from('jobadder_tokens')
          .upsert({
            user_id: user.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: expiresAt.toISOString(),
            token_type: tokenData.token_type || 'Bearer',
            api_base_url: tokenData.api || 'https://api.jobadder.com/v2',
            scopes: tokenData.scope ? tokenData.scope.split(' ') : []
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single();

        if (tokenError) {
          console.error('Failed to store token:', tokenError);
          throw new Error('Failed to store authentication token');
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'JobAdder authentication successful',
            expiresAt: expiresAt.toISOString(),
            apiBaseUrl: tokenData.api || 'https://api.jobadder.com/v2'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'refresh_token': {
        console.log('Refreshing JobAdder access token...');
        
        // Get the authenticated user
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          throw new Error('Authorization header missing');
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );

        if (userError || !user) {
          throw new Error('Authentication failed');
        }

        // Get existing token record
        const { data: tokenRecord, error: tokenError } = await supabase
          .from('jobadder_tokens')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (tokenError || !tokenRecord) {
          throw new Error('No JobAdder token found for user');
        }

        if (!tokenRecord.refresh_token) {
          throw new Error('No refresh token available');
        }

        // Refresh the access token
        const tokenUrl = 'https://id.jobadder.com/connect/token';
        const tokenParams = new URLSearchParams({
          client_id: jobadderClientId,
          client_secret: jobadderClientSecret,
          grant_type: 'refresh_token',
          refresh_token: tokenRecord.refresh_token
        });

        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: tokenParams
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Token refresh failed:', errorText);
          throw new Error(`Token refresh failed: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('Token refresh successful');

        // Calculate new expiration time
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

        // Update the token record
        const { error: updateError } = await supabase
          .from('jobadder_tokens')
          .update({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || tokenRecord.refresh_token,
            expires_at: expiresAt.toISOString(),
            token_type: tokenData.token_type || 'Bearer',
            api_base_url: tokenData.api || tokenRecord.api_base_url
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Failed to update token:', updateError);
          throw new Error('Failed to update authentication token');
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'JobAdder token refreshed successfully',
            expiresAt: expiresAt.toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_token_status': {
        // Get the authenticated user  
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          throw new Error('Authorization header missing');
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );

        if (userError || !user) {
          throw new Error('Authentication failed');
        }

        // Get token record
        const { data: tokenRecord, error: tokenError } = await supabase
          .from('jobadder_tokens')
          .select('expires_at, api_base_url, scopes')
          .eq('user_id', user.id)
          .single();

        if (tokenError) {
          return new Response(
            JSON.stringify({ 
              success: true,
              hasToken: false,
              message: 'No JobAdder authentication found'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const isExpired = new Date(tokenRecord.expires_at) <= new Date();

        return new Response(
          JSON.stringify({ 
            success: true,
            hasToken: true,
            isExpired,
            expiresAt: tokenRecord.expires_at,
            apiBaseUrl: tokenRecord.api_base_url,
            scopes: tokenRecord.scopes
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
    console.error('Error in jobadder-oauth function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});