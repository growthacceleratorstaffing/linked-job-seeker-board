import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.10";

/**
 * Complete Workable API Importer with Full API Documentation
 * 
 * API Details:
 * - Base URL: https://growthacceleratorstaffing.workable.com/spi/v3
 * - Authentication: Bearer token via Authorization header
 * - Rate Limits: 300 requests per minute (200ms delays implemented)
 * - Pagination: limit (max 100) + offset parameters
 * 
 * Complete API Response Structure:
 * {
 *   "candidates": [{
 *     "id": "string",
 *     "name": "string", 
 *     "email": "email@domain.com",
 *     "phone": "+31123456789",
 *     "state": "active|archived|hired|rejected",
 *     "skills": ["Python", "JavaScript"],
 *     "salary_expectation": {"min": 50000, "max": 70000, "currency": "EUR"},
 *     "applications": [{"job_id": "...", "applied_at": "..."}],
 *     "resume_url": "https://...",
 *     "cover_letter": "...",
 *     "linkedin_url": "https://linkedin.com/in/...",
 *     "location": {"city": "Amsterdam", "country": "Netherlands"},
 *     "experience_years": 5,
 *     "education": [{"degree": "Bachelor", "field": "Computer Science"}],
 *     "created_at": "2024-01-01T00:00:00Z",
 *     "updated_at": "2024-01-01T00:00:00Z"
 *   }],
 *   "paging": {
 *     "next": "https://...?offset=100"
 *   }
 * }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration (300 requests per minute = 200ms delay)
const RATE_LIMIT_DELAY = 200;
const MAX_RETRIES = 3;
const BATCH_SIZE = 100;

interface WorkableCandidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  state: 'active' | 'archived' | 'hired' | 'rejected';
  skills?: string[];
  salary_expectation?: {
    min: number;
    max: number;
    currency: string;
  };
  applications?: Array<{
    job_id: string;
    applied_at: string;
  }>;
  resume_url?: string;
  cover_letter?: string;
  linkedin_url?: string;
  location?: {
    city: string;
    country: string;
  };
  experience_years?: number;
  education?: Array<{
    degree: string;
    field: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface WorkableResponse {
  candidates: WorkableCandidate[];
  paging?: {
    next?: string;
  };
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, headers: Record<string, string>, retries = MAX_RETRIES): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { method: 'GET', headers });
      
      if (response.ok) {
        return response;
      }
      
      if (response.status === 429) {
        // Rate limited - wait longer
        console.log(`⏳ Rate limited, waiting ${(i + 1) * 1000}ms before retry...`);
        await delay((i + 1) * 1000);
        continue;
      }
      
      if (i === retries - 1) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      console.log(`🔄 Retry ${i + 1}/${retries} for ${url}`);
      await delay(1000 * (i + 1));
    }
  }
  
  throw new Error('Max retries exceeded');
}

async function importAllCandidates(
  workableApiToken: string,
  workableSubdomain: string,
  supabase: any
): Promise<{
  success: boolean;
  totalCandidates: number;
  syncedCandidates: number;
  errors: string[];
  stats: any;
}> {
  const cleanSubdomain = workableSubdomain.replace('.workable.com', '');
  const baseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
  
  const headers = {
    'Authorization': `Bearer ${workableApiToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Workable-Importer-Complete/1.0'
  };

  console.log(`🚀 Starting complete import from: ${baseUrl}`);
  console.log(`📊 Rate limit: 300 req/min (${RATE_LIMIT_DELAY}ms delay)`);
  console.log(`📦 Batch size: ${BATCH_SIZE} candidates per request`);

  let allCandidates: WorkableCandidate[] = [];
  let page = 1;
  let offset = 0;
  let hasMorePages = true;
  const errors: string[] = [];

  // Create sync log
  const { data: syncLog } = await supabase
    .from('integration_sync_logs')
    .insert([{
      integration_type: 'workable',
      sync_type: 'complete_import',
      status: 'in_progress',
      synced_data: {
        action: 'complete_import',
        timestamp: new Date().toISOString(),
        progress: 'Starting complete candidate import'
      }
    }])
    .select()
    .single();

  // Fetch all candidates with comprehensive pagination
  while (hasMorePages) {
    try {
      const candidatesUrl = `${baseUrl}/candidates?limit=${BATCH_SIZE}&offset=${offset}&state=all&include=applications,resume,social_profiles`;
      
      console.log(`📄 Page ${page}: fetching ${BATCH_SIZE} candidates (offset: ${offset})`);
      
      const response = await fetchWithRetry(candidatesUrl, headers);
      const data: WorkableResponse = await response.json();

      if (data.candidates && data.candidates.length > 0) {
        console.log(`✅ Page ${page}: received ${data.candidates.length} candidates`);
        allCandidates.push(...data.candidates);
        
        // Log detailed candidate info every 10 pages
        if (page % 10 === 0) {
          const sample = data.candidates[0];
          console.log(`📋 Sample candidate structure:`, {
            id: sample.id,
            name: sample.name,
            email: sample.email,
            state: sample.state,
            hasSkills: !!sample.skills?.length,
            hasApplications: !!sample.applications?.length,
            hasResume: !!sample.resume_url,
            hasLinkedin: !!sample.linkedin_url
          });
        }

        // Update progress every 20 pages
        if (syncLog?.id && page % 20 === 0) {
          await supabase
            .from('integration_sync_logs')
            .update({
              synced_data: {
                action: 'complete_import',
                timestamp: new Date().toISOString(),
                progress: `Imported ${allCandidates.length} candidates (page ${page})`,
                currentPage: page,
                totalCandidates: allCandidates.length
              }
            })
            .eq('id', syncLog.id);
        }

        // Check for more pages
        hasMorePages = !!data.paging?.next && data.candidates.length === BATCH_SIZE;
        offset += BATCH_SIZE;
        page++;

        // Rate limiting
        await delay(RATE_LIMIT_DELAY);
      } else {
        console.log(`📄 Page ${page}: no candidates found - ending pagination`);
        hasMorePages = false;
      }
    } catch (error) {
      console.error(`❌ Error on page ${page}:`, error);
      errors.push(`Page ${page}: ${error.message}`);
      
      if (errors.length > 10) {
        console.log(`❌ Too many errors (${errors.length}), stopping import`);
        break;
      }
      
      hasMorePages = false;
    }
  }

  console.log(`🎉 Import complete: ${allCandidates.length} candidates loaded`);

  // Generate comprehensive statistics
  const withEmail = allCandidates.filter(c => c.email).length;
  const withPhone = allCandidates.filter(c => c.phone).length;
  const withResume = allCandidates.filter(c => c.resume_url).length;
  const withLinkedin = allCandidates.filter(c => c.linkedin_url).length;
  const withSkills = allCandidates.filter(c => c.skills?.length).length;
  const withApplications = allCandidates.filter(c => c.applications?.length).length;
  const activeStatus = allCandidates.filter(c => c.state === 'active').length;
  const archivedStatus = allCandidates.filter(c => c.state === 'archived').length;
  const hiredStatus = allCandidates.filter(c => c.state === 'hired').length;
  const rejectedStatus = allCandidates.filter(c => c.state === 'rejected').length;

  const stats = {
    total_candidates: allCandidates.length,
    pages_processed: page - 1,
    api_endpoint: `${baseUrl}/candidates`,
    data_quality: {
      with_email: withEmail,
      with_phone: withPhone,
      with_resume: withResume,
      with_linkedin: withLinkedin,
      with_skills: withSkills,
      with_applications: withApplications
    },
    status_breakdown: {
      active: activeStatus,
      archived: archivedStatus,
      hired: hiredStatus,
      rejected: rejectedStatus
    },
    percentages: {
      email_coverage: allCandidates.length > 0 ? Math.round(withEmail / allCandidates.length * 100) : 0,
      phone_coverage: allCandidates.length > 0 ? Math.round(withPhone / allCandidates.length * 100) : 0,
      resume_coverage: allCandidates.length > 0 ? Math.round(withResume / allCandidates.length * 100) : 0,
      linkedin_coverage: allCandidates.length > 0 ? Math.round(withLinkedin / allCandidates.length * 100) : 0,
      skills_coverage: allCandidates.length > 0 ? Math.round(withSkills / allCandidates.length * 100) : 0,
      active_candidates: allCandidates.length > 0 ? Math.round(activeStatus / allCandidates.length * 100) : 0
    }
  };

  // Log comprehensive statistics
  console.log('📊 Complete Workable Import - Final Statistics');
  console.log('='.repeat(60));
  console.log(`Total Candidates: ${stats.total_candidates}`);
  console.log(`API Source: ${baseUrl}`);
  console.log(`Pages Processed: ${stats.pages_processed}`);
  console.log(`\nData Quality:`);
  console.log(`  Email: ${stats.data_quality.with_email} (${stats.percentages.email_coverage}%)`);
  console.log(`  Phone: ${stats.data_quality.with_phone} (${stats.percentages.phone_coverage}%)`);
  console.log(`  Resume: ${stats.data_quality.with_resume} (${stats.percentages.resume_coverage}%)`);
  console.log(`  LinkedIn: ${stats.data_quality.with_linkedin} (${stats.percentages.linkedin_coverage}%)`);
  console.log(`  Skills: ${stats.data_quality.with_skills} (${stats.percentages.skills_coverage}%)`);
  console.log(`\nStatus Breakdown:`);
  console.log(`  Active: ${stats.status_breakdown.active} (${stats.percentages.active_candidates}%)`);
  console.log(`  Archived: ${stats.status_breakdown.archived}`);
  console.log(`  Hired: ${stats.status_breakdown.hired}`);
  console.log(`  Rejected: ${stats.status_breakdown.rejected}`);

  // Sync to database
  let syncedCount = 0;
  console.log(`🔄 Syncing ${allCandidates.length} candidates to Supabase...`);

  // Process in smaller batches for database sync
  const dbBatchSize = 50;
  for (let i = 0; i < allCandidates.length; i += dbBatchSize) {
    const batch = allCandidates.slice(i, i + dbBatchSize);
    
    try {
      const transformedBatch = batch.map(candidate => ({
        workable_candidate_id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone || null,
        location: candidate.location ? `${candidate.location.city}, ${candidate.location.country}` : null,
        linkedin_profile_url: candidate.linkedin_url || null,
        skills: candidate.skills || [],
        experience_years: candidate.experience_years || null,
        education: candidate.education || [],
        current_position: candidate.applications?.[0]?.job_id || null,
        interview_stage: mapWorkableStatusToInterviewStage(candidate.state),
        profile_completeness_score: calculateCompletenessScore(candidate),
        source_platform: 'workable',
        last_synced_at: new Date().toISOString(),
        created_at: candidate.created_at,
        updated_at: candidate.updated_at
      }));

      const { error } = await supabase
        .from('candidates')
        .upsert(transformedBatch, { 
          onConflict: 'workable_candidate_id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`❌ Database sync error for batch:`, error);
        errors.push(`Database sync error: ${error.message}`);
      } else {
        syncedCount += batch.length;
        if ((i / dbBatchSize + 1) % 10 === 0) {
          console.log(`✅ Synced ${syncedCount}/${allCandidates.length} candidates`);
        }
      }
    } catch (error) {
      console.error(`❌ Batch sync error:`, error);
      errors.push(`Batch sync error: ${error.message}`);
    }
  }

  // Update final sync log
  if (syncLog?.id) {
    await supabase
      .from('integration_sync_logs')
      .update({
        status: errors.length > 0 ? 'partial_success' : 'success',
        completed_at: new Date().toISOString(),
        synced_data: {
          action: 'complete_import',
          timestamp: new Date().toISOString(),
          totalCandidates: allCandidates.length,
          syncedCandidates: syncedCount,
          errors: errors.length,
          stats,
          source: baseUrl
        }
      })
      .eq('id', syncLog.id);
  }

  console.log(`🎯 Import Results: ${syncedCount}/${allCandidates.length} synced, ${errors.length} errors`);

  return {
    success: true,
    totalCandidates: allCandidates.length,
    syncedCandidates: syncedCount,
    errors,
    stats
  };
}

function mapWorkableStatusToInterviewStage(state: string): string {
  const stageMap: Record<string, string> = {
    'active': 'applied',
    'archived': 'withdrawn',
    'hired': 'hired',
    'rejected': 'rejected'
  };
  return stageMap[state] || 'pending';
}

function calculateCompletenessScore(candidate: WorkableCandidate): number {
  let score = 0;
  const maxScore = 100;
  
  if (candidate.email) score += 20;
  if (candidate.phone) score += 15;
  if (candidate.resume_url) score += 20;
  if (candidate.linkedin_url) score += 15;
  if (candidate.skills?.length) score += 15;
  if (candidate.experience_years) score += 10;
  if (candidate.education?.length) score += 5;
  
  return Math.min(score, maxScore);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚀 Starting Complete Workable Import...');
    const result = await importAllCandidates(workableApiToken, workableSubdomain, supabase);

    return new Response(
      JSON.stringify({
        success: result.success,
        message: `Complete import finished: ${result.syncedCandidates}/${result.totalCandidates} candidates synced`,
        totalCandidates: result.totalCandidates,
        syncedCandidates: result.syncedCandidates,
        errorCount: result.errors.length,
        errors: result.errors.slice(0, 10), // Limit error details
        stats: result.stats
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Complete import failed:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Complete import failed',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});