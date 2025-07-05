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
    const { action } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Authentication failed');
    }

    // Get user's JobAdder token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('jobadder_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenRecord) {
      return new Response(
        JSON.stringify({ 
          error: 'JobAdder authentication required. Please connect your JobAdder account first.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    const isExpired = new Date(tokenRecord.expires_at) <= new Date();
    if (isExpired && tokenRecord.refresh_token) {
      // Try to refresh the token
      const refreshResult = await refreshJobAdderToken(supabase, user.id, tokenRecord);
      if (!refreshResult.success) {
        return new Response(
          JSON.stringify({ 
            error: 'JobAdder token expired. Please re-authenticate with JobAdder.' 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      tokenRecord.access_token = refreshResult.accessToken;
    }

    const apiHeaders = {
      'Authorization': `Bearer ${tokenRecord.access_token}`,
      'Content-Type': 'application/json',
    };

    switch (action) {
      case 'sync_jobs': {
        console.log('Syncing jobs from JobAdder...');
        
        const response = await fetch(`${tokenRecord.api_base_url}/jobs`, {
          method: 'GET',
          headers: apiHeaders,
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('JobAdder authentication expired. Please reconnect your account.');
          }
          throw new Error(`Failed to sync jobs: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const jobs = data.items || data.jobs || [];
        
        console.log(`Received ${jobs.length} jobs from JobAdder`);

        return new Response(
          JSON.stringify({ 
            success: true,
            jobs: jobs,
            message: `Synced ${jobs.length} jobs from JobAdder`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'sync_candidates': {
        console.log('Syncing candidates from JobAdder...');
        
        let allCandidates: any[] = [];
        let page = 1;
        const pageSize = 100;
        let hasMorePages = true;

        while (hasMorePages && page <= 50) { // Safety limit
          try {
            const candidatesUrl = `${tokenRecord.api_base_url}/candidates?limit=${pageSize}&offset=${(page - 1) * pageSize}`;
            
            console.log(`Loading page ${page} from JobAdder...`);
            
            const response = await fetch(candidatesUrl, {
              method: 'GET',
              headers: apiHeaders,
            });

            if (!response.ok) {
              if (response.status === 401) {
                throw new Error('JobAdder authentication expired. Please reconnect your account.');
              }
              throw new Error(`API Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const candidates = data.items || data.candidates || [];
            
            if (candidates.length > 0) {
              allCandidates.push(...candidates);
              console.log(`Page ${page}: +${candidates.length} candidates (Total: ${allCandidates.length})`);
              
              // Check if there are more pages
              hasMorePages = candidates.length === pageSize;
              page++;
              
              // Rate limiting
              await new Promise(resolve => setTimeout(resolve, 200));
            } else {
              hasMorePages = false;
            }
          } catch (error) {
            console.error(`Error on page ${page}:`, error);
            hasMorePages = false;
          }
        }

        console.log(`Successfully loaded ${allCandidates.length} candidates from JobAdder`);

        return new Response(
          JSON.stringify({ 
            success: true,
            candidates: allCandidates,
            message: `Synced ${allCandidates.length} candidates from JobAdder`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'load_all_candidates': {
        console.log('🚀 Loading ALL candidates from JobAdder and syncing to database...');
        
        // Log sync attempt
        const { data: syncLog } = await supabase
          .from('integration_sync_logs')
          .insert([{
            integration_type: 'jobadder',
            sync_type: 'load_all_candidates',
            status: 'in_progress',
            synced_data: { 
              action: 'load_all_candidates',
              timestamp: new Date().toISOString(),
              progress: 'Starting to load ALL candidates from JobAdder'
            }
          }])
          .select()
          .single();

        let allCandidates: any[] = [];
        let page = 1;
        const pageSize = 100;
        let hasMorePages = true;
        let totalLoaded = 0;

        // Load all candidates from JobAdder
        while (hasMorePages && page <= 100) { // Safety limit
          try {
            const candidatesUrl = `${tokenRecord.api_base_url}/candidates?limit=${pageSize}&offset=${(page - 1) * pageSize}`;
            
            console.log(`📄 Loading page ${page}...`);
            
            const response = await fetch(candidatesUrl, {
              method: 'GET',
              headers: apiHeaders,
            });

            if (!response.ok) {
              if (response.status === 401) {
                throw new Error('JobAdder authentication expired. Please reconnect your account.');
              }
              throw new Error(`API Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const candidates = data.items || data.candidates || [];
            
            if (candidates.length > 0) {
              allCandidates.push(...candidates);
              totalLoaded += candidates.length;
              console.log(`✅ Page ${page}: +${candidates.length} candidates (Total: ${totalLoaded})`);
              
              // Update progress periodically
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
              
              hasMorePages = candidates.length === pageSize;
              page++;
              
              // Rate limiting
              await new Promise(resolve => setTimeout(resolve, 200));
            } else {
              hasMorePages = false;
            }
          } catch (error) {
            console.error(`❌ Error on page ${page}:`, error);
            hasMorePages = false;
          }
        }

        console.log(`🎉 Successfully loaded ${totalLoaded} candidates from JobAdder!`);

        // Now sync candidates to database
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
                source: 'JobAdder'
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
            message: `Successfully loaded ${totalLoaded} candidates from JobAdder and synced ${syncedCount} to database`
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
    console.error('Error in jobadder-integration function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to refresh JobAdder token
async function refreshJobAdderToken(supabase: any, userId: string, tokenRecord: any): Promise<{success: boolean, accessToken?: string}> {
  try {
    const jobadderClientId = Deno.env.get('JOBADDER_CLIENT_ID');
    const jobadderClientSecret = Deno.env.get('JOBADDER_CLIENT_SECRET');

    if (!jobadderClientId || !jobadderClientSecret || !tokenRecord.refresh_token) {
      return { success: false };
    }

    const tokenParams = new URLSearchParams({
      client_id: jobadderClientId,
      client_secret: jobadderClientSecret,
      grant_type: 'refresh_token',
      refresh_token: tokenRecord.refresh_token
    });

    const response = await fetch('https://id.jobadder.com/connect/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams
    });

    if (!response.ok) {
      return { success: false };
    }

    const tokenData = await response.json();
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    await supabase
      .from('jobadder_tokens')
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || tokenRecord.refresh_token,
        expires_at: expiresAt.toISOString()
      })
      .eq('user_id', userId);

    return { success: true, accessToken: tokenData.access_token };
  } catch (error) {
    console.error('Token refresh failed:', error);
    return { success: false };
  }
}

// Helper function to process candidate batches
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
  
  // Prepare candidate data
  const candidateData = candidates.map(candidate => ({
    name: (candidate.name || candidate.firstName + ' ' + candidate.lastName || candidate.email?.split('@')[0] || 'Unknown').trim().substring(0, 255),
    email: (candidate.email || `unknown_${candidate.id}@jobadder.com`).trim().toLowerCase(),
    phone: candidate.phone?.trim()?.substring(0, 50) || null,
    workable_candidate_id: null, // JobAdder doesn't use Workable IDs
    source_platform: 'jobadder',
    location: extractLocation(candidate),
    current_position: (candidate.currentPosition || candidate.headline)?.trim()?.substring(0, 255) || null,
    company: candidate.currentCompany?.trim()?.substring(0, 255) || null,
    skills: extractSkills(candidate),
    experience_years: extractExperienceYears(candidate),
    linkedin_profile_url: extractLinkedInUrl(candidate),
    profile_picture_url: candidate.photoUrl || null,
    education: extractEducation(candidate),
    last_synced_at: new Date().toISOString(),
    profile_completeness_score: calculateCompletenessScore(candidate),
    interview_stage: 'pending'
  }));

  // Bulk upsert
  try {
    const { data, error } = await supabase
      .from('candidates')
      .upsert(candidateData, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error(`Batch upsert error:`, error);
      results.errors.push(`Bulk upsert failed: ${error.message}`);
    } else {
      results.created += data?.length || 0;
      console.log(`✅ Batch upserted ${data?.length || 0} candidates`);
    }
  } catch (batchError) {
    console.error(`Batch processing failed:`, batchError);
    results.errors.push(`Batch processing failed: ${batchError}`);
  }
  
  return results;
}

// Helper functions for data extraction
function extractLocation(candidate: any): string | null {
  if (candidate.location) return candidate.location.trim().substring(0, 255);
  if (candidate.address) return candidate.address.trim().substring(0, 255);
  if (candidate.city && candidate.state) return `${candidate.city}, ${candidate.state}`.trim().substring(0, 255);
  return null;
}

function extractSkills(candidate: any): any[] {
  if (Array.isArray(candidate.skills)) return candidate.skills;
  if (candidate.skills) return [candidate.skills];
  if (candidate.tags && Array.isArray(candidate.tags)) return candidate.tags;
  return [];
}

function extractExperienceYears(candidate: any): number | null {
  if (candidate.yearsExperience) return parseInt(candidate.yearsExperience);
  return null;
}

function extractLinkedInUrl(candidate: any): string | null {
  if (candidate.linkedInUrl) return candidate.linkedInUrl;
  if (candidate.socialProfiles && Array.isArray(candidate.socialProfiles)) {
    const linkedinProfile = candidate.socialProfiles.find((profile: any) => 
      profile.type === 'linkedin' || profile.url?.includes('linkedin.com')
    );
    return linkedinProfile?.url || null;
  }
  return null;
}

function extractEducation(candidate: any): any[] {
  if (candidate.education && Array.isArray(candidate.education)) return candidate.education;
  if (candidate.education) return [candidate.education];
  return [];
}

function calculateCompletenessScore(candidate: any): number {
  let score = 0;

  if (candidate.name || (candidate.firstName && candidate.lastName)) score += 15;
  if (candidate.email) score += 15;
  if (candidate.phone) score += 10;
  if (candidate.currentPosition || candidate.headline) score += 10;
  if (candidate.currentCompany) score += 10;
  if (candidate.location || candidate.address) score += 10;
  if (candidate.skills && candidate.skills.length > 0) score += 10;
  if (candidate.photoUrl) score += 5;
  if (candidate.linkedInUrl) score += 5;
  if (candidate.education && candidate.education.length > 0) score += 10;

  return Math.min(score, 100);
}