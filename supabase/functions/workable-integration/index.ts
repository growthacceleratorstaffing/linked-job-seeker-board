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

    console.log('Environment check:', {
      hasApiToken: !!workableApiToken,
      hasSubdomain: !!workableSubdomain,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });

    if (!workableApiToken) {
      console.error('WORKABLE_API_TOKEN not found in environment');
      return new Response(
        JSON.stringify({ error: 'Workable API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workableSubdomain) {
      console.error('WORKABLE_SUBDOMAIN not found in environment');
      return new Response(
        JSON.stringify({ error: 'Workable subdomain not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const cleanSubdomain = workableSubdomain.replace('.workable.com', '');
    
    const headers = {
      'Authorization': `Bearer ${workableApiToken}`,
      'Content-Type': 'application/json',
    };

    console.log('Configuration:', {
      cleanSubdomain,
      action,
      timestamp: new Date().toISOString()
    });

    // Ensure integration settings exist and are enabled
    await ensureIntegrationSettings(supabase);

    switch (action) {
      case 'load_all_candidates': {
        console.log('Growth Accelerator Platform - Complete Workable Candidates Loader');
        console.log('Starting background loading of all 965 candidates...');
        
        // Log sync start
        const { data: syncLog, error: syncLogError } = await supabase
          .from('integration_sync_logs')
          .insert([{
            integration_type: 'workable',
            sync_type: 'bulk_candidate_load',
            status: 'in_progress',
            synced_data: { 
              action: 'load_all_candidates',
              timestamp: new Date().toISOString(),
              progress: 'Starting background load...'
            }
          }])
          .select()
          .single();

        if (syncLogError) {
          console.warn('Failed to create sync log:', syncLogError);
        }

        // Start background loading process
        const backgroundLoadingTask = async () => {

        const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        console.log('SPI API URL:', spiBaseUrl);
        
        // Test API connectivity first
        try {
          console.log('Testing API connectivity...');
          const testResponse = await fetch(`${spiBaseUrl}/candidates?limit=1`, {
            method: 'GET',
            headers,
          });

          if (!testResponse.ok) {
            const errorText = await testResponse.text();
            console.error('API test failed:', {
              status: testResponse.status,
              statusText: testResponse.statusText,
              body: errorText
            });
            throw new Error(`Workable API test failed: ${testResponse.status} - ${errorText}`);
          }

          const testData = await testResponse.json();
          console.log('API test successful, found candidates');
        } catch (apiError) {
          console.error('API connectivity test failed:', apiError);
          throw new Error(`Cannot connect to Workable API: ${apiError.message}`);
        }
        
        console.log('🚀 Starting to load all candidates with pagination...');
        
        let allCandidates: any[] = [];
        let page = 1;
        let hasMorePages = true;
        const limit = 100;
        let totalLoaded = 0;

        // Load all candidates using direct /candidates endpoint with pagination
        while (hasMorePages) {
          let retryCount = 0;
          const maxRetries = 3;
          
          while (retryCount <= maxRetries) {
            try {
              console.log(`Loading page ${page}... (attempt ${retryCount + 1})`);
              const offset = (page - 1) * limit;
              const candidatesUrl = `${spiBaseUrl}/candidates?limit=${limit}&offset=${offset}`;
              
              const response = await fetch(candidatesUrl, {
                method: 'GET',
                headers,
              });

              if (response.status === 429) {
                // Rate limited - exponential backoff
                const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
                console.log(`Rate limited on page ${page}, waiting ${backoffDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                retryCount++;
                continue;
              }

              if (!response.ok) {
                const errorText = await response.text();
                console.error(`Failed to fetch candidates page ${page}:`, {
                  status: response.status,
                  statusText: response.statusText,
                  body: errorText
                });
                throw new Error(`API Error on page ${page}: ${response.status} - ${errorText}`);
              }

              const responseData = await response.json();
              const { candidates, paging } = responseData;
              
              if (candidates && candidates.length > 0) {
                allCandidates.push(...candidates);
                totalLoaded = allCandidates.length;
                console.log(`✓ Page ${page}: ${candidates.length} candidates (Total: ${totalLoaded})`);
                
                // Update progress in sync log every 5 pages
                if (page % 5 === 0 && syncLog?.id) {
                  await supabase
                    .from('integration_sync_logs')
                    .update({
                      synced_data: { 
                        action: 'load_all_candidates',
                        timestamp: new Date().toISOString(),
                        progress: `Loading page ${page}, total so far: ${totalLoaded} candidates`
                      }
                    })
                    .eq('id', syncLog.id);
                }
                
                // Check if there are more pages using paging.next
                hasMorePages = paging && paging.next;
                page++;
                
                // Progressive rate limiting - longer delays as we get further
                const delay = Math.min(1000 + (page * 100), 3000); // Start at 1s, increase by 100ms per page, max 3s
                console.log(`⏳ Waiting ${delay}ms before next page...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                break; // Success, exit retry loop
              } else {
                console.log(`No more candidates found on page ${page}`);
                hasMorePages = false;
                break;
              }
            } catch (error) {
              console.error(`❌ Error on page ${page} (attempt ${retryCount + 1}):`, error);
              if (retryCount >= maxRetries) {
                hasMorePages = false;
                throw error;
              }
              retryCount++;
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            }
          }
        }

        console.log(`🎉 Successfully loaded ${totalLoaded} candidates from Workable!`);

        // Now sync all candidates to Supabase
        let syncedCount = 0;
        let errors: string[] = [];
        
        console.log('Starting to sync candidates to Supabase...');
        
        // Process candidates in batches to avoid overwhelming the database
        const syncBatchSize = 10;
        for (let i = 0; i < allCandidates.length; i += syncBatchSize) {
          const batch = allCandidates.slice(i, i + syncBatchSize);
          console.log(`Syncing batch ${Math.floor(i/syncBatchSize) + 1}/${Math.ceil(allCandidates.length/syncBatchSize)}`);
          
          for (const candidate of batch) {
            try {
              await syncCandidateToSupabase(supabase, candidate);
              syncedCount++;
            } catch (candidateError) {
              console.error(`Failed to sync candidate ${candidate.id}:`, candidateError);
              errors.push(`Candidate ${candidate.name || candidate.id}: ${candidateError.message}`);
            }
          }
          
          // Small delay between sync batches
          if (i + syncBatchSize < allCandidates.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // Generate statistics following your original script format
        const withEmail = allCandidates.filter(c => c.email).length;
        const withPhone = allCandidates.filter(c => c.phone).length;
        const withResume = allCandidates.filter(c => c.resume_url).length;
        const activeStatus = allCandidates.filter(c => c.state === 'active').length;

        const stats = {
          total_candidates: totalLoaded,
          synced_candidates: syncedCount,
          pages_processed: page - 1,
          data_quality: {
            with_email: withEmail,
            with_phone: withPhone,
            with_resume: withResume,
            active_status: activeStatus
          },
          percentages: {
            email_coverage: totalLoaded > 0 ? Math.round(withEmail / totalLoaded * 100) : 0,
            phone_coverage: totalLoaded > 0 ? Math.round(withPhone / totalLoaded * 100) : 0,
            resume_coverage: totalLoaded > 0 ? Math.round(withResume / totalLoaded * 100) : 0,
            active_candidates: totalLoaded > 0 ? Math.round(activeStatus / totalLoaded * 100) : 0
          }
        };

        console.log('📊 Growth Accelerator Platform - Candidate Statistics');
        console.log('='.repeat(60));
        console.log(`Total Candidates: ${stats.total_candidates}`);
        console.log(`API Source: ${cleanSubdomain}.workable.com`);
        console.log(`Loaded at: ${new Date().toLocaleString()}`);
        console.log('Data Quality:');
        console.log(`  Email: ${stats.data_quality.with_email} (${stats.percentages.email_coverage}%)`);
        console.log(`  Phone: ${stats.data_quality.with_phone} (${stats.percentages.phone_coverage}%)`);
        console.log(`  Resume: ${stats.data_quality.with_resume} (${stats.percentages.resume_coverage}%)`);

        // Update sync log with completion
        if (syncLog?.id) {
          await supabase
            .from('integration_sync_logs')
            .update({
              status: syncedCount > 0 ? 'success' : 'completed_with_warnings',
              completed_at: new Date().toISOString(),
              synced_data: { 
                totalCandidates: totalLoaded,
                syncedCandidates: syncedCount,
                pagesProcessed: page - 1,
                stats,
                errors: errors.slice(0, 10),
                timestamp: new Date().toISOString()
              }
            })
            .eq('id', syncLog.id);
        }

        // Update integration settings
        await supabase
          .from('integration_settings')
          .update({
            last_sync_at: new Date().toISOString(),
          })
          .eq('integration_type', 'workable');

        }; // End of backgroundLoadingTask

        // Start the background task
        // @ts-ignore
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
          // @ts-ignore
          EdgeRuntime.waitUntil(backgroundLoadingTask());
        } else {
          // Fallback for environments without EdgeRuntime
          backgroundLoadingTask().catch(console.error);
        }

        // Return immediate response
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Background loading started! Candidates will be loaded automatically.',
            backgroundTask: true,
            syncLogId: syncLog?.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync_candidates': {
        console.log('Starting candidate sync from Workable...');
        
        // Log sync start
        const { data: syncLog, error: syncLogError } = await supabase
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

        if (syncLogError) {
          console.warn('Failed to create sync log:', syncLogError);
        }

        const recruitingBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        console.log('Recruiting API URL:', recruitingBaseUrl);
        
        // Test API connectivity first
        try {
          console.log('Testing API connectivity...');
          const testResponse = await fetch(`${recruitingBaseUrl}/jobs?state=published&limit=1`, {
            method: 'GET',
            headers,
          });

          console.log('API test response status:', testResponse.status);
          
          if (!testResponse.ok) {
            const errorText = await testResponse.text();
            console.error('API test failed:', {
              status: testResponse.status,
              statusText: testResponse.statusText,
              body: errorText
            });
            throw new Error(`Workable API test failed: ${testResponse.status} - ${errorText}`);
          }

          const testData = await testResponse.json();
          console.log('API test successful, sample data:', testData);
        } catch (apiError) {
          console.error('API connectivity test failed:', apiError);
          throw new Error(`Cannot connect to Workable API: ${apiError.message}`);
        }
        
        console.log('Fetching jobs from Workable (including archived)...');
        
        // Fetch both published and archived jobs to get all candidates
        const [publishedResponse, archivedResponse] = await Promise.all([
          fetch(`${recruitingBaseUrl}/jobs?state=published&limit=100`, {
            method: 'GET',
            headers,
          }),
          fetch(`${recruitingBaseUrl}/jobs?state=archived&limit=100`, {
            method: 'GET',
            headers,
          })
        ]);

        console.log('Jobs response status - Published:', publishedResponse.status, 'Archived:', archivedResponse.status);

        if (!publishedResponse.ok) {
          const errorText = await publishedResponse.text();
          console.error('Failed to fetch published jobs:', {
            status: publishedResponse.status,
            statusText: publishedResponse.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch published jobs: ${publishedResponse.status} - ${errorText}`);
        }

        if (!archivedResponse.ok) {
          const errorText = await archivedResponse.text();
          console.error('Failed to fetch archived jobs:', {
            status: archivedResponse.status,
            statusText: archivedResponse.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch archived jobs: ${archivedResponse.status} - ${errorText}`);
        }

        const publishedData = await publishedResponse.json();
        const archivedData = await archivedResponse.json();
        
        const allJobs = [
          ...(publishedData.jobs || []),
          ...(archivedData.jobs || [])
        ];
        
        console.log(`Found ${allJobs.length} active jobs in Workable`);

        if (allJobs.length === 0) {
          console.log('No jobs found, completing sync');
          
          // Update sync log
          if (syncLog?.id) {
            await supabase
              .from('integration_sync_logs')
              .update({
                status: 'completed_with_warnings',
                completed_at: new Date().toISOString(),
                synced_data: { 
                  totalCandidates: 0, 
                  syncedCandidates: 0,
                  jobsProcessed: 0,
                  message: 'No jobs found to sync candidates from'
                }
              })
              .eq('id', syncLog.id);
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              totalCandidates: 0,
              syncedCandidates: 0,
              jobsProcessed: 0,
              message: 'No jobs found to sync candidates from'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let totalCandidates = 0;
        let syncedCandidates = 0;
        let errors: string[] = [];
        let jobsWithCandidates = 0;

        // Process jobs in smaller batches to avoid overwhelming the API
        const batchSize = 3;
        for (let i = 0; i < allJobs.length; i += batchSize) {
          const batch = allJobs.slice(i, i + batchSize);
          console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(allJobs.length/batchSize)}`);
          
          // Process batch jobs with proper error handling
          for (const job of batch) {
            try {
              console.log(`Processing job: ${job.title} (ID: ${job.id})`);
              
              const candidatesUrl = `${recruitingBaseUrl}/jobs/${job.id}/candidates?limit=100`;
              console.log(`Fetching candidates from: ${candidatesUrl}`);
              
              const candidatesResponse = await fetch(candidatesUrl, {
                method: 'GET',
                headers,
              });

              if (!candidatesResponse.ok) {
                const errorText = await candidatesResponse.text();
                console.log(`Failed to fetch candidates for job ${job.id}: ${candidatesResponse.status} - ${errorText}`);
                errors.push(`Job ${job.title}: HTTP ${candidatesResponse.status}`);
                continue;
              }

              const candidatesData = await candidatesResponse.json();
              const jobCandidates = candidatesData.candidates || [];
              
              if (jobCandidates.length > 0) {
                console.log(`Found ${jobCandidates.length} candidates for job: ${job.title}`);
                jobsWithCandidates++;
                
                // Process candidates with better error handling
                for (const candidate of jobCandidates) {
                  try {
                    await syncCandidateToSupabase(supabase, candidate, job);
                    syncedCandidates++;
                  } catch (candidateError) {
                    console.error(`Failed to sync candidate ${candidate.id}:`, candidateError);
                    errors.push(`Candidate sync error: ${candidateError.message}`);
                  }
                }
                
                totalCandidates += jobCandidates.length;
              } else {
                console.log(`No candidates found for job: ${job.title}`);
              }
            } catch (jobError) {
              console.error(`Failed to process job ${job.id}:`, jobError);
              errors.push(`Job processing error: ${jobError.message}`);
            }
          }

          // Add delay between batches to avoid rate limiting
          if (i + batchSize < allJobs.length) {
            console.log('Waiting before next batch...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        console.log(`Sync complete: ${syncedCandidates}/${totalCandidates} candidates synced from ${allJobs.length} jobs (${jobsWithCandidates} jobs had candidates)`);

        // Update sync log with completion
        if (syncLog?.id) {
          await supabase
            .from('integration_sync_logs')
            .update({
              status: syncedCandidates > 0 ? 'success' : 'completed_with_warnings',
              completed_at: new Date().toISOString(),
              synced_data: { 
                totalCandidates, 
                syncedCandidates,
                jobsProcessed: allJobs.length,
                jobsWithCandidates,
                errors: errors.slice(0, 10), // Limit error logging
                timestamp: new Date().toISOString()
              }
            })
            .eq('id', syncLog.id);
        }

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
            jobsWithCandidates,
            errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
            message: `Successfully synced ${syncedCandidates} out of ${totalCandidates} candidates from ${allJobs.length} Workable jobs`
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
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from('integration_sync_logs')
          .insert([{
            integration_type: 'workable',
            sync_type: 'error',
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          }]);
      }
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
