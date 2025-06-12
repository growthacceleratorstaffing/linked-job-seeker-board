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

        console.log('Starting comprehensive candidate sync from Workable...');
        
        // Use SPI API for job listing (more reliable)
        const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        
        console.log('Fetching all jobs from Workable SPI API...');
        
        // Fetch all job states
        const [publishedResponse, archivedResponse, draftResponse] = await Promise.allSettled([
          fetch(`${spiBaseUrl}/jobs?state=published&limit=100`, { headers }),
          fetch(`${spiBaseUrl}/jobs?state=archived&limit=100`, { headers }),
          fetch(`${spiBaseUrl}/jobs?state=draft&limit=100`, { headers })
        ]);

        let allJobs = [];
        let publishedJobs = 0, archivedJobs = 0, draftJobs = 0;

        // Process published jobs
        if (publishedResponse.status === 'fulfilled' && publishedResponse.value.ok) {
          const data = await publishedResponse.value.json();
          const jobs = data.jobs || [];
          allJobs.push(...jobs);
          publishedJobs = jobs.length;
          console.log(`Found ${jobs.length} published jobs`);
        }

        // Process archived jobs
        if (archivedResponse.status === 'fulfilled' && archivedResponse.value.ok) {
          const data = await archivedResponse.value.json();
          const jobs = data.jobs || [];
          allJobs.push(...jobs);
          archivedJobs = jobs.length;
          console.log(`Found ${jobs.length} archived jobs`);
        }

        // Process draft jobs
        if (draftResponse.status === 'fulfilled' && draftResponse.value.ok) {
          const data = await draftResponse.value.json();
          const jobs = data.jobs || [];
          allJobs.push(...jobs);
          draftJobs = jobs.length;
          console.log(`Found ${jobs.length} draft jobs`);
        }
        
        console.log(`Total jobs found: ${allJobs.length} (${publishedJobs} published, ${archivedJobs} archived, ${draftJobs} draft)`);

        let totalCandidates = 0;
        let syncedCandidates = 0;
        let errors: string[] = [];
        let jobsWithCandidates = 0;

        // Check if we have the jobs table
        const { data: jobsTableExists } = await supabase
          .from('candidates')
          .select('id')
          .limit(1);

        // Process each job and sync candidates using SPI API
        for (const job of allJobs) {
          try {
            console.log(`Processing job: ${job.title} (${job.shortcode}) - State: ${job.state}`);
            
            // Use SPI API to get candidates for this job
            const candidatesUrl = `${spiBaseUrl}/jobs/${job.shortcode}/candidates`;
            console.log(`Fetching candidates from: ${candidatesUrl}`);
            
            const candidatesResponse = await fetch(candidatesUrl, {
              method: 'GET',
              headers,
            });

            if (!candidatesResponse.ok) {
              console.log(`Failed to fetch candidates for job ${job.shortcode}: ${candidatesResponse.status}`);
              // Try with job ID instead of shortcode
              const candidatesUrlById = `${spiBaseUrl}/jobs/${job.id}/candidates`;
              console.log(`Trying with job ID: ${candidatesUrlById}`);
              
              const candidatesResponseById = await fetch(candidatesUrlById, {
                method: 'GET',
                headers,
              });
              
              if (!candidatesResponseById.ok) {
                console.log(`Also failed with job ID for ${job.title}: ${candidatesResponseById.status}`);
                continue;
              }
              
              const candidatesData = await candidatesResponseById.json();
              const jobCandidates = candidatesData.candidates || [];
              
              if (jobCandidates.length > 0) {
                totalCandidates += jobCandidates.length;
                jobsWithCandidates++;
                console.log(`Found ${jobCandidates.length} candidates for job: ${job.title}`);

                for (const candidate of jobCandidates) {
                  try {
                    await syncCandidateToSupabase(supabase, candidate, job);
                    syncedCandidates++;
                  } catch (error) {
                    console.error(`Failed to sync candidate ${candidate.id}:`, error);
                    errors.push(`Candidate ${candidate.id}: ${error.message}`);
                  }
                }
              }
              continue;
            }

            const candidatesData = await candidatesResponse.json();
            const jobCandidates = candidatesData.candidates || [];
            
            if (jobCandidates.length > 0) {
              totalCandidates += jobCandidates.length;
              jobsWithCandidates++;
              console.log(`Found ${jobCandidates.length} candidates for job: ${job.title}`);

              for (const candidate of jobCandidates) {
                try {
                  await syncCandidateToSupabase(supabase, candidate, job);
                  syncedCandidates++;
                  
                  if (syncedCandidates % 50 === 0) {
                    console.log(`Synced ${syncedCandidates} candidates so far...`);
                  }
                } catch (error) {
                  console.error(`Failed to sync candidate ${candidate.id}:`, error);
                  errors.push(`Candidate ${candidate.id}: ${error.message}`);
                }
              }
            } else {
              console.log(`No candidates found for job: ${job.title}`);
            }

          } catch (error) {
            console.error(`Failed to process job ${job.shortcode}:`, error);
            errors.push(`Job ${job.shortcode}: ${error.message}`);
          }
        }

        console.log(`Sync complete: ${syncedCandidates}/${totalCandidates} candidates synced from ${allJobs.length} jobs (${jobsWithCandidates} jobs had candidates)`);

        // Update sync log with completion
        await supabase
          .from('integration_sync_logs')
          .update({
            status: syncedCandidates > 0 ? 'success' : 'completed_with_warnings',
            completed_at: new Date().toISOString(),
            synced_data: { 
              totalCandidates, 
              syncedCandidates,
              jobsProcessed: allJobs.length,
              publishedJobs,
              archivedJobs,
              draftJobs,
              jobsWithCandidates,
              errors: errors.slice(0, 10),
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
            jobsProcessed: allJobs.length,
            publishedJobs,
            archivedJobs,
            draftJobs,
            jobsWithCandidates,
            errors: errors.length > 0 ? errors : undefined,
            message: `Synced ${syncedCandidates} out of ${totalCandidates} candidates from ${allJobs.length} Workable jobs`
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
        console.log('Creating job in Workable as draft with employment details:', jobData.title);
        
        const cleanTitle = jobData.title
          .replace(/^#\s*/, '')
          .replace(/Job Title:\s*/i, '')
          .trim();
        
        let cleanDescription = jobData.description
          .replace(/#{1,6}\s/g, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/- /g, '• ')
          .trim();

        if (cleanDescription.length > 5000) {
          cleanDescription = cleanDescription.substring(0, 5000) + '...';
        }

        const jobPayload = {
          title: cleanTitle,
          description: cleanDescription,
          state: 'draft',
          employment_type: jobData.employment_type || 'full_time',
          department: jobData.department || 'General',
          location: {
            location_str: jobData.location || jobData.officeLocation || 'Remote',
            country_code: 'US',
            region_code: 'US',
            telecommuting: jobData.workplace === 'remote' || jobData.remote
          },
          workplace: jobData.workplace || 'on_site',
          job_code: jobData.job_code || null,
          experience: jobData.experience || null,
          education: jobData.education || null,
          requirements: cleanDescription,
          benefits: jobData.benefits || null
        };

        console.log('Job payload:', JSON.stringify(jobPayload, null, 2));

        const recruitingApiUrl = `https://${cleanSubdomain}.workable.com/api/v1/jobs`;
        
        console.log('Creating job at:', recruitingApiUrl);

        const createResponse = await fetch(recruitingApiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(jobPayload),
        });

        console.log('Create job response status:', createResponse.status);
        const createResponseText = await createResponse.text();
        console.log('Create job response:', createResponseText);

        if (!createResponse.ok) {
          let errorMessage = `HTTP ${createResponse.status}`;
          try {
            const errorData = JSON.parse(createResponseText);
            errorMessage = errorData.message || errorData.error || errorData.errors || errorMessage;
          } catch (e) {
            errorMessage = createResponseText || errorMessage;
          }
          
          throw new Error(`Failed to create job in Workable: ${errorMessage}`);
        }

        let createdJob;
        try {
          createdJob = JSON.parse(createResponseText);
        } catch (e) {
          createdJob = { success: true, message: createResponseText };
        }

        console.log('Job created successfully as draft:', createdJob);

        if (jobData.autoPublish && createdJob.id) {
          try {
            console.log('Auto-publishing job:', createdJob.id);
            const publishResponse = await fetch(`${recruitingApiUrl}/${createdJob.id}/publish`, {
              method: 'POST',
              headers,
            });

            if (publishResponse.ok) {
              console.log('Job published successfully');
              return new Response(
                JSON.stringify({ 
                  success: true, 
                  job: createdJob,
                  published: true,
                  message: `Job "${cleanTitle}" created and published successfully in Workable!`
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } else {
              console.log('Failed to publish job, but creation was successful');
            }
          } catch (publishError) {
            console.error('Failed to publish job:', publishError);
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            job: createdJob,
            published: false,
            message: `Job "${cleanTitle}" created successfully as draft in Workable! You can review and publish it manually when ready.`
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

async function syncCandidateToSupabase(supabase: any, workableCandidate: any, job: any) {
  console.log(`Syncing candidate: ${workableCandidate.name || workableCandidate.email || workableCandidate.id} for job: ${job.title}`);
  
  const candidateData = {
    name: workableCandidate.name || workableCandidate.email?.split('@')[0] || 'Unknown',
    email: workableCandidate.email || `unknown_${workableCandidate.id}@workable.com`,
    phone: workableCandidate.phone,
    workable_candidate_id: workableCandidate.id,
    source_platform: 'workable',
    location: workableCandidate.address || workableCandidate.location,
    current_position: workableCandidate.headline || workableCandidate.summary,
    company: workableCandidate.company,
    skills: workableCandidate.skills ? [workableCandidate.skills] : [],
    last_synced_at: new Date().toISOString(),
    profile_completeness_score: calculateCompletenessScore(workableCandidate)
  };

  // Check if candidate already exists by email or workable_candidate_id
  const { data: existingCandidate } = await supabase
    .from('candidates')
    .select('*')
    .or(`email.eq.${candidateData.email},workable_candidate_id.eq.${candidateData.workable_candidate_id}`)
    .maybeSingle();

  let candidateId;

  if (existingCandidate) {
    // Update existing candidate
    const { data, error } = await supabase
      .from('candidates')
      .update({
        workable_candidate_id: candidateData.workable_candidate_id,
        source_platform: 'workable',
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
