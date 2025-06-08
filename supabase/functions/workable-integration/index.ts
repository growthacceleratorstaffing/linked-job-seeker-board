
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
    const baseUrl = workableSubdomain.includes('.workable.com') 
      ? `https://${workableSubdomain}/spi/v3`
      : `https://${workableSubdomain}.workable.com/spi/v3`;
    
    const headers = {
      'Authorization': `Bearer ${workableApiToken}`,
      'Content-Type': 'application/json',
    };

    console.log('Using Workable API base URL:', baseUrl);

    switch (action) {
      case 'sync_candidates': {
        console.log('Syncing candidates from Workable...');
        
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

        for (const job of jobs) {
          try {
            const candidatesResponse = await fetch(`${baseUrl}/jobs/${job.shortcode}/candidates`, {
              method: 'GET',
              headers,
            });

            if (candidatesResponse.ok) {
              const candidatesData = await candidatesResponse.json();
              const candidates = candidatesData.candidates || [];
              totalCandidates += candidates.length;

              for (const candidate of candidates) {
                try {
                  await syncCandidateToSupabase(supabase, candidate, job.id);
                  syncedCandidates++;
                } catch (error) {
                  console.error(`Failed to sync candidate ${candidate.id}:`, error);
                }
              }
            }
          } catch (error) {
            console.error(`Failed to fetch candidates for job ${job.shortcode}:`, error);
          }
        }

        // Log successful sync
        await supabase
          .from('integration_sync_logs')
          .insert([{
            integration_type: 'workable',
            sync_type: 'candidate_sync',
            status: 'success',
            synced_data: { 
              totalCandidates, 
              syncedCandidates,
              jobsProcessed: jobs.length,
              timestamp: new Date().toISOString()
            }
          }]);

        return new Response(
          JSON.stringify({ 
            success: true, 
            totalCandidates,
            syncedCandidates,
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
        
        const workableJob = {
          title: jobData.title,
          full_title: jobData.title,
          description: jobData.description,
          requirements: jobData.requirements || '',
          benefits: jobData.benefits || '',
          employment_type: jobData.employment_type || 'full_time',
          experience: jobData.experience || 'experienced',
          education: jobData.education || 'not_specified',
          department: jobData.department || 'Engineering',
          function: jobData.function || 'Engineering',
          remote: jobData.remote || false,
          telecommuting: jobData.remote || false,
        };

        const response = await fetch(`${baseUrl}/jobs`, {
          method: 'POST',
          headers,
          body: JSON.stringify(workableJob),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Workable API error:', response.status, errorText);
          throw new Error(`Failed to publish job: ${response.status}`);
        }

        const publishedJob = await response.json();
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            job: publishedJob,
            message: 'Job published to Workable successfully!'
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

async function syncCandidateToSupabase(supabase: any, workableCandidate: any, jobId: string) {
  const candidateData = {
    name: workableCandidate.name,
    email: workableCandidate.email,
    phone: workableCandidate.phone,
    workable_candidate_id: workableCandidate.id,
    source_platform: 'workable',
    last_synced_at: new Date().toISOString(),
    profile_completeness_score: calculateCompletenessScore(workableCandidate)
  };

  // Check if candidate already exists
  const { data: existingCandidate } = await supabase
    .from('candidates')
    .select('*')
    .eq('email', candidateData.email)
    .single();

  let candidateId;

  if (existingCandidate) {
    // Update existing candidate
    const { data, error } = await supabase
      .from('candidates')
      .update({
        workable_candidate_id: candidateData.workable_candidate_id,
        source_platform: existingCandidate.source_platform === 'manual' ? 'workable' : existingCandidate.source_platform,
        last_synced_at: candidateData.last_synced_at,
        profile_completeness_score: candidateData.profile_completeness_score
      })
      .eq('id', existingCandidate.id)
      .select()
      .single();

    if (error) throw error;
    candidateId = existingCandidate.id;
  } else {
    // Create new candidate
    const { data, error } = await supabase
      .from('candidates')
      .insert([candidateData])
      .select()
      .single();

    if (error) throw error;
    candidateId = data.id;
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

  // Log the sync operation
  await supabase
    .from('integration_sync_logs')
    .insert([{
      integration_type: 'workable',
      sync_type: 'candidate_import',
      candidate_id: candidateId,
      status: 'success',
      synced_data: workableCandidate
    }]);
}

function calculateCompletenessScore(candidate: any): number {
  let score = 0;
  const fields = ['name', 'email', 'phone'];
  
  fields.forEach(field => {
    if (candidate[field]) score += 33;
  });
  
  return Math.min(score, 100);
}
