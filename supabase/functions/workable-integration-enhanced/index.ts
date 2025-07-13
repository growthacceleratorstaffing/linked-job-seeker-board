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
    const { action, jobData, jobId, candidateData, email, includeEnrichment = false, exportFormat = 'json' } = await req.json();
    
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
      'User-Agent': 'Growth-Accelerator-Platform/2.0'
    };

    switch (action) {
      case 'load_all_candidates_enhanced': {
        console.log('🚀 Enhanced loading of ALL candidates with comprehensive features...');
        
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Log enhanced sync attempt
        const { data: syncLog } = await supabase
          .from('integration_sync_logs')
          .insert([{
            integration_type: 'workable',
            sync_type: 'enhanced_load_all_candidates',
            status: 'in_progress',
            synced_data: { 
              action: 'enhanced_load_all_candidates',
              timestamp: new Date().toISOString(),
              progress: 'Starting enhanced comprehensive import',
              features: ['enrichment', 'csv_export', 'advanced_stats', 'top_skills', 'location_analysis']
            }
          }])
          .select()
          .single();

        const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        let allCandidates: any[] = [];
        let allJobs: any[] = [];
        let page = 1;
        let hasMorePages = true;
        let totalLoaded = 0;
        const pageSize = 100;
        const startTime = Date.now();

        console.log(`📊 Starting enhanced import from: ${spiBaseUrl}/candidates`);
        console.log(`🎯 Features: Enrichment, CSV Export, Advanced Analytics`);

        // Load all candidates with enhanced error handling
        while (hasMorePages && page <= 200) {
          try {
            const offset = (page - 1) * pageSize;
            const candidatesUrl = `${spiBaseUrl}/candidates?limit=${pageSize}&offset=${offset}&state=all&include=applications,resume,social_profiles`;
            
            console.log(`📄 Loading enhanced page ${page} (offset: ${offset})`);
            
            const response = await fetchWithRetry(candidatesUrl, headers);
            const data = await response.json();
            
            console.log(`📊 Page ${page} response: ${data.candidates?.length || 0} candidates`);
            
            if (data.candidates && data.candidates.length > 0) {
              // Enhanced candidate processing
              const processedCandidates = data.candidates.map(candidate => ({
                id: candidate.id,
                name: candidate.name || 'Unknown Name',
                first_name: candidate.first_name,
                last_name: candidate.last_name,
                email: candidate.email,
                phone: candidate.phone,
                created_at: candidate.created_at,
                updated_at: candidate.updated_at,
                state: candidate.state,
                stage: candidate.stage,
                summary: candidate.summary,
                experience: candidate.experience,
                education: candidate.education,
                address: candidate.address,
                skills: candidate.skills || [],
                tags: candidate.tags || [],
                resume_url: candidate.resume_url,
                cover_letter_url: candidate.cover_letter_url,
                portfolio_url: candidate.portfolio_url,
                social_profiles: candidate.social_profiles || [],
                website: candidate.website,
                availability: candidate.availability,
                salary_expectation: candidate.salary_expectation,
                applications: candidate.applications || [],
                source: candidate.source || { name: 'workable', type: 'ats' },
                recruiter: candidate.recruiter,
                raw_data: candidate // Keep full original data
              }));

              allCandidates.push(...processedCandidates);
              totalLoaded += data.candidates.length;
              console.log(`✅ Page ${page}: +${data.candidates.length} candidates (Total: ${totalLoaded})`);
              
              // Enhanced progress tracking
              if (syncLog?.id && page % 3 === 0) {
                const currentStats = generateComprehensiveStatistics(allCandidates);
                await supabase
                  .from('integration_sync_logs')
                  .update({
                    synced_data: { 
                      action: 'enhanced_load_all_candidates',
                      timestamp: new Date().toISOString(),
                      progress: `Loading page ${page}: ${totalLoaded} candidates loaded`,
                      currentPage: page,
                      preview_stats: {
                        total: totalLoaded,
                        with_email: currentStats.data_quality.with_email,
                        with_skills: currentStats.data_quality.with_skills,
                        active: currentStats.data_quality.active_candidates
                      }
                    }
                  })
                  .eq('id', syncLog.id);
              }
              
              hasMorePages = data.paging && data.paging.next;
              page++;
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

        // Load jobs for enhanced analysis
        console.log(`💼 Loading jobs for enhanced analysis...`);
        try {
          let jobPage = 1;
          let hasMoreJobs = true;
          
          while (hasMoreJobs && jobPage <= 50) {
            const jobsUrl = `${spiBaseUrl}/jobs?limit=${pageSize}&offset=${(jobPage - 1) * pageSize}`;
            const jobResponse = await fetchWithRetry(jobsUrl, headers);
            const jobData = await jobResponse.json();
            
            if (jobData.jobs && jobData.jobs.length > 0) {
              allJobs.push(...jobData.jobs);
              console.log(`💼 Loaded jobs page ${jobPage}: ${jobData.jobs.length} jobs`);
              hasMoreJobs = jobData.paging && jobData.paging.next;
              jobPage++;
              await new Promise(resolve => setTimeout(resolve, 200));
            } else {
              hasMoreJobs = false;
            }
          }
        } catch (error) {
          console.warn(`⚠️ Could not load jobs: ${error.message}`);
        }

        console.log(`🎉 Data loading complete: ${totalLoaded} candidates, ${allJobs.length} jobs`);

        // Generate comprehensive statistics
        const comprehensiveStats = generateComprehensiveStatistics(allCandidates, allJobs);
        console.log('📊 Comprehensive Statistics Generated');
        
        // Candidate enrichment (if requested)
        let enrichedCandidates: any[] = [];
        if (includeEnrichment && totalLoaded > 0) {
          console.log('🔍 Starting candidate enrichment...');
          enrichedCandidates = await enrichCandidateDetails(
            allCandidates, 
            Math.min(50, totalLoaded), 
            headers, 
            cleanSubdomain
          );
        }

        // Generate CSV export
        const csvData = generateCandidatesCSV(allCandidates);
        console.log('📋 CSV export generated');

        // Sync to database with enhanced error handling
        let syncedCount = 0;
        let errors: string[] = [];
        
        console.log(`🔄 Syncing ${totalLoaded} candidates to Supabase with enhanced processing...`);
        
        const syncBatchSize = 50;
        for (let i = 0; i < allCandidates.length; i += syncBatchSize) {
          const batch = allCandidates.slice(i, i + syncBatchSize);
          const batchNum = Math.floor(i/syncBatchSize) + 1;
          
          console.log(`📦 Processing enhanced batch ${batchNum} (${batch.length} candidates)`);
          
          try {
            const batchResults = await processCandidateBatchEnhanced(supabase, batch);
            syncedCount += batchResults.created + batchResults.updated;
            errors.push(...batchResults.errors);
            
            if (batchNum % 5 === 0) {
              console.log(`✅ Enhanced progress: ${syncedCount} synced, ${errors.length} errors`);
            }
          } catch (batchError) {
            console.error(`❌ Enhanced batch ${batchNum} failed:`, batchError);
            errors.push(`Batch ${batchNum} failed: ${batchError}`);
          }
        }

        // Update final sync log with comprehensive data
        if (syncLog?.id) {
          await supabase
            .from('integration_sync_logs')
            .update({
              status: errors.length > 10 ? 'partial_success' : 'success',
              completed_at: new Date().toISOString(),
              synced_data: {
                action: 'enhanced_load_all_candidates',
                timestamp: new Date().toISOString(),
                totalCandidates: totalLoaded,
                totalJobs: allJobs.length,
                syncedCandidates: syncedCount,
                enrichedCandidates: enrichedCandidates.length,
                errors: errors.length,
                processing_time_seconds: ((Date.now() - startTime) / 1000).toFixed(2),
                comprehensive_stats: comprehensiveStats,
                csv_size: csvData.length,
                source: `${cleanSubdomain}.workable.com`,
                features_used: ['enrichment', 'csv_export', 'advanced_stats', 'comprehensive_analysis']
              }
            })
            .eq('id', syncLog.id);
        }

        console.log(`🎯 Enhanced Results: ${syncedCount}/${totalLoaded} candidates synced`);
        console.log(`📊 Statistics: ${Object.keys(comprehensiveStats.top_skills).length} skills, ${Object.keys(comprehensiveStats.top_locations).length} locations analyzed`);

        const result = {
          success: true,
          totalCandidates: totalLoaded,
          totalJobs: allJobs.length,
          syncedCandidates: syncedCount,
          enrichedCandidates: enrichedCandidates.length,
          errors: errors.length,
          processing_time_seconds: ((Date.now() - startTime) / 1000).toFixed(2),
          message: `Enhanced import: ${syncedCount} candidates synced with comprehensive analysis`,
          comprehensive_stats: comprehensiveStats,
          csv_export: exportFormat === 'csv' ? csvData : null,
          enriched_sample: includeEnrichment ? enrichedCandidates.slice(0, 10) : null,
          top_insights: {
            most_common_skill: Object.keys(comprehensiveStats.top_skills)[0],
            top_location: Object.keys(comprehensiveStats.top_locations)[0],
            active_percentage: comprehensiveStats.percentages.active_candidates,
            data_quality_score: Math.round(
              (comprehensiveStats.percentages.email_coverage + 
               comprehensiveStats.percentages.phone_coverage + 
               comprehensiveStats.percentages.skills_coverage) / 3
            )
          }
        };

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Keep existing cases but add enhanced versions
      case 'load_all_candidates': {
        // Existing implementation - keep for backward compatibility
        console.log('🚀 Loading ALL candidates directly from Workable API...');
        
        if (!supabaseUrl || !supabaseServiceKey) {
          throw new Error('Supabase configuration missing');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
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

        const spiBaseUrl = `https://${cleanSubdomain}.workable.com/spi/v3`;
        let allCandidates: any[] = [];
        let page = 1;
        let hasMorePages = true;
        let totalLoaded = 0;
        const pageSize = 100;

        console.log(`📊 Starting to load from: ${spiBaseUrl}/candidates`);

        while (hasMorePages && page <= 200) {
          try {
            const offset = (page - 1) * pageSize;
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
              
              hasMorePages = data.paging && data.paging.next;
              page++;
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

        let syncedCount = 0;
        let errors: string[] = [];
        
        console.log(`🔄 Syncing ${totalLoaded} candidates to Supabase...`);
        
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

      // Add other existing cases here (sync_jobs, sync_candidates, etc.)
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Enhanced utility functions
async function fetchWithRetry(url: string, headers: any, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, { method: 'GET', headers });
      
      if (response.ok) {
        return response;
      }
      
      if (response.status === 429) {
        console.log(`⏳ Rate limited, waiting ${(i + 1) * 1000}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000));
        continue;
      }
      
      if (i === maxRetries - 1) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      console.log(`🔄 Retry ${i + 1}/${maxRetries} for ${url}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Enhanced statistics generation
function generateComprehensiveStatistics(candidates: any[], jobs: any[] = []) {
  const stats = {
    overview: {
      total_candidates: candidates.length,
      total_jobs: jobs.length,
      load_time: new Date().toISOString(),
      platform: 'Growth Accelerator Staffing',
      processing_time: new Date().toISOString()
    },
    data_quality: {
      with_email: candidates.filter(c => c.email).length,
      with_phone: candidates.filter(c => c.phone).length,
      with_resume: candidates.filter(c => c.resume_url).length,
      with_linkedin: candidates.filter(c => extractLinkedInUrl(c)).length,
      with_portfolio: candidates.filter(c => c.portfolio_url).length,
      with_skills: candidates.filter(c => extractSkills(c)?.length > 0).length,
      active_candidates: candidates.filter(c => c.state === 'active').length,
      with_applications: candidates.filter(c => c.applications?.length > 0).length
    },
    percentages: {
      email_coverage: candidates.length > 0 ? Math.round(candidates.filter(c => c.email).length / candidates.length * 100) : 0,
      phone_coverage: candidates.length > 0 ? Math.round(candidates.filter(c => c.phone).length / candidates.length * 100) : 0,
      resume_coverage: candidates.length > 0 ? Math.round(candidates.filter(c => c.resume_url).length / candidates.length * 100) : 0,
      linkedin_coverage: candidates.length > 0 ? Math.round(candidates.filter(c => extractLinkedInUrl(c)).length / candidates.length * 100) : 0,
      skills_coverage: candidates.length > 0 ? Math.round(candidates.filter(c => extractSkills(c)?.length > 0).length / candidates.length * 100) : 0,
      active_candidates: candidates.length > 0 ? Math.round(candidates.filter(c => c.state === 'active').length / candidates.length * 100) : 0
    },
    top_skills: extractTopSkills(candidates, 20),
    top_locations: extractTopLocations(candidates, 15),
    candidate_states: extractCandidateStates(candidates),
    experience_levels: extractExperienceLevels(candidates),
    recent_candidates: candidates
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        created_at: c.created_at,
        state: c.state,
        skills_count: extractSkills(c)?.length || 0
      }))
  };

  return stats;
}

function extractTopSkills(candidates: any[], limit = 20) {
  const skillCounts: Record<string, number> = {};
  
  candidates.forEach(candidate => {
    const skills = extractSkills(candidate);
    if (skills && Array.isArray(skills)) {
      skills.forEach(skill => {
        if (typeof skill === 'string') {
          const normalizedSkill = skill.trim().toLowerCase();
          skillCounts[normalizedSkill] = (skillCounts[normalizedSkill] || 0) + 1;
        }
      });
    }
  });
  
  return Object.entries(skillCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .reduce((obj, [skill, count]) => {
      obj[skill] = count;
      return obj;
    }, {} as Record<string, number>);
}

function extractTopLocations(candidates: any[], limit = 15) {
  const locationCounts: Record<string, number> = {};
  
  candidates.forEach(candidate => {
    const location = extractLocation(candidate) || 'Unknown';
    locationCounts[location] = (locationCounts[location] || 0) + 1;
  });
  
  return Object.entries(locationCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .reduce((obj, [location, count]) => {
      obj[location] = count;
      return obj;
    }, {} as Record<string, number>);
}

function extractCandidateStates(candidates: any[]) {
  const stateCounts: Record<string, number> = {};
  
  candidates.forEach(candidate => {
    const state = candidate.state || 'unknown';
    stateCounts[state] = (stateCounts[state] || 0) + 1;
  });
  
  return stateCounts;
}

function extractExperienceLevels(candidates: any[]) {
  const experienceCounts: Record<string, number> = {};
  
  candidates.forEach(candidate => {
    const experience = candidate.experience || 'unknown';
    experienceCounts[experience] = (experienceCounts[experience] || 0) + 1;
  });
  
  return experienceCounts;
}

// Generate CSV export
function generateCandidatesCSV(candidates: any[]) {
  const headers = [
    'ID', 'Name', 'Email', 'Phone', 'Location', 'State', 'Stage',
    'Skills Count', 'Applications Count', 'Experience Years', 'Created At', 
    'Resume URL', 'LinkedIn URL', 'Skills'
  ];
  
  const rows = candidates.map(candidate => [
    candidate.id || '',
    candidate.name || '',
    candidate.email || '',
    candidate.phone || '',
    extractLocation(candidate) || '',
    candidate.state || '',
    candidate.stage || '',
    extractSkills(candidate)?.length || 0,
    candidate.applications?.length || 0,
    extractExperienceYears(candidate) || '',
    candidate.created_at || '',
    candidate.resume_url || '',
    extractLinkedInUrl(candidate) || '',
    extractSkills(candidate)?.join('; ') || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(field => 
      typeof field === 'string' && (field.includes(',') || field.includes("\"") || field.includes('\n'))
        ? `"${field.replace(/\"/g, '""')}"`
        : field
    ).join(','))
  ].join('\n');

  return csvContent;
}

// Enhanced candidate enrichment
async function enrichCandidateDetails(candidates: any[], maxCandidates = 50, headers: any, subdomain: string) {
  console.log(`🔍 Enriching first ${maxCandidates} candidates with detailed information...`);
  
  const enrichedCandidates = [];
  const candidatesToEnrich = candidates.slice(0, maxCandidates);
  const spiBaseUrl = `https://${subdomain}.workable.com/spi/v3`;
  
  for (let i = 0; i < candidatesToEnrich.length; i++) {
    const candidate = candidatesToEnrich[i];
    
    try {
      console.log(`📋 Enriching ${i + 1}/${candidatesToEnrich.length}: ${candidate.name}...`);
      
      const response = await fetchWithRetry(`${spiBaseUrl}/candidates/${candidate.id}`, headers);
      const detailData = await response.json();
      
      const detailedCandidate = {
        ...candidate,
        detailed_profile: detailData.candidate,
        enriched_at: new Date().toISOString(),
        enhanced_data: {
          full_summary: detailData.candidate?.summary,
          detailed_experience: detailData.candidate?.experience,
          complete_education: detailData.candidate?.education,
          all_social_profiles: detailData.candidate?.social_profiles,
          cover_letter: detailData.candidate?.cover_letter,
          answers: detailData.candidate?.answers
        }
      };
      enrichedCandidates.push(detailedCandidate);
      console.log(`✅ Enhanced candidate: ${candidate.name}`);
      
      // Rate limiting for detailed requests
      await new Promise(resolve => setTimeout(resolve, 150));
      
    } catch (error) {
      console.warn(`⚠️ Warning: Could not load details for ${candidate.name}: ${error.message}`);
      enrichedCandidates.push(candidate);
    }
  }
  
  console.log(`🎉 Enrichment completed! ${enrichedCandidates.length} candidates processed`);
  return enrichedCandidates;
}

// Enhanced processCandidateBatch function
async function processCandidateBatchEnhanced(supabase: any, candidates: any[]): Promise<{
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

  if (!candidates || candidates.length === 0) {
    return results;
  }

  try {
    // Enhanced candidate data preparation
    const candidateData = candidates.map(candidate => ({
      workable_candidate_id: candidate.id,
      name: candidate.name || 'Unknown',
      email: candidate.email,
      phone: candidate.phone || null,
      company: candidate.company || null,
      current_position: candidate.applications?.[0]?.job?.title || null,
      location: extractLocation(candidate),
      skills: extractSkills(candidate) || [],
      experience_years: extractExperienceYears(candidate),
      education: extractEducation(candidate) || [],
      linkedin_profile_url: extractLinkedInUrl(candidate),
      profile_picture_url: candidate.profile_picture_url || null,
      profile_completeness_score: calculateCompletenessScore(candidate),
      interview_stage: mapWorkableStatusToInterviewStage(candidate.state),
      source_platform: 'workable',
      last_synced_at: new Date().toISOString(),
      user_id: null,
      created_at: candidate.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Delete existing Workable candidates to avoid conflicts
    const candidateIds = candidates.map(c => c.id);
    await supabase
      .from('candidates')
      .delete()
      .in('workable_candidate_id', candidateIds);

    // Insert in smaller batches to avoid timeout
    const batchSize = 25;
    for (let i = 0; i < candidateData.length; i += batchSize) {
      const batch = candidateData.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('candidates')
        .insert(batch)
        .select('id');

      if (error) {
        console.error('Enhanced batch insert error:', error);
        results.errors.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
      } else {
        results.created += data?.length || 0;
        console.log(`✅ Enhanced batch inserted: ${data?.length || 0} candidates`);
      }
    }

  } catch (error) {
    console.error('Enhanced batch processing error:', error);
    results.errors.push(`Batch processing failed: ${error.message}`);
  }

  return results;
}

// Existing processCandidateBatch for backward compatibility
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

  if (!candidates || candidates.length === 0) {
    return results;
  }

  try {
    const candidateData = candidates.map(candidate => ({
      workable_candidate_id: candidate.id,
      name: candidate.name || 'Unknown',
      email: candidate.email,
      phone: candidate.phone || null,
      company: candidate.company || null,
      current_position: candidate.current_position || null,
      location: extractLocation(candidate),
      skills: extractSkills(candidate) || [],
      experience_years: extractExperienceYears(candidate),
      education: extractEducation(candidate) || [],
      linkedin_profile_url: extractLinkedInUrl(candidate),
      profile_picture_url: candidate.profile_picture_url || null,
      profile_completeness_score: calculateCompletenessScore(candidate),
      interview_stage: mapWorkableStatusToInterviewStage(candidate.state),
      source_platform: 'workable',
      last_synced_at: new Date().toISOString(),
      user_id: null,
      created_at: candidate.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const candidateIds = candidates.map(c => c.id);
    await supabase
      .from('candidates')
      .delete()
      .in('workable_candidate_id', candidateIds);

    const batchSize = 25;
    for (let i = 0; i < candidateData.length; i += batchSize) {
      const batch = candidateData.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('candidates')
        .insert(batch)
        .select('id');

      if (error) {
        console.error('Batch insert error:', error);
        results.errors.push(`Batch ${i}-${i + batch.length}: ${error.message}`);
      } else {
        results.created += data?.length || 0;
      }
    }

  } catch (error) {
    console.error('Batch processing error:', error);
    results.errors.push(`Batch processing failed: ${error.message}`);
  }

  return results;
}

// Helper functions (keeping existing ones and adding new ones)
function extractLocation(candidate: any): string | null {
  return candidate.address?.city || 
         candidate.address?.country || 
         candidate.location || 
         null;
}

function extractSkills(candidate: any): any[] {
  if (candidate.skills && Array.isArray(candidate.skills)) {
    return candidate.skills;
  }
  if (candidate.tags && Array.isArray(candidate.tags)) {
    return candidate.tags;
  }
  return [];
}

function extractExperienceYears(candidate: any): number | null {
  if (candidate.experience_years) {
    return parseInt(candidate.experience_years);
  }
  
  if (candidate.experience === 'entry') return 1;
  if (candidate.experience === 'junior') return 3;
  if (candidate.experience === 'senior') return 7;
  if (candidate.experience === 'executive') return 15;
  
  return null;
}

function extractLinkedInUrl(candidate: any): string | null {
  if (candidate.linkedin_url) return candidate.linkedin_url;
  
  if (candidate.social_profiles && Array.isArray(candidate.social_profiles)) {
    const linkedinProfile = candidate.social_profiles.find(
      (profile: any) => profile.type === 'linkedin'
    );
    return linkedinProfile?.url || null;
  }
  
  return null;
}

function extractEducation(candidate: any): any[] {
  return candidate.education || [];
}

function mapWorkableStatusToInterviewStage(state: string): string {
  const stageMap: Record<string, string> = {
    'sourced': 'sourced',
    'applied': 'applied', 
    'phone_screen': 'phone_screen',
    'interview': 'interview',
    'offer': 'offer',
    'hired': 'hired',
    'rejected': 'rejected',
    'withdrawn': 'withdrawn',
    'active': 'applied',
    'archived': 'withdrawn'
  };

  return stageMap[state] || 'pending';
}

function calculateCompletenessScore(candidate: any): number {
  let score = 0;
  
  if (candidate.email) score += 20;
  if (candidate.phone) score += 15;
  if (candidate.resume_url) score += 20;
  if (extractLinkedInUrl(candidate)) score += 15;
  if (extractSkills(candidate)?.length > 0) score += 15;
  if (candidate.experience_years || candidate.experience) score += 10;
  if (candidate.education?.length > 0) score += 5;
  
  return Math.min(score, 100);
}
