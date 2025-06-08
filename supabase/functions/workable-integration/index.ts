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
    const { action, jobData, jobId, candidateData } = await req.json();
    
    const workableApiToken = Deno.env.get('WORKABLE_API_TOKEN');
    const workableSubdomain = Deno.env.get('WORKABLE_SUBDOMAIN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!workableApiToken || !workableSubdomain) {
      return new Response(
        JSON.stringify({ error: 'Workable credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    // Use the Workable Recruiting API (different from SPI) for job creation
    const cleanSubdomain = workableSubdomain.replace('.workable.com', '');
    
    const headers = {
      'Authorization': `Bearer ${workableApiToken}`,
      'Content-Type': 'application/json',
    };

    console.log('Clean subdomain:', cleanSubdomain);
    console.log('API Token present:', !!workableApiToken);

    // Ensure integration settings exist and are enabled
    await ensureIntegrationSettings(supabase);

    switch (action) {
      case 'sync_candidates': {
        // Use SPI v3 for reading data
        const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        
        // Log sync start
        const { data: syncLog } = await supabase
          .from('integration_sync_logs')
          .insert([{
            integration_type: 'workable',
            sync_type: 'candidate_sync',
            status: 'in_progress',
            synced_data: { 
              action: 'sync_candidates',
              timestamp: new Date().toISOString()
            }
          }])
          .select()
          .single();

        // First get all jobs to then fetch candidates for each
        const jobsResponse = await fetch(`${spiBaseUrl}/jobs?state=published&limit=50`, {
          method: 'GET',
          headers,
        });

        if (!jobsResponse.ok) {
          throw new Error(`Failed to fetch jobs: ${jobsResponse.status}`);
        }

        const jobsData = await jobsResponse.json();
        const jobs = jobsData.jobs || [];
        let totalCandidates = 0;
        let syncedCandidates = 0;
        let errors: string[] = [];

        for (const job of jobs) {
          try {
            console.log(`Fetching candidates for job: ${job.shortcode}`);
            const candidatesResponse = await fetch(`${spiBaseUrl}/jobs/${job.shortcode}/candidates`, {
              method: 'GET',
              headers,
            });

            if (candidatesResponse.ok) {
              const candidatesData = await candidatesResponse.json();
              const candidates = candidatesData.candidates || [];
              totalCandidates += candidates.length;
              console.log(`Found ${candidates.length} candidates for job ${job.shortcode}`);

              for (const candidate of candidates) {
                try {
                  await syncCandidateToSupabase(supabase, candidate, job.id);
                  syncedCandidates++;
                } catch (error) {
                  console.error(`Failed to sync candidate ${candidate.id}:`, error);
                  errors.push(`Candidate ${candidate.id}: ${error.message}`);
                }
              }
            } else {
              console.error(`Failed to fetch candidates for job ${job.shortcode}: ${candidatesResponse.status}`);
              errors.push(`Job ${job.shortcode}: HTTP ${candidatesResponse.status}`);
            }
          } catch (error) {
            console.error(`Failed to fetch candidates for job ${job.shortcode}:`, error);
            errors.push(`Job ${job.shortcode}: ${error.message}`);
          }
        }

        // Update sync log with completion
        await supabase
          .from('integration_sync_logs')
          .update({
            status: 'success',
            completed_at: new Date().toISOString(),
            synced_data: { 
              totalCandidates, 
              syncedCandidates,
              jobsProcessed: jobs.length,
              errors: errors.slice(0, 10), // Limit errors to avoid payload size issues
              timestamp: new Date().toISOString()
            }
          })
          .eq('id', syncLog?.id);

        // Update integration settings last sync
        await supabase
          .from('integration_settings')
          .update({
            last_sync_at: new Date().toISOString(),
          })
          .eq('integration_type', 'workable');

        return new Response(
          JSON.stringify({ 
            success: true, 
            totalCandidates,
            syncedCandidates,
            jobsProcessed: jobs.length,
            errors: errors.length > 0 ? errors : undefined,
            message: `Synced ${syncedCandidates} out of ${totalCandidates} candidates from Workable`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_candidate': {
        if (!candidateData.workableId) {
          throw new Error('Workable candidate ID is required');
        }

        const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        const response = await fetch(`${spiBaseUrl}/candidates/${candidateData.workableId}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to get candidate: ${response.status}`);
        }

        const candidate = await response.json();
        
        return new Response(
          JSON.stringify({ success: true, candidate }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'publish_job': {
        console.log('Publishing job to Workable:', jobData.title);
        
        // Clean and validate job title
        const cleanTitle = jobData.title
          .replace(/^#\s*/, '')
          .replace(/Job Title:\s*/i, '')
          .trim();
        
        // Convert markdown description to plain text and limit length
        let cleanDescription = jobData.description
          .replace(/#{1,6}\s/g, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/- /g, '• ')
          .trim();

        // Limit description length to prevent API issues
        if (cleanDescription.length > 5000) {
          cleanDescription = cleanDescription.substring(0, 5000) + '...';
        }

        // Use the Workable Recruiting API instead of SPI for job creation
        const recruitingApiUrl = `https://${cleanSubdomain}.workable.com/api/v1/jobs`;
        
        // Workable Recruiting API job payload
        const workableJob = {
          title: cleanTitle,
          description: cleanDescription,
          state: 'draft',
          employment_type: jobData.employment_type || 'full_time',
          department: jobData.department || 'General'
        };

        console.log('Using Recruiting API URL:', recruitingApiUrl);
        console.log('Job payload for Recruiting API:', JSON.stringify(workableJob, null, 2));

        // Try the Recruiting API first
        const response = await fetch(recruitingApiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(workableJob),
        });

        console.log('Workable Recruiting API response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('Workable API response body:', responseText);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorData.error || errorMessage;
            console.error('Workable API error details:', errorData);
            
            // Check if it's an authentication issue
            if (response.status === 401) {
              errorMessage = 'Authentication failed. Please check your Workable API token.';
            } else if (response.status === 403) {
              errorMessage = 'Access forbidden. Please check your Workable API permissions.';
            } else if (response.status === 404) {
              errorMessage = 'API endpoint not found. Please verify your Workable account has job creation permissions and try the SPI API instead.';
            } else if (response.status === 422) {
              errorMessage = `Validation error: ${errorData.message || 'Invalid job data provided'}`;
            }
          } catch (e) {
            console.error('Could not parse error response:', responseText);
          }
          
          throw new Error(`Failed to publish job via Recruiting API: ${errorMessage}`);
        }

        let publishedJob;
        try {
          publishedJob = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse successful response:', responseText);
          throw new Error('Received invalid response from Workable API');
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            job: publishedJob,
            message: 'Job created successfully in Workable! You can review and publish it manually when ready.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync_jobs': {
        console.log('Syncing jobs from Workable...');
        
        const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        const [publishedResponse, archivedResponse] = await Promise.all([
          fetch(`${spiBaseUrl}/jobs?state=published&limit=50`, {
            method: 'GET',
            headers,
          }),
          fetch(`${spiBaseUrl}/jobs?state=archived&limit=50`, {
            method: 'GET',
            headers,
          })
        ]);

        if (!publishedResponse.ok) {
          throw new Error(`Failed to sync published jobs: ${publishedResponse.status}`);
        }

        if (!archivedResponse.ok) {
          throw new Error(`Failed to sync archived jobs: ${archivedResponse.status}`);
        }

        const publishedData = await publishedResponse.json();
        const archivedData = await archivedResponse.json();
        
        const allJobs = [
          ...(publishedData.jobs || []),
          ...(archivedData.jobs || [])
        ];
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            jobs: allJobs,
            total: allJobs.length,
            published: publishedData.jobs?.length || 0,
            archived: archivedData.jobs?.length || 0
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
    console.error('Error in workable-integration function:', error);
    
    // Log failed sync attempt
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
      
      await supabase
        .from('integration_sync_logs')
        .insert([{
          integration_type: 'workable',
          sync_type: 'error',
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString(),
          synced_data: { 
            error: error.message,
            timestamp: new Date().toISOString()
          }
        }]);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function ensureIntegrationSettings(supabase: any) {
  // Check if settings exist
  const { data: existingSettings } = await supabase
    .from('integration_settings')
    .select('*');

  const linkedinExists = existingSettings?.some((s: any) => s.integration_type === 'linkedin');
  const workableExists = existingSettings?.some((s: any) => s.integration_type === 'workable');

  const settingsToInsert = [];

  if (!linkedinExists) {
    settingsToInsert.push({
      integration_type: 'linkedin',
      is_enabled: true,
      sync_frequency_hours: 24,
      settings: { auto_sync_enabled: true }
    });
  }

  if (!workableExists) {
    settingsToInsert.push({
      integration_type: 'workable',
      is_enabled: true,
      sync_frequency_hours: 2,
      settings: { auto_sync_enabled: true, sync_jobs: true, sync_candidates: true }
    });
  }

  if (settingsToInsert.length > 0) {
    await supabase
      .from('integration_settings')
      .insert(settingsToInsert);
  }
}

async function syncCandidateToSupabase(supabase: any, workableCandidate: any, jobId: string) {
  console.log(`Syncing candidate: ${workableCandidate.name} (${workableCandidate.email})`);
  
  const candidateData = {
    name: workableCandidate.name || 'Unknown',
    email: workableCandidate.email || `unknown_${workableCandidate.id}@workable.com`,
    phone: workableCandidate.phone,
    workable_candidate_id: workableCandidate.id,
    source_platform: 'workable',
    location: workableCandidate.address,
    current_position: workableCandidate.headline,
    company: workableCandidate.company,
    skills: workableCandidate.skills ? [workableCandidate.skills] : [],
    last_synced_at: new Date().toISOString(),
    profile_completeness_score: calculateCompletenessScore(workableCandidate)
  };

  // Check if candidate already exists by email
  const { data: existingCandidate } = await supabase
    .from('candidates')
    .select('*')
    .eq('email', candidateData.email)
    .maybeSingle();

  let candidateId;

  if (existingCandidate) {
    // Update existing candidate
    const { data, error } = await supabase
      .from('candidates')
      .update({
        workable_candidate_id: candidateData.workable_candidate_id,
        source_platform: existingCandidate.source_platform === 'manual' ? 'workable' : existingCandidate.source_platform,
        location: candidateData.location || existingCandidate.location,
        current_position: candidateData.current_position || existingCandidate.current_position,
        company: candidateData.company || existingCandidate.company,
        skills: candidateData.skills.length > 0 ? candidateData.skills : existingCandidate.skills,
        last_synced_at: candidateData.last_synced_at,
        profile_completeness_score: candidateData.profile_completeness_score
      })
      .eq('id', existingCandidate.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating candidate:', error);
      throw error;
    }
    candidateId = existingCandidate.id;
    console.log(`Updated existing candidate: ${candidateData.name}`);
  } else {
    // Create new candidate
    const { data, error } = await supabase
      .from('candidates')
      .insert([candidateData])
      .select()
      .single();

    if (error) {
      console.error('Error creating candidate:', error);
      throw error;
    }
    candidateId = data.id;
    console.log(`Created new candidate: ${candidateData.name}`);
  }

  // Create or update candidate response record
  const { error: responseError } = await supabase
    .from('candidate_responses')
    .upsert([{
      candidate_id: candidateId,
      job_id: jobId,
      response_type: 'application',
      status: workableCandidate.stage || 'new',
      source: 'workable',
      responded_at: workableCandidate.created_at || new Date().toISOString()
    }], {
      onConflict: 'candidate_id,job_id'
    });

  if (responseError) {
    console.error('Failed to create candidate response:', responseError);
  }

  return candidateId;
}

function calculateCompletenessScore(candidate: any): number {
  let score = 0;
  const fields = ['name', 'email', 'phone', 'address', 'headline', 'company'];
  
  fields.forEach(field => {
    if (candidate[field]) score += Math.floor(100 / fields.length);
  });
  
  return Math.min(score, 100);
}
