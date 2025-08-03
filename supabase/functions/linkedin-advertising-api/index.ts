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
    const linkedinAccessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN');
    
    console.log('Environment check:', {
      hasClientId: !!linkedinClientId,
      hasClientSecret: !!linkedinClientSecret,
      hasAccessToken: !!linkedinAccessToken,
      userId: user.id
    });
    
    if (!linkedinClientId || !linkedinClientSecret) {
      throw new Error('LinkedIn credentials not configured in environment');
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
      accessToken = linkedinAccessToken || '';
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
    console.log('Processing action:', action);

    let result;

    switch (action) {
      case 'testCredentials':
        result = {
          hasClientId: !!linkedinClientId,
          hasClientSecret: !!linkedinClientSecret,
          hasAccessToken: !!accessToken,
          tokenLength: accessToken ? accessToken.length : 0
        };
        break;
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
      case 'createCreative':
        result = await createCreative(accessToken, params);
        break;
      case 'updateCampaign':
        result = await updateCampaign(accessToken, params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in linkedin-advertising-api function:', error);
    
    // Return more detailed error information
    const errorResponse = {
      error: error.message || 'Internal server error',
      details: error.stack || 'No stack trace available',
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function testConnection(accessToken: string) {
  try {
    console.log('Testing LinkedIn Marketing API connection...');
    
    // Use the Marketing API for testing connection with advertising permissions
    const response = await fetch('https://api.linkedin.com/v2/adAccountsV2?q=search&search=(status:(values:List(ACTIVE)))&projection=(elements*(id,name,type,status,currency))&start=0&count=1', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202410',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    const responseText = await response.text();
    console.log(`LinkedIn Marketing API response: ${response.status} - ${responseText}`);

    if (response.ok) {
      console.log('LinkedIn Marketing API connection successful');
      return { connected: true };
    } else {
      console.error('LinkedIn Marketing API connection failed:', responseText);
      // Try to parse error for better message
      let errorMessage = `API Error: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        errorMessage = responseText;
      }
      return { connected: false, error: errorMessage };
    }
  } catch (error) {
    console.error('LinkedIn Marketing API connection error:', error);
    return { connected: false, error: error.message };
  }
}

async function getAdAccounts(accessToken: string, supabase: any, userId: string): Promise<{ accounts: LinkedInAdAccount[] }> {
  try {
    console.log('Fetching LinkedIn ad accounts using Marketing API...');
    
    // Use Marketing API v2 for ad accounts
    const response = await fetch('https://api.linkedin.com/v2/adAccountsV2?q=search&search=(status:(values:List(ACTIVE)))&projection=(elements*(id,name,type,status,currency))&start=0&count=100', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202410',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    const responseText = await response.text();
    console.log(`Ad accounts Marketing API response: ${response.status} - ${responseText}`);

    if (!response.ok) {
      console.error('Failed to fetch ad accounts:', responseText);
      throw new Error(`LinkedIn Marketing API error: ${responseText}`);
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

async function getCampaigns(accessToken: string, accountId: string): Promise<{ campaigns: LinkedInCampaign[] }> {
  try {
    console.log('Fetching LinkedIn campaigns for account:', accountId);
    
    const response = await fetch(`https://api.linkedin.com/v2/adCampaignsV2?q=search&search=(account:(values:List(urn:li:sponsoredAccount:${accountId})))&projection=(elements*(id,name,status,account,campaignGroup,runSchedule,dailyBudget,totalBudget,costType,unitCost,objectiveType))`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'LinkedIn-Version': '202410',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    const responseText = await response.text();
    console.log(`Campaigns API response: ${response.status} - ${responseText}`);

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    const campaigns: LinkedInCampaign[] = data.elements?.map((campaign: any) => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      account: campaign.account,
      campaignGroup: campaign.campaignGroup,
      runSchedule: campaign.runSchedule,
      budget: campaign.dailyBudget || campaign.totalBudget,
      costType: campaign.costType,
      unitCost: campaign.unitCost,
      objective: campaign.objectiveType
    })) || [];

    return { campaigns };
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    throw error;
  }
}

async function createCampaign(accessToken: string, params: any) {
  try {
    console.log('Creating LinkedIn campaign with params:', params);
    
    const campaignPayload = {
      name: params.name,
      status: 'PAUSED',
      type: 'SPONSORED_CONTENT',
      account: `urn:li:sponsoredAccount:${params.account}`,
      campaignGroup: `urn:li:sponsoredCampaignGroup:${params.campaignGroup}`,
      costType: params.costType || 'CPC',
      dailyBudget: {
        amount: params.budget,
        currencyCode: params.currency || 'USD'
      },
      unitCost: {
        amount: params.bidAmount || 5.00,
        currencyCode: params.currency || 'USD'
      },
      objectiveType: params.objective || 'BRAND_AWARENESS',
      runSchedule: {
        start: Date.now(),
        end: params.endDate ? new Date(params.endDate).getTime() : Date.now() + (30 * 24 * 60 * 60 * 1000)
      }
    };

    const response = await fetch('https://api.linkedin.com/v2/adCampaignsV2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202410',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(campaignPayload)
    });

    const responseText = await response.text();
    console.log(`Create campaign response: ${response.status} - ${responseText}`);

    if (!response.ok) {
      throw new Error(`Failed to create campaign: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    return { success: true, campaign: result };
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }
}

async function createCreative(accessToken: string, params: any) {
  try {
    console.log('Creating LinkedIn creative with params:', params);
    
    const creativePayload = {
      account: `urn:li:sponsoredAccount:${params.accountId}`,
      name: params.name,
      type: 'SPONSORED_CONTENT',
      status: 'ACTIVE',
      content: {
        title: params.name,
        description: params.description || '',
        clickUri: params.clickUri || ''
      }
    };

    const response = await fetch('https://api.linkedin.com/v2/adCreativesV2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202410',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(creativePayload)
    });

    const responseText = await response.text();
    console.log(`Create creative response: ${response.status} - ${responseText}`);

    if (!response.ok) {
      throw new Error(`Failed to create creative: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    return { success: true, creative: result };
  } catch (error) {
    console.error('Error creating creative:', error);
    throw error;
  }
}

async function updateCampaign(accessToken: string, params: any) {
  try {
    console.log('Updating LinkedIn campaign:', params.campaignId, 'with data:', params.updateData);
    
    const response = await fetch(`https://api.linkedin.com/v2/adCampaignsV2/${params.campaignId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202410',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(params.updateData)
    });

    const responseText = await response.text();
    console.log(`Update campaign response: ${response.status} - ${responseText}`);

    if (!response.ok) {
      throw new Error(`Failed to update campaign: ${responseText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating campaign:', error);
    throw error;
  }
}