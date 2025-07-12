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
    const { action, jobData, jobId, candidateData, email } = await req.json();
    
    const workableApiToken = Deno.env.get('WORKABLE_API_TOKEN');
    const workableSubdomain = Deno.env.get('WORKABLE_SUBDOMAIN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!workableApiToken || !workableSubdomain) {
      return new Response(
        JSON.stringify({ error: 'Workable API configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanSubdomain = workableSubdomain.replace('.workable.com', '');
    const headers = {
      'Authorization': `Bearer ${workableApiToken}`,
      'Content-Type': 'application/json',
    };

    switch (action) {
      case 'load_all_candidates': {
        console.log('🚀 Loading ALL candidates directly from Workable API...');
        
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Log sync attempt
        const { data: syncLog } = await supabase
          .from('integration_sync_logs')
          .insert([{
            integration_type: 'workable',
            sync_type: 'load_all_candidates',
            status: 'in_progress',
            synced_data: { 
              action: 'load_all_candidates',
              timestamp: new Date().toISOString(),
              progress: 'Starting to load ALL candidates from Workable'
            }
          }])
          .select()
          .single();

        // Load ALL candidates directly from /candidates endpoint INCLUDING archived jobs
        const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        let allCandidates: any[] = [];
        let page = 1;
        let hasMorePages = true;
        let totalLoaded = 0;
        const pageSize = 100;

        console.log(`📊 Starting to load from: ${spiBaseUrl}/candidates (including archived jobs)`);

        while (hasMorePages && page <= 200) { // Increased safety limit for all 900+ candidates
          try {
            const offset = (page - 1) * pageSize;
            // Include candidates from ALL job states including archived/closed jobs
            const candidatesUrl = `${spiBaseUrl}/candidates?limit=${pageSize}&offset=${offset}&state=all`;
            
            console.log(`📄 Loading page ${page} (offset: ${offset})`);
            
            const response = await fetch(candidatesUrl, {
              method: 'GET',
              headers,
            });

            if (!response.ok) {
              throw new Error(`API Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`📊 Page ${page} response: ${data.candidates?.length || 0} candidates`);
            
            if (data.candidates && data.candidates.length > 0) {
              allCandidates.push(...data.candidates);
              totalLoaded += data.candidates.length;
              console.log(`✅ Page ${page}: +${data.candidates.length} candidates (Total: ${totalLoaded})`);
              
              // Update progress
              if (syncLog?.id && page % 5 === 0) {
                await supabase
                  .from('integration_sync_logs')
                  .update({
                    synced_data: { 
                      action: 'load_all_candidates',
                      timestamp: new Date().toISOString(),
                      progress: `Loading page ${page}: ${totalLoaded} candidates loaded`,
                      currentPage: page
                    }
                  })
                  .eq('id', syncLog.id);
              }
              
              // Check pagination
              hasMorePages = data.paging && data.paging.next;
              page++;
              
              // Rate limiting - 200ms like Node.js
              await new Promise(resolve => setTimeout(resolve, 200));
            } else {
              console.log(`No candidates on page ${page} - ending`);
              hasMorePages = false;
            }
          } catch (error) {
            console.error(`❌ Error on page ${page}:`, error);
            hasMorePages = false;
          }
        }

        console.log(`🎉 Successfully loaded ${totalLoaded} candidates from Workable!`);

        // Generate statistics like Node.js
        const withEmail = allCandidates.filter(c => c.email).length;
        const withPhone = allCandidates.filter(c => c.phone).length;
        const withResume = allCandidates.filter(c => c.resume_url).length;
        const activeStatus = allCandidates.filter(c => c.state === 'active').length;

        const stats = {
          total_candidates: totalLoaded,
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
        console.log(`Data Quality:`);
        console.log(`  Email: ${stats.data_quality.with_email} (${stats.percentages.email_coverage}%)`);
        console.log(`  Phone: ${stats.data_quality.with_phone} (${stats.percentages.phone_coverage}%)`);

        // Now sync ALL candidates to Supabase
        let syncedCount = 0;
        let errors: string[] = [];
        
        console.log(`🔄 Syncing ${totalLoaded} candidates to Supabase...`);
        
        // Process in batches
        const syncBatchSize = 50;
        for (let i = 0; i < allCandidates.length; i += syncBatchSize) {
          const batch = allCandidates.slice(i, i + syncBatchSize);
          const batchNum = Math.floor(i/syncBatchSize) + 1;
          
          console.log(`📦 Processing batch ${batchNum} (${batch.length} candidates)`);
          
          try {
            const batchResults = await processCandidateBatch(supabase, batch);
            syncedCount += batchResults.created + batchResults.updated;
            errors.push(...batchResults.errors);
            
            if (batchNum % 10 === 0) {
              console.log(`✅ Progress: ${syncedCount} synced, ${errors.length} errors`);
            }
          } catch (batchError) {
            console.error(`❌ Batch ${batchNum} failed:`, batchError);
            errors.push(`Batch ${batchNum} failed: ${batchError}`);
          }
        }

        // Update final sync log
        if (syncLog?.id) {
          await supabase
            .from('integration_sync_logs')
            .update({
              status: 'success',
              completed_at: new Date().toISOString(),
              synced_data: {
                action: 'load_all_candidates',
                timestamp: new Date().toISOString(),
                totalCandidates: totalLoaded,
                syncedCandidates: syncedCount,
                errors: errors.length,
                stats,
                source: `${cleanSubdomain}.workable.com`
              }
            })
            .eq('id', syncLog.id);
        }

        console.log(`🎯 Final Results: ${syncedCount}/${totalLoaded} candidates synced, ${errors.length} errors`);

        return new Response(
          JSON.stringify({ 
            success: true,
            totalCandidates: totalLoaded,
            syncedCandidates: syncedCount,
            errors: errors.length,
            message: `Successfully loaded ${totalLoaded} candidates from Workable and synced ${syncedCount} to database`,
            stats
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync_jobs': {
        console.log('🔍 Starting jobs sync from Workable...');
        
        const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        const jobsUrl = `${spiBaseUrl}/jobs`;
        
        console.log(`📍 Making request to: ${jobsUrl}`);
        console.log(`🔑 Using headers:`, { ...headers, 'Authorization': 'Bearer [REDACTED]' });
        
        const response = await fetch(jobsUrl, {
          method: 'GET',
          headers,
        });

        console.log(`📊 Response status: ${response.status} ${response.statusText}`);
        console.log(`📋 Response headers:`, Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ API Error Response:`, errorText);
          throw new Error(`Failed to sync jobs: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`📦 Raw API response:`, JSON.stringify(data, null, 2));
        console.log(`📊 Jobs count in response: ${data.jobs?.length || 0}`);
        
        if (data.jobs && data.jobs.length > 0) {
          console.log(`✅ Sample job data:`, JSON.stringify(data.jobs[0], null, 2));
        } else {
          console.log(`⚠️ No jobs found in response`);
          console.log(`🔍 Full response structure:`, Object.keys(data));
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            jobs: data.jobs || [],
            totalJobs: data.jobs?.length || 0,
            message: `Synced ${data.jobs?.length || 0} jobs from Workable`,
            debugInfo: {
              url: jobsUrl,
              responseStatus: response.status,
              responseKeys: Object.keys(data),
              hasJobs: !!data.jobs,
              jobsLength: data.jobs?.length || 0
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync_candidates': {
        console.log('Syncing recent candidates from Workable...');
        
        const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        const response = await fetch(`${spiBaseUrl}/candidates?limit=50`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to sync candidates: ${response.status}`);
        }

        const data = await response.json();
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            candidates: data.candidates || [],
            message: `Synced ${data.candidates?.length || 0} recent candidates`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync_users': {
        console.log('Syncing users from Workable...');
        
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        
        // Fetch all members from Workable
        const membersResponse = await fetch(`${spiBaseUrl}/members`, {
          method: 'GET',
          headers,
        });

        if (!membersResponse.ok) {
          throw new Error(`Failed to sync users: ${membersResponse.status}`);
        }

        const membersData = await membersResponse.json();
        const members = membersData.members || [];
        
        console.log(`Found ${members.length} members in Workable`);
        
        let syncedCount = 0;
        let updatedCount = 0;
        const errors: string[] = [];
        
        // Process each member
        for (const member of members) {
          try {
            const workableUserData = {
              workable_email: member.email.toLowerCase(),
              workable_user_id: member.id.toString(),
              workable_role: mapWorkableRoleToEnum(member.role),
              permissions: member.permissions || {},
              assigned_jobs: member.assigned_jobs || [],
              updated_at: new Date().toISOString()
            };
            
            // Upsert workable user data
            const { error: upsertError } = await supabase
              .from('workable_users')
              .upsert(workableUserData, { 
                onConflict: 'workable_email',
                ignoreDuplicates: false 
              });
              
            if (upsertError) {
              console.error(`Error syncing user ${member.email}:`, upsertError);
              errors.push(`${member.email}: ${upsertError.message}`);
            } else {
              syncedCount++;
              console.log(`✅ Synced user: ${member.email} (${member.role})`);
              
              // If user already exists in auth, update their role assignment
              const { data: existingProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', member.email.toLowerCase())
                .single();
                
              if (existingProfile) {
                // Update user role based on Workable role
                const appRole = mapWorkableRoleToAppRole(member.role);
                await supabase
                  .from('user_roles')
                  .upsert({ 
                    user_id: existingProfile.id, 
                    role: appRole,
                    updated_at: new Date().toISOString()
                  }, { 
                    onConflict: 'user_id',
                    ignoreDuplicates: false 
                  });
                  
                // Link workable user to auth user
                await supabase
                  .from('workable_users')
                  .update({ user_id: existingProfile.id })
                  .eq('workable_email', member.email.toLowerCase());
                  
                updatedCount++;
                console.log(`🔗 Linked existing user: ${member.email}`);
              }
            }
          } catch (error) {
            console.error(`Error processing member ${member.email}:`, error);
            errors.push(`${member.email}: ${error.message}`);
          }
        }
        
        console.log(`🎯 Sync complete: ${syncedCount} users synced, ${updatedCount} existing users updated, ${errors.length} errors`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            totalMembers: members.length,
            syncedUsers: syncedCount,
            updatedUsers: updatedCount,
            errors: errors.length,
            errorDetails: errors,
            message: `Synced ${syncedCount} users from Workable, updated ${updatedCount} existing users`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync_single_user': {        
        if (!email) {
          return new Response(
            JSON.stringify({ error: 'Email is required for single user sync' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`Syncing single user from Workable: ${email}`);
        
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        
        // Fetch specific member from Workable
        const membersResponse = await fetch(`${spiBaseUrl}/members`, {
          method: 'GET',
          headers,
        });

        if (!membersResponse.ok) {
          throw new Error(`Failed to fetch members: ${membersResponse.status}`);
        }

        const membersData = await membersResponse.json();
        console.log(`📊 Total members found: ${membersData.members?.length || 0}`);
        
        const member = membersData.members?.find((m: any) => 
          m.email.toLowerCase() === email.toLowerCase()
        );
        
        if (!member) {
          console.log(`❌ User ${email} not found in Workable`);
          console.log(`Available emails: ${membersData.members?.map((m: any) => m.email).join(', ')}`);
          return new Response(
            JSON.stringify({ 
              success: false,
              message: `User ${email} not found in Workable. They may not have access or their email might be different.`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`✅ Found member: ${member.email}`);
        console.log(`👤 Member role: ${member.role}`);
        console.log(`📋 Assigned jobs: ${member.assigned_jobs?.length || 0} jobs`);
        console.log(`🔍 Job details:`, member.assigned_jobs);
        
        try {
          const workableUserData = {
            workable_email: member.email.toLowerCase(),
            workable_user_id: member.id.toString(),
            workable_role: mapWorkableRoleToEnum(member.role),
            permissions: member.permissions || {},
            assigned_jobs: member.assigned_jobs || [],
            updated_at: new Date().toISOString()
          };
          
          console.log(`📋 Mapping Workable role "${member.role}" to enum "${mapWorkableRoleToEnum(member.role)}"`);
          
          // Upsert workable user data
          const { error: upsertError } = await supabase
            .from('workable_users')
            .upsert(workableUserData, { 
              onConflict: 'workable_email',
              ignoreDuplicates: false 
            });
            
          if (upsertError) {
            throw new Error(`Error syncing user: ${upsertError.message}`);
          }
          
          console.log(`✅ Synced user: ${member.email} (${member.role} -> ${mapWorkableRoleToEnum(member.role)})`);
          
          // If user already exists in auth, update their role assignment
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', member.email.toLowerCase())
            .single();
            
          let linkedToAuth = false;
          if (existingProfile) {
            // Update user role based on Workable role
            const appRole = mapWorkableRoleToAppRole(member.role);
            console.log(`🔗 Linking ${member.email} - App role: ${appRole}`);
            
            await supabase
              .from('user_roles')
              .upsert({ 
                user_id: existingProfile.id, 
                role: appRole,
                updated_at: new Date().toISOString()
              }, { 
                onConflict: 'user_id',
                ignoreDuplicates: false 
              });
              
            // Link workable user to auth user
            await supabase
              .from('workable_users')
              .update({ user_id: existingProfile.id })
              .eq('workable_email', member.email.toLowerCase());
              
            linkedToAuth = true;
            console.log(`🔗 Linked existing user: ${member.email} with role ${appRole}`);
          }

          // Now fetch and sync the actual jobs from Workable
          console.log(`🔄 Fetching jobs from Workable to sync assigned jobs...`);
          
          const jobsResponse = await fetch(`${spiBaseUrl}/jobs`, {
            method: 'GET',
            headers,
          });

          if (!jobsResponse.ok) {
            console.log(`⚠️ Failed to fetch jobs from Workable: ${jobsResponse.status}`);
          } else {
            const jobsData = await jobsResponse.json();
            const allJobs = jobsData.jobs || [];
            console.log(`📊 Total jobs available in Workable: ${allJobs.length}`);
            
            // Filter jobs assigned to this user
            const userAssignedJobs = allJobs.filter((job: any) => {
              // Check if user is assigned to this job
              return member.assigned_jobs && member.assigned_jobs.includes(job.shortcode);
            });
            
            console.log(`🎯 Jobs assigned to ${member.email}: ${userAssignedJobs.length}`);
            console.log(`📋 Assigned job titles:`, userAssignedJobs.map((job: any) => job.title));
          }
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              user: {
                email: member.email,
                workable_role: member.role,
                assigned_jobs: member.assigned_jobs?.length || 0,
                assigned_job_titles: member.assigned_jobs || [],
                linked_to_auth: linkedToAuth
              },
              message: `Successfully synced ${member.email} from Workable with ${member.assigned_jobs?.length || 0} assigned jobs`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (error) {
          console.error(`Error processing member ${member.email}:`, error);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: error.message,
              message: `Failed to sync ${member.email}`
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'publish_job': {
        console.log('Publishing job to Workable and local database...');
        console.log('Received job data:', JSON.stringify(jobData, null, 2));
        
        if (!supabaseUrl || !supabaseServiceKey) {
          console.error('Supabase configuration missing:', { supabaseUrl: !!supabaseUrl, supabaseServiceKey: !!supabaseServiceKey });
          return new Response(
            JSON.stringify({ error: 'Supabase configuration missing' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // First, save to local database
        try {
          const { data: localJob, error: localError } = await supabase
            .from('jobs')
            .insert([{
              title: jobData.title,
              job_description: jobData.description,
              location_name: jobData.location,
              work_type_name: jobData.employment_type,
              company_name: jobData.department || 'Growth Accelerator',
              source: jobData.source || 'AI Generator',
              category_name: jobData.department || 'General',
              skill_tags: jobData.skills || []
            }])
            .select()
            .single();

          if (localError) {
            console.error('Error saving to local database:', localError);
            return new Response(
              JSON.stringify({ 
                success: false,
                error: 'Failed to save job to local database',
                message: localError.message 
              }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          console.log('✅ Job saved to local database:', localJob.id);
          
          // Then try to publish to Workable (optional) - create as draft
          try {
            const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
            const workableJobData = {
              title: jobData.title,
              full_title: jobData.title,
              description: jobData.description,
              location: {
                location_str: jobData.location,
                workplace_type: jobData.workplace === 'remote' ? 'remote' : 'onsite'
              },
              employment_type: jobData.employment_type || 'full_time',
              department: jobData.department || 'General',
              state: 'draft' // Create as draft initially
            };

            const response = await fetch(`${spiBaseUrl}/jobs`, {
              method: 'POST',
              headers,
              body: JSON.stringify(workableJobData)
            });

            if (response.ok) {
              const workableJob = await response.json();
              console.log('✅ Job also published to Workable as draft:', workableJob.shortcode);
              
              // Update local job with Workable job ID
              await supabase
                .from('jobs')
                .update({ 
                  jobadder_job_id: workableJob.shortcode,
                  synced_to_jobadder: true 
                })
                .eq('id', localJob.id);
              
              return new Response(
                JSON.stringify({ 
                  success: true,
                  message: `Job "${jobData.title}" created successfully as draft in both local database and Workable!`,
                  workable_job_id: workableJob.shortcode,
                  local_job_id: localJob.id
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            } else {
              const errorText = await response.text();
              console.log('⚠️ Failed to publish to Workable, but job saved locally:', errorText);
              return new Response(
                JSON.stringify({ 
                  success: true,
                  message: `Job "${jobData.title}" created successfully in local database. Workable sync failed but job is still available.`,
                  workable_error: errorText,
                  local_job_id: localJob.id
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } catch (workableError) {
            console.log('⚠️ Workable publishing failed, but job saved locally:', workableError);
            return new Response(
              JSON.stringify({ 
                success: true,
                message: `Job "${jobData.title}" created successfully in local database. Workable publishing failed but job is still available.`,
                workable_error: workableError.message,
                local_job_id: localJob.id
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (error) {
          console.error('Error in publish_job:', error);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Failed to create job',
              message: error.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error in workable-integration function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processCandidateBatch(supabase: any, candidates: any[]): Promise<{
  created: number,
  updated: number,
  duplicates: number,
  errors: string[]
}> {
  const results = {
    created: 0,
    updated: 0,
    duplicates: 0,
    errors: [] as string[]
  };
  
  // Prepare comprehensive candidate data
  const candidateData = candidates.map(candidate => ({
    name: (candidate.name || candidate.email?.split('@')[0] || 'Unknown').trim().substring(0, 255),
    email: (candidate.email || `unknown_${candidate.id}@workable.com`).trim().toLowerCase(),
    phone: candidate.phone?.trim()?.substring(0, 50) || null,
    workable_candidate_id: candidate.id?.toString() || null,
    source_platform: 'workable',
    location: extractLocation(candidate),
    current_position: (candidate.headline || candidate.summary)?.trim()?.substring(0, 255) || null,
    company: candidate.company?.trim()?.substring(0, 255) || null,
    skills: extractSkills(candidate),
    experience_years: extractExperienceYears(candidate),
    linkedin_profile_url: extractLinkedInUrl(candidate),
    profile_picture_url: candidate.avatar_url || candidate.photo?.url || null,
    education: extractEducation(candidate),
    last_synced_at: new Date().toISOString(),
    profile_completeness_score: calculateCompletenessScore(candidate),
    interview_stage: mapWorkableStatusToInterviewStage(candidate.state)
  }));

  // Bulk insert with batch processing to handle large datasets
  try {
    // First, delete existing workable candidates to ensure fresh data
    console.log(`🗑️ Clearing existing Workable candidates...`);
    const { error: deleteError } = await supabase
      .from('candidates')
      .delete()
      .eq('source_platform', 'workable');

    if (deleteError && deleteError.code !== 'PGRST116') { // Ignore "no rows deleted" error
      console.error('Error clearing existing workable candidates:', deleteError);
      results.errors.push(`Clear failed: ${deleteError.message}`);
      return results;
    } else {
      console.log('✅ Cleared existing workable candidates');
    }

    // Insert candidates in smaller batches to avoid timeout/size limits
    const insertBatchSize = 25; // Smaller batches for better reliability
    for (let i = 0; i < candidateData.length; i += insertBatchSize) {
      const insertBatch = candidateData.slice(i, i + insertBatchSize);
      const batchNumber = Math.floor(i/insertBatchSize) + 1;
      const totalBatches = Math.ceil(candidateData.length / insertBatchSize);
      
      console.log(`📥 Inserting batch ${batchNumber}/${totalBatches} (${insertBatch.length} candidates)`);
      
      const { data, error } = await supabase
        .from('candidates')
        .insert(insertBatch)
        .select();

      if (error) {
        console.error(`Insert batch ${batchNumber} error:`, error);
        results.errors.push(`Insert batch ${batchNumber} failed: ${error.message}`);
        // Continue with next batch instead of stopping
      } else {
        results.created += data?.length || 0;
        console.log(`✅ Batch ${batchNumber}: Inserted ${data?.length || 0} candidates (Total: ${results.created})`);
      }
      
      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (batchError) {
    console.error(`Batch processing failed:`, batchError);
    results.errors.push(`Batch processing failed: ${batchError}`);
  }
  
  return results;
}

// Helper functions for comprehensive data extraction
function extractLocation(candidate: any): string | null {
  if (candidate.address) {
    if (typeof candidate.address === 'string') return candidate.address.trim().substring(0, 255);
    if (candidate.address.city && candidate.address.country) {
      return `${candidate.address.city}, ${candidate.address.country}`.trim().substring(0, 255);
    }
    if (candidate.address.city) return candidate.address.city.trim().substring(0, 255);
    if (candidate.address.country) return candidate.address.country.trim().substring(0, 255);
  }
  return candidate.location?.trim()?.substring(0, 255) || null;
}

function extractSkills(candidate: any): any[] {
  if (Array.isArray(candidate.skills)) return candidate.skills;
  if (candidate.skills) return [candidate.skills];
  if (candidate.tags && Array.isArray(candidate.tags)) return candidate.tags;
  return [];
}

function extractExperienceYears(candidate: any): number | null {
  if (candidate.experience_years) return parseInt(candidate.experience_years);
  if (candidate.work_experience && Array.isArray(candidate.work_experience)) {
    let totalYears = 0;
    candidate.work_experience.forEach((exp: any) => {
      if (exp.years) totalYears += parseInt(exp.years) || 0;
    });
    return totalYears > 0 ? totalYears : null;
  }
  return null;
}

function extractLinkedInUrl(candidate: any): string | null {
  if (candidate.linkedin_url) return candidate.linkedin_url;
  if (candidate.social_profiles && Array.isArray(candidate.social_profiles)) {
    const linkedinProfile = candidate.social_profiles.find((profile: any) => 
      profile.type === 'linkedin' || profile.url?.includes('linkedin.com')
    );
    return linkedinProfile?.url || null;
  }
  return null;
}

function extractEducation(candidate: any): any[] {
  if (candidate.education && Array.isArray(candidate.education)) return candidate.education;
  if (candidate.education) return [candidate.education];
  if (candidate.schools && Array.isArray(candidate.schools)) return candidate.schools;
  return [];
}

function mapWorkableStatusToInterviewStage(state: string): string {
  switch (state?.toLowerCase()) {
    case 'active':
    case 'new':
      return 'pending';
    case 'interviewing':
    case 'in_review':
      return 'in_progress';
    case 'hired':
      return 'passed';
    case 'rejected':
    case 'disqualified':
      return 'failed';
    default:
      return 'pending';
  }
}

function calculateCompletenessScore(candidate: any): number {
  let score = 0;

  if (candidate.name) score += 15;
  if (candidate.email) score += 15;
  if (candidate.phone) score += 10;
  if (candidate.headline || candidate.summary) score += 10;
  if (candidate.company) score += 10;
  if (candidate.address || candidate.location) score += 10;
  if (candidate.skills && candidate.skills.length > 0) score += 10;
  if (candidate.avatar_url || candidate.photo?.url) score += 5;
  if (candidate.resume_url) score += 10;
  if (candidate.social_profiles && candidate.social_profiles.length > 0) score += 5;

  return Math.min(score, 100);
}

// Helper functions for role mapping
function mapWorkableRoleToEnum(role: string): string {
  const roleMap: { [key: string]: string } = {
    'admin': 'admin',
    'hiring_manager': 'hiring_manager',
    'recruiter': 'recruiter',
    'interviewer': 'interviewer',
    'viewer': 'viewer',
    'simple': 'simple',
    'reviewer': 'reviewer',
    'no_access': 'no_access',
    'hris_admin': 'hris_admin',
    'hris_employee': 'hris_employee',
    'hris_no_access': 'hris_no_access'
  };
  
  return roleMap[role?.toLowerCase()] || 'viewer';
}

function mapWorkableRoleToAppRole(workableRole: string): string {
  switch (workableRole?.toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'hiring_manager':
    case 'recruiter':
    case 'simple':
    case 'hris_admin':
      return 'moderator';
    default:
      return 'user';
  }
}