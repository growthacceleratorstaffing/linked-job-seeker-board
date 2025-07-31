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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
    
    if (!linkedinClientId || !linkedinClientSecret) {
      throw new Error('LinkedIn credentials not configured');
    }

    const { action, ...params } = await req.json();

    let result;

    switch (action) {
      case 'getAuthUrl':
        result = await getAuthUrl(linkedinClientId, params);
        break;
      case 'exchangeCode':
        result = await exchangeCode(linkedinClientId, linkedinClientSecret, params, supabase, user.id);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getAuthUrl(clientId: string, params: any) {
  const scopes = params.scopes || ['openid', 'profile', 'email', 'w_ads_reporting', 'rw_ads'];
  const redirectUri = params.redirectUrl;
  const state = crypto.randomUUID();
  
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('scope', scopes.join(' '));
  authUrl.searchParams.append('response_type', 'code');
  
  return { authUrl: authUrl.toString(), state };
}

async function exchangeCode(clientId: string, clientSecret: string, params: any, supabase: any, userId: string) {
  const { code, redirectUrl } = params;
  
  const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUrl,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to exchange code for token');
  }

  const tokenData = await tokenResponse.json();
  
  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);
  
  // Store token in database
  const { error } = await supabase
    .from('linkedin_user_tokens')
    .upsert({
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt.toISOString(),
      scope: tokenData.scope,
    }, {
      onConflict: 'user_id'
    });

  if (error) throw error;

  return { success: true, tokenData };
}