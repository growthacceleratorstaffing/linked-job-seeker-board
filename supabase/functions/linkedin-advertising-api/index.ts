import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkedInAdAccount {
  id: string;
  name: string;
  type: string;
  status: string;
  currency?: string;
}

interface LinkedInCampaign {
  id: string;
  name: string;
  status: string;
  account: string;
  campaignGroup?: string;
  runSchedule?: any;
  budget?: any;
  costType?: string;
  unitCost?: any;
  objective?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Get LinkedIn credentials from environment
    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
    
    if (!linkedinClientId || !linkedinClientSecret) {
      throw new Error('LinkedIn credentials not configured');
    }

    // Get user-specific access token or global token
    let accessToken = '';
    
    // Try to get user-specific token first
    const { data: tokenData } = await supabase
      .from('linkedin_user_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .single();

    if (tokenData?.access_token) {
      accessToken = tokenData.access_token;
      console.log('Using user-specific token');
    } else {
      // Fallback to global token from secrets
      accessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN') || '';
      console.log('Using global token from secrets');
      
      // If we have a global token, store it for the user
      if (accessToken) {
        try {
          await supabase
            .from('linkedin_user_tokens')
            .upsert({
              user_id: user.id,
              access_token: accessToken,
              scope: 'openid profile email w_ads_reporting rw_ads',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          console.log('Stored global token for user');
        } catch (error) {
          console.error('Failed to store token for user:', error);
        }
      }
    }

    if (!accessToken) {
      console.error('No LinkedIn access token available');
      throw new Error('No LinkedIn access token available');
    }

    const { action, ...params } = await req.json();

    let result;

    switch (action) {
      case 'testConnection':
        result = await testConnection(accessToken);
        break;
      case 'getAdAccounts':
        result = await getAdAccounts(accessToken, supabase, user.id);
        break;
      case 'getCampaigns':
        result = await getCampaigns(accessToken, params.accountId);
        break;
      case 'createCampaign':
        result = await createCampaign(accessToken, params);
        break;
      case 'updateCampaign':
        result = await updateCampaign(accessToken, params.campaignId, params.updateData);
        break;
      case 'createCreative':
        result = await createCreative(accessToken, params, supabase, user.id);
        break;
      case 'getAccountCreatives':
        result = await getAccountCreatives(accessToken, params.accountId, supabase, user.id);
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

async function testConnection(accessToken: string) {
  try {
    console.log('Testing LinkedIn Ads API connection...');
    
    const response = await fetch('https://api.linkedin.com/rest/adAccounts?q=search&search=(status:(values:List(ACTIVE)))&pageSize=1', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    const responseText = await response.text();
    console.log(`LinkedIn Ads API response: ${response.status} - ${responseText}`);

    if (response.ok) {
      console.log('LinkedIn Ads API connection successful');
      return { connected: true };
    } else {
      console.error('LinkedIn Ads API connection failed:', responseText);
      return { connected: false, error: `API Error: ${response.status} - ${responseText}` };
    }
  } catch (error) {
    console.error('LinkedIn Ads API connection error:', error);
    return { connected: false, error: error.message };
  }
}

async function getAdAccounts(accessToken: string, supabase: any, userId: string): Promise<{ accounts: LinkedInAdAccount[] }> {
  try {
    console.log('Fetching LinkedIn ad accounts...');
    
    const response = await fetch('https://api.linkedin.com/rest/adAccounts?q=search&search=(status:(values:List(ACTIVE)))&pageSize=100', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    const responseText = await response.text();
    console.log(`Ad accounts API response: ${response.status} - ${responseText}`);

    if (!response.ok) {
      console.error('Failed to fetch ad accounts:', responseText);
      throw new Error(`LinkedIn API error: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('Ad accounts data:', data);

    const accounts: LinkedInAdAccount[] = data.elements?.map((account: any) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      status: account.status,
      currency: account.currency
    })) || [];

    console.log(`Found ${accounts.length} ad accounts`);

    // Store accounts in database
    for (const account of accounts) {
      try {
        await supabase
          .from('linkedin_ad_accounts')
          .upsert({
            user_id: userId,
            linkedin_account_id: account.id,
            name: account.name,
            type: account.type,
            status: account.status,
            currency: account.currency,
            updated_at: new Date().toISOString()
          });
        console.log(`Stored account: ${account.name} (${account.id})`);
      } catch (dbError) {
        console.error('Failed to store account:', account.id, dbError);
      }
    }

    return { accounts };
  } catch (error) {
    console.error('Error fetching ad accounts:', error);
    throw error;
  }
}

async function getCampaigns(accessToken: string, accountId?: string): Promise<{ campaigns: LinkedInCampaign[] }> {
  try {
    let url = 'https://api.linkedin.com/rest/adCampaigns?q=search&pageSize=100';
    
    if (accountId) {
      url = `https://api.linkedin.com/rest/adAccounts/${accountId}/adCampaigns?q=search&pageSize=100`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { campaigns: data.elements || [] };
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
}

async function createCampaign(accessToken: string, campaignData: any): Promise<{ campaign: any }> {
  try {
    const payload = {
      name: campaignData.name,
      type: campaignData.type,
      account: `urn:li:sponsoredAccount:${campaignData.account}`,
      campaignGroup: campaignData.campaignGroup ? `urn:li:sponsoredCampaignGroup:${campaignData.campaignGroup}` : undefined,
      status: 'DRAFT',
      costType: campaignData.costType || 'CPC',
      dailyBudget: {
        currencyCode: campaignData.currency || 'USD',
        amount: campaignData.budget.toString()
      },
      unitCost: {
        currencyCode: campaignData.currency || 'USD',
        amount: (campaignData.bidAmount || 5.0).toString()
      },
      objective: campaignData.objective || 'BRAND_AWARENESS'
    };

    const response = await fetch('https://api.linkedin.com/rest/adCampaigns', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LinkedIn API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return { campaign: result };
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }
}

async function updateCampaign(accessToken: string, campaignId: string, updateData: any): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`https://api.linkedin.com/rest/adCampaigns/${campaignId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating campaign:', error);
    throw error;
  }
}

async function createCreative(accessToken: string, creativeData: any, supabase: any, userId: string): Promise<{ creative: any }> {
  try {
    // Create Direct Sponsored Content first
    const contentPayload = {
      author: `urn:li:sponsoredAccount:${creativeData.accountId}`,
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
      content: {
        contentEntities: [],
        title: creativeData.name,
        landingPage: {
          url: creativeData.clickUri || 'https://example.com'
        }
      },
      isTest: false
    };

    if (creativeData.description) {
      contentPayload.content.commentary = creativeData.description;
    }

    const contentResponse = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contentPayload)
    });

    if (!contentResponse.ok) {
      const errorText = await contentResponse.text();
      throw new Error(`LinkedIn Content API error: ${contentResponse.status} ${errorText}`);
    }

    const contentResult = await contentResponse.json();
    const creativeId = contentResult.id;

    // Store in database
    await supabase
      .from('linkedin_creatives')
      .insert({
        id: creativeId,
        title: creativeData.name,
        description: creativeData.description,
        click_uri: creativeData.clickUri,
        account_id: creativeData.accountId,
        created_by: userId,
        status: 'ACTIVE',
        creative_data: contentResult
      });

    return { creative: contentResult };
  } catch (error) {
    console.error('Error creating creative:', error);
    throw error;
  }
}

async function getAccountCreatives(accessToken: string, accountId: string, supabase: any, userId: string): Promise<{ creatives: any[] }> {
  try {
    // First try to get from database
    const { data: dbCreatives } = await supabase
      .from('linkedin_creatives')
      .select('*')
      .eq('account_id', accountId)
      .eq('created_by', userId);

    if (dbCreatives && dbCreatives.length > 0) {
      return { creatives: dbCreatives };
    }

    // Fallback to API call
    const response = await fetch(`https://api.linkedin.com/rest/adAccounts/${accountId}/creatives?q=search&pageSize=100`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202407',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    if (!response.ok) {
      console.log(`API call failed with status ${response.status}, returning empty array`);
      return { creatives: [] };
    }

    const data = await response.json();
    return { creatives: data.elements || [] };
  } catch (error) {
    console.error('Error fetching creatives:', error);
    return { creatives: [] };
  }
}