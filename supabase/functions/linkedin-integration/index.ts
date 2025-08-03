
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
    const { action, candidateData, accessToken, type, ...jobData } = await req.json();
    
    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
    const linkedinAccessToken = Deno.env.get('LINKEDIN_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!linkedinClientId || !linkedinClientSecret) {
      return new Response(
        JSON.stringify({ error: 'LinkedIn credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    switch (action) {
      case 'getCredentialsStatus': {
        // Check if credentials are configured
        const credentialsStatus = {
          clientId: !!linkedinClientId,
          clientSecret: !!linkedinClientSecret,
          accessToken: !!linkedinAccessToken
        };

        return new Response(
          JSON.stringify(credentialsStatus),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'testConnection': {
        // Get user's LinkedIn token from database
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          return new Response(
            JSON.stringify({ connected: false, error: 'No authorization header' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
          return new Response(
            JSON.stringify({ connected: false, error: 'Authentication failed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if user has LinkedIn token stored
        const { data: tokenData } = await supabase
          .from('linkedin_user_tokens')
          .select('access_token')
          .eq('user_id', user.id)
          .single();

        // Use access token from database or fallback to system token
        let accessTokenToUse = tokenData?.access_token;
        
        if (!accessTokenToUse && linkedinAccessToken) {
          console.log('No user token found, using system token');
          accessTokenToUse = linkedinAccessToken;
          
          // Store the system access token for the user
          try {
            await supabase
              .from('linkedin_user_tokens')
              .upsert({
                user_id: user.id,
                access_token: linkedinAccessToken,
                scope: 'openid profile email w_ads_reporting rw_ads',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
          } catch (error) {
            console.error('Failed to store token:', error);
          }
        }

        if (!accessTokenToUse) {
          return new Response(
            JSON.stringify({ connected: false, error: 'No LinkedIn access token available' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Test the connection with LinkedIn API
        try {
          console.log('Testing LinkedIn connection...');
          
          const testResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: {
              'Authorization': `Bearer ${accessTokenToUse}`,
              'Content-Type': 'application/json',
            },
          });

          const responseText = await testResponse.text();
          console.log(`LinkedIn API response: ${testResponse.status} - ${responseText}`);

          if (testResponse.ok) {
            const profileData = JSON.parse(responseText);
            return new Response(
              JSON.stringify({ 
                connected: true, 
                profile: profileData,
                message: 'Successfully connected to LinkedIn'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            let errorMessage = 'LinkedIn API test failed';
            try {
              const errorData = JSON.parse(responseText);
              if (errorData.error_description) {
                errorMessage = errorData.error_description;
              } else if (errorData.message) {
                errorMessage = errorData.message;
              }
            } catch (e) {
              errorMessage = `LinkedIn API error: ${testResponse.status} - ${responseText}`;
            }
            
            return new Response(
              JSON.stringify({ connected: false, error: errorMessage }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (error) {
          console.error('Connection test error:', error);
          return new Response(
            JSON.stringify({ connected: false, error: `Connection test failed: ${error.message}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'getProfile': {
        // Get user's LinkedIn token and fetch profile
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          throw new Error('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
          throw new Error('Authentication failed');
        }

        const { data: tokenData } = await supabase
          .from('linkedin_user_tokens')
          .select('access_token')
          .eq('user_id', user.id)
          .single();

        if (!tokenData?.access_token) {
          throw new Error('No LinkedIn token found');
        }

        const profileResponse = await fetch('https://api.linkedin.com/v2/people/~', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!profileResponse.ok) {
          throw new Error(`LinkedIn API error: ${profileResponse.status}`);
        }

        const profile = await profileResponse.json();
        
        return new Response(
          JSON.stringify({ success: true, profile }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'refreshToken': {
        // For now, just redirect to reconnect since LinkedIn doesn't provide refresh tokens in basic flow
        return new Response(
          JSON.stringify({ success: false, error: 'Please reconnect your LinkedIn account' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_profile': {
        if (!accessToken) {
          throw new Error('Access token is required');
        }

        const profileResponse = await fetch('https://api.linkedin.com/v2/people/~', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!profileResponse.ok) {
          throw new Error(`LinkedIn API error: ${profileResponse.status}`);
        }

        const profile = await profileResponse.json();
        
        return new Response(
          JSON.stringify({ success: true, profile }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'import_candidate': {
        if (!candidateData.email) {
          throw new Error('Email is required to import candidate');
        }

        // Check if candidate already exists
        const { data: existingCandidate } = await supabase
          .from('candidates')
          .select('*')
          .eq('email', candidateData.email)
          .single();

        let candidateId;
        
        if (existingCandidate) {
          // Update existing candidate with LinkedIn data
          const { data: updatedCandidate, error } = await supabase
            .from('candidates')
            .update({
              linkedin_profile_url: candidateData.linkedin_profile_url,
              linkedin_id: candidateData.linkedin_id,
              profile_picture_url: candidateData.profile_picture_url,
              location: candidateData.location,
              current_position: candidateData.current_position,
              company: candidateData.company,
              skills: candidateData.skills || [],
              experience_years: candidateData.experience_years,
              education: candidateData.education || [],
              source_platform: existingCandidate.source_platform === 'manual' ? 'linkedin' : existingCandidate.source_platform,
              last_synced_at: new Date().toISOString(),
              profile_completeness_score: calculateCompletenessScore({...existingCandidate, ...candidateData})
            })
            .eq('id', existingCandidate.id)
            .select()
            .single();

          if (error) throw error;
          candidateId = existingCandidate.id;
        } else {
          // Create new candidate
          const { data: newCandidate, error } = await supabase
            .from('candidates')
            .insert([{
              name: candidateData.name,
              email: candidateData.email,
              phone: candidateData.phone,
              linkedin_profile_url: candidateData.linkedin_profile_url,
              linkedin_id: candidateData.linkedin_id,
              profile_picture_url: candidateData.profile_picture_url,
              location: candidateData.location,
              current_position: candidateData.current_position,
              company: candidateData.company,
              skills: candidateData.skills || [],
              experience_years: candidateData.experience_years,
              education: candidateData.education || [],
              source_platform: 'linkedin',
              last_synced_at: new Date().toISOString(),
              profile_completeness_score: calculateCompletenessScore(candidateData)
            }])
            .select()
            .single();

          if (error) throw error;
          candidateId = newCandidate.id;
        }

        // Log the sync operation
        await supabase
          .from('integration_sync_logs')
          .insert([{
            integration_type: 'linkedin',
            sync_type: 'candidate_import',
            candidate_id: candidateId,
            status: 'success',
            synced_data: candidateData
          }]);

        return new Response(
          JSON.stringify({ success: true, candidateId, message: 'Candidate imported from LinkedIn successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'enrich_candidate': {
        if (!candidateData.candidateId) {
          throw new Error('Candidate ID is required');
        }

        // Here you would typically search LinkedIn by email or name
        // For now, we'll simulate enrichment data
        const enrichmentData = {
          profile_picture_url: candidateData.profile_picture_url,
          current_position: candidateData.current_position,
          company: candidateData.company,
          location: candidateData.location,
          skills: candidateData.skills || [],
          last_synced_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('candidates')
          .update(enrichmentData)
          .eq('id', candidateData.candidateId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, candidate: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'linkedin_job_advertisement': {
        console.log('LinkedIn job advertisement request:', { type, jobData });
        
        if (!linkedinAccessToken) {
          throw new Error('LinkedIn access token not configured');
        }

        if (type === 'job-posting') {
          return await createJobPosting(linkedinAccessToken, jobData, supabase);
        } else if (type === 'sponsored-content') {
          return await createSponsoredContent(linkedinAccessToken, jobData, supabase);
        } else {
          throw new Error('Invalid advertisement type. Use "job-posting" or "sponsored-content"');
        }
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error in linkedin-integration function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createJobPosting(accessToken: string, jobData: any, supabase: any) {
  console.log('Creating LinkedIn job posting:', jobData);

  try {
    // First, get the organization ID (company page)
    const orgResponse = await fetch('https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (!orgResponse.ok) {
      const errorText = await orgResponse.text();
      console.error('Organization fetch error:', errorText);
      throw new Error(`Failed to get organization: ${orgResponse.status} ${errorText}`);
    }

    const orgData = await orgResponse.json();
    console.log('Organization data:', orgData);
    
    if (!orgData.elements || orgData.elements.length === 0) {
      throw new Error('No organization found. Make sure you have admin access to a LinkedIn company page.');
    }

    const organizationId = orgData.elements[0].organizationalTarget;
    console.log('Using organization ID:', organizationId);

    // Create job posting payload
    const jobPayload = {
      companyApplyUrl: `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'supabase.app')}/jobs/apply`,
      description: jobData.jobDescription,
      employmentStatus: jobData.employmentType || 'FULL_TIME',
      externalJobPostingId: `job_${Date.now()}`,
      listedAt: Date.now(),
      jobPostingOperationType: 'CREATE',
      integrationContext: organizationId,
      title: jobData.jobTitle,
      location: jobData.city ? {
        countryCode: 'US', // Default to US, should be made configurable
        city: jobData.city
      } : undefined,
      workplaceTypes: [jobData.workplaceType || 'REMOTE']
    };

    console.log('Job posting payload:', jobPayload);

    const response = await fetch('https://api.linkedin.com/v2/jobPostings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(jobPayload)
    });

    const responseText = await response.text();
    console.log('LinkedIn API response:', responseText);

    if (!response.ok) {
      throw new Error(`LinkedIn job posting failed: ${response.status} ${responseText}`);
    }

    const result = responseText ? JSON.parse(responseText) : { id: 'created' };
    
    // Save job to local database
    const { data: savedJob, error: jobError } = await supabase
      .from('jobs')
      .insert({
        title: jobData.jobTitle,
        job_description: jobData.jobDescription,
        location_name: jobData.city,
        work_type_name: jobData.workplaceType,
        category_name: jobData.jobFunction,
        source: 'LinkedIn API',
        created_by: null // Could be set to current user if available
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to save job locally:', jobError);
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Job posted to LinkedIn and saved locally!',
      jobId: result.id,
      localJobId: savedJob?.id,
      linkedinJobUrl: result.id ? `https://www.linkedin.com/jobs/view/${result.id}` : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Job posting error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      linkedinError: true
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function createSponsoredContent(accessToken: string, adData: any, supabase: any) {
  console.log('Creating LinkedIn sponsored content:', adData);

  try {
    // Get organization for sponsored content
    const orgResponse = await fetch('https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (!orgResponse.ok) {
      throw new Error(`Failed to get organization: ${orgResponse.status}`);
    }

    const orgData = await orgResponse.json();
    if (!orgData.elements || orgData.elements.length === 0) {
      throw new Error('No organization found for sponsored content.');
    }

    const organizationId = orgData.elements[0].organizationalTarget;

    // Create campaign first
    const campaignPayload = {
      name: adData.campaignName || `${adData.jobTitle} Campaign`,
      status: 'ACTIVE',
      type: 'SPONSORED_CONTENT',
      costType: 'CPM',
      dailyBudget: {
        amount: Math.round((adData.budget / adData.duration) * 100), // Convert to cents
        currencyCode: 'USD'
      },
      account: `urn:li:sponsoredAccount:${organizationId}`
    };

    const campaignResponse = await fetch('https://api.linkedin.com/v2/adCampaignsV2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(campaignPayload)
    });

    if (!campaignResponse.ok) {
      const errorText = await campaignResponse.text();
      throw new Error(`LinkedIn campaign creation failed: ${campaignResponse.status} ${errorText}`);
    }

    const campaign = await campaignResponse.json();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'LinkedIn advertisement campaign created successfully!',
      campaignId: campaign.id,
      campaignUrl: `https://www.linkedin.com/campaignmanager/accounts/${organizationId}/campaigns/${campaign.id}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sponsored content error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

function calculateCompletenessScore(candidate: any): number {
  let score = 0;
  const fields = [
    'name', 'email', 'phone', 'linkedin_profile_url', 'profile_picture_url',
    'location', 'current_position', 'company', 'skills', 'experience_years', 'education'
  ];
  
  fields.forEach(field => {
    if (candidate[field]) {
      if (Array.isArray(candidate[field])) {
        score += candidate[field].length > 0 ? 10 : 0;
      } else {
        score += 10;
      }
    }
  });
  
  return Math.min(score, 100);
}
