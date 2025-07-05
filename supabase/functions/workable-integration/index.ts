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

        // Load ALL candidates directly from /candidates endpoint
        const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        let allCandidates: any[] = [];
        let page = 1;
        let hasMorePages = true;
        let totalLoaded = 0;
        const pageSize = 100;

        console.log(`📊 Starting to load from: ${spiBaseUrl}/candidates`);

        while (hasMorePages && page <= 100) { // Safety limit increased for all candidates
          try {
            const offset = (page - 1) * pageSize;
            const candidatesUrl = `${spiBaseUrl}/candidates?limit=${pageSize}&offset=${offset}`;
            
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
        console.log('Syncing jobs from Workable...');
        
        const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        const response = await fetch(`${spiBaseUrl}/jobs`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to sync jobs: ${response.status}`);
        }

        const data = await response.json();
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            jobs: data.jobs || [],
            message: `Synced ${data.jobs?.length || 0} jobs from Workable`
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

  // Bulk upsert for better performance
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