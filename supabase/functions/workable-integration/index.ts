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
    
    // Fix the base URL construction - use the API subdomain format
    const baseUrl = `https://${workableSubdomain}.workable.com/spi/v3`;
    
    const headers = {
      'Authorization': `Bearer ${workableApiToken}`,
      'Content-Type': 'application/json',
    };

    console.log('Using Workable API base URL:', baseUrl);
    console.log('API Token length:', workableApiToken.length);

    // Ensure integration settings exist and are enabled
    await ensureIntegrationSettings(supabase);

    switch (action) {
      case 'sync_candidates': {
        console.log('Syncing candidates from Workable...');
        
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
        const jobsResponse = await fetch(`${baseUrl}/jobs?state=published&limit=50`, {
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
            const candidatesResponse = await fetch(`${baseUrl}/jobs/${job.shortcode}/candidates`, {
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

        const response = await fetch(`${baseUrl}/candidates/${candidateData.workableId}`, {
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
        
        // Clean and validate job title - remove markdown formatting
        const cleanTitle = jobData.title
          .replace(/^#\s*/, '')
          .replace(/Job Title:\s*/i, '')
          .trim();
        
        // Convert markdown description to plain text for better compatibility
        const cleanDescription = jobData.description
          .replace(/#{1,6}\s/g, '') // Remove markdown headers
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
          .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
          .replace(/- /g, '• ') // Convert dashes to bullets
          .trim();

        const workableJob = {
          title: cleanTitle,
          full_title: cleanTitle,
          description: cleanDescription,
          requirements: jobData.requirements || '',
          benefits: jobData.benefits || '',
          employment_type: jobData.employment_type || 'full_time',
          experience: jobData.experience || 'experienced',
          education: jobData.education || 'not_specified',
          department: jobData.department || 'Engineering',
          function: jobData.function || 'Engineering',
          remote: jobData.remote || false,
          telecommuting: jobData.remote || false,
          state: 'archived', // Create as archived instead of published so you can review first
        };

        console.log('Prepared job data:', JSON.stringify(workableJob, null, 2));

        const response = await fetch(`${baseUrl}/jobs`, {
          method: 'POST',
          headers,
          body: JSON.stringify(workableJob),
        });

        console.log('Workable API response status:', response.status);
        const responseText = await response.text();
        console.log('Workable API response body:', responseText);

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorData.error || errorMessage;
            console.error('Workable API error details:', errorData);
          } catch (e) {
            console.error('Could not parse error response:', responseText);
          }
          
          throw new Error(`Failed to publish job: ${errorMessage}`);
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
            message: 'Job created as archived in Workable successfully! You can review and publish it manually when ready.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync_jobs': {
        console.log('Syncing jobs from Workable...');
        
        const [publishedResponse, archivedResponse] = await Promise.all([
          fetch(`${baseUrl}/jobs?state=published&limit=50`, {
            method: 'GET',
            headers,
          }),
          fetch(`${baseUrl}/jobs?state=archived&limit=50`, {
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
