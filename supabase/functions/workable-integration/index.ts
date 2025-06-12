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
        // Use the Workable Recruiting API (different from SPI) for job creation
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

        console.log('Starting candidate sync from both published and archived jobs...');
        
        // Fetch ALL jobs with increased limits to ensure we get everything
        const [publishedResponse, archivedResponse, draftResponse] = await Promise.all([
          fetch(`${spiBaseUrl}/jobs?state=published&limit=200`, {
            method: 'GET',
            headers,
          }),
          fetch(`${spiBaseUrl}/jobs?state=archived&limit=500`, { // Increased limit for archived jobs
            method: 'GET',
            headers,
          }),
          fetch(`${spiBaseUrl}/jobs?state=draft&limit=100`, {
            method: 'GET',
            headers,
          })
        ]);

        if (!publishedResponse.ok) {
          throw new Error(`Failed to fetch published jobs: ${publishedResponse.status} - ${await publishedResponse.text()}`);
        }

        if (!archivedResponse.ok) {
          throw new Error(`Failed to fetch archived jobs: ${archivedResponse.status} - ${await archivedResponse.text()}`);
        }

        if (!draftResponse.ok) {
          console.log('Failed to fetch draft jobs, continuing without them');
        }

        const publishedData = await publishedResponse.json();
        const archivedData = await archivedResponse.json();
        const draftData = draftResponse.ok ? await draftResponse.json() : { jobs: [] };
        
        // Combine ALL jobs from all states
        const jobs = [
          ...(publishedData.jobs || []),
          ...(archivedData.jobs || []),
          ...(draftData.jobs || [])
        ];

        console.log(`Total jobs to process: ${jobs.length}`);
        console.log(`Breakdown: ${publishedData.jobs?.length || 0} published, ${archivedData.jobs?.length || 0} archived, ${draftData.jobs?.length || 0} draft`);

        let totalCandidates = 0;
        let syncedCandidates = 0;
        let errors: string[] = [];
        let jobsWithCandidates = 0;

        // Create a map to store job UUID mappings - we'll use job shortcode as the key
        const jobUuidMap = new Map();

        // Check if we have the jobs table and create simple mapping if not
        const { data: jobsTableExists } = await supabase
          .from('jobs')
          .select('id')
          .limit(1);

        // If jobs table doesn't exist, we'll just use the job shortcode directly for candidate sync
        if (!jobsTableExists) {
          console.log('Jobs table does not exist, syncing candidates without job records');
          // Create fake UUIDs for each job shortcode to maintain functionality
          for (const job of jobs) {
            // Use a deterministic UUID based on the job shortcode
            const fakeUuid = `workable-${job.shortcode}`;
            jobUuidMap.set(job.id, fakeUuid);
          }
        } else {
          // Normal flow - ensure all jobs exist in our database and get their UUIDs
          for (const job of jobs) {
            try {
              const { data: existingJob } = await supabase
                .from('jobs')
                .select('id')
                .eq('workable_job_id', job.id)
                .maybeSingle();

              let jobUuid;
              if (existingJob) {
                jobUuid = existingJob.id;
              } else {
                // Create job in our database
                const { data: newJob, error: jobError } = await supabase
                  .from('jobs')
                  .insert([{
                    title: job.title,
                    description: job.description || '',
                    requirements: job.requirements || '',
                    workable_job_id: job.id,
                    status: job.state === 'published' ? 'active' : job.state === 'archived' ? 'closed' : 'draft',
                    location: job.location?.city || 'Remote',
                    salary_min: null,
                    salary_max: null,
                    employment_type: job.employment_type || 'full_time'
                  }])
                  .select('id')
                  .single();

                if (jobError) {
                  console.error(`Failed to create job ${job.id}:`, jobError);
                  errors.push(`Job ${job.shortcode}: Failed to create in database`);
                  continue;
                }
                jobUuid = newJob.id;
              }

              jobUuidMap.set(job.id, jobUuid);
              console.log(`Mapped job ${job.id} (${job.state}) to UUID ${jobUuid}`);
            } catch (error) {
              console.error(`Failed to process job ${job.id}:`, error);
              errors.push(`Job ${job.shortcode}: ${error.message}`);
            }
          }
        }

        // Now sync candidates from ALL jobs with enhanced pagination
        for (const job of jobs) {
          try {
            const jobUuid = jobUuidMap.get(job.id);
            if (!jobUuid) {
              console.log(`Skipping candidates for job ${job.shortcode} - no UUID mapping`);
              continue;
            }

            console.log(`Fetching candidates for job: ${job.shortcode} (${job.state})`);
            
            // Fetch ALL candidates for this job with comprehensive pagination
            let page = 1;
            let hasMoreCandidates = true;
            let jobCandidateCount = 0;
            
            while (hasMoreCandidates) {
              console.log(`Fetching page ${page} for job ${job.shortcode}...`);
              
              const candidatesResponse = await fetch(`${spiBaseUrl}/jobs/${job.shortcode}/candidates?page=${page}&per_page=100`, {
                method: 'GET',
                headers,
              });

              if (candidatesResponse.ok) {
                const candidatesData = await candidatesResponse.json();
                const candidates = candidatesData.candidates || [];
                
                if (candidates.length === 0) {
                  hasMoreCandidates = false;
                  break;
                }
                
                totalCandidates += candidates.length;
                jobCandidateCount += candidates.length;
                console.log(`Found ${candidates.length} candidates on page ${page} for job ${job.shortcode} (${job.state})`);

                for (const candidate of candidates) {
                  try {
                    await syncCandidateToSupabase(supabase, candidate, jobUuid, jobsTableExists !== null);
                    syncedCandidates++;
                  } catch (error) {
                    console.error(`Failed to sync candidate ${candidate.id}:`, error);
                    errors.push(`Candidate ${candidate.id}: ${error.message}`);
                  }
                }
                
                // Check if we have more pages - be more aggressive in checking
                if (candidates.length < 100) {
                  hasMoreCandidates = false;
                } else {
                  page++;
                  // Add a small delay to avoid rate limiting
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              } else {
                const errorText = await candidatesResponse.text();
                console.error(`Failed to fetch candidates for job ${job.shortcode} page ${page}: ${candidatesResponse.status} - ${errorText}`);
                
                // If we get a 404, the job might not have candidates endpoint
                if (candidatesResponse.status === 404) {
                  console.log(`Job ${job.shortcode} has no candidates endpoint`);
                  hasMoreCandidates = false;
                } else {
                  errors.push(`Job ${job.shortcode} page ${page}: HTTP ${candidatesResponse.status}`);
                  hasMoreCandidates = false;
                }
              }
            }
            
            if (jobCandidateCount > 0) {
              jobsWithCandidates++;
              console.log(`Total candidates found for job ${job.shortcode}: ${jobCandidateCount}`);
            }
          } catch (error) {
            console.error(`Failed to fetch candidates for job ${job.shortcode}:`, error);
            errors.push(`Job ${job.shortcode}: ${error.message}`);
          }
        }

        console.log(`Sync complete: ${syncedCandidates}/${totalCandidates} candidates synced from ${jobs.length} jobs (${jobsWithCandidates} jobs had candidates)`);

        // Update sync log with completion - always mark as success if we processed candidates
        await supabase
          .from('integration_sync_logs')
          .update({
            status: 'success',
            completed_at: new Date().toISOString(),
            synced_data: { 
              totalCandidates, 
              syncedCandidates,
              jobsProcessed: jobs.length,
              jobsWithCandidates,
              publishedJobs: publishedData.jobs?.length || 0,
              archivedJobs: archivedData.jobs?.length || 0,
              draftJobs: draftData.jobs?.length || 0,
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
            jobsProcessed: jobs.length,
            jobsWithCandidates,
            publishedJobs: publishedData.jobs?.length || 0,
            archivedJobs: archivedData.jobs?.length || 0,
            draftJobs: draftData.jobs?.length || 0,
            errors: errors.length > 0 ? errors : undefined,
            message: `Synced ${syncedCandidates} out of ${totalCandidates} candidates from ${jobs.length} Workable jobs (${publishedData.jobs?.length || 0} published + ${archivedData.jobs?.length || 0} archived + ${draftData.jobs?.length || 0} draft)`
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

        if (cleanDescription.length > 5000) {
          cleanDescription = cleanDescription.substring(0, 5000) + '...';
        }

        // Build comprehensive job payload with all employment details
        const jobPayload = {
          title: cleanTitle,
          description: cleanDescription,
          state: 'draft', // Always create as draft first
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

        // Use Workable Recruiting API v1 for job creation
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

        // Optional: Auto-publish the job if requested
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

async function syncCandidateToSupabase(supabase: any, workableCandidate: any, jobUuid: string, hasJobsTable: boolean = true) {
  console.log(`Syncing candidate: ${workableCandidate.name} (${workableCandidate.email}) for job UUID: ${jobUuid}`);
  
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

  // Only create candidate response if we have a proper jobs table
  if (hasJobsTable) {
    console.log(`Creating candidate response for candidate ${candidateId} and job ${jobUuid}`);
    const { error: responseError } = await supabase
      .from('candidate_responses')
      .upsert([{
        candidate_id: candidateId,
        job_id: jobUuid,
        response_type: 'application',
        status: workableCandidate.stage || 'new',
        source: 'workable',
        responded_at: workableCandidate.created_at || new Date().toISOString()
      }], {
        onConflict: 'candidate_id,job_id'
      });

    if (responseError) {
      console.error('Failed to create candidate response:', responseError);
      // Don't throw error here - we still want to sync the candidate even if response creation fails
    }
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
