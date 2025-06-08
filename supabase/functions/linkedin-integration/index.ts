
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
    const { action, candidateData, accessToken } = await req.json();
    
    const linkedinClientId = Deno.env.get('LINKEDIN_CLIENT_ID');
    const linkedinClientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!linkedinClientId || !linkedinClientSecret) {
      return new Response(
        JSON.stringify({ error: 'LinkedIn credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    switch (action) {
      case 'get_profile': {
        if (!accessToken) {
          throw new Error('Access token is required');
        }

        const profileResponse = await fetch('https://api.linkedin.com/v2/people/~', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!profileResponse.ok) {
          throw new Error(`LinkedIn API error: ${profileResponse.status}`);
        }

        const profile = await profileResponse.json();
        
        return new Response(
          JSON.stringify({ success: true, profile }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'import_candidate': {
        if (!candidateData.email) {
          throw new Error('Email is required to import candidate');
        }

        // Check if candidate already exists
        const { data: existingCandidate } = await supabase
          .from('candidates')
          .select('*')
          .eq('email', candidateData.email)
          .single();

        let candidateId;
        
        if (existingCandidate) {
          // Update existing candidate with LinkedIn data
          const { data: updatedCandidate, error } = await supabase
            .from('candidates')
            .update({
              linkedin_profile_url: candidateData.linkedin_profile_url,
              linkedin_id: candidateData.linkedin_id,
              profile_picture_url: candidateData.profile_picture_url,
              location: candidateData.location,
              current_position: candidateData.current_position,
              company: candidateData.company,
              skills: candidateData.skills || [],
              experience_years: candidateData.experience_years,
              education: candidateData.education || [],
              source_platform: existingCandidate.source_platform === 'manual' ? 'linkedin' : existingCandidate.source_platform,
              last_synced_at: new Date().toISOString(),
              profile_completeness_score: calculateCompletenessScore({...existingCandidate, ...candidateData})
            })
            .eq('id', existingCandidate.id)
            .select()
            .single();

          if (error) throw error;
          candidateId = existingCandidate.id;
        } else {
          // Create new candidate
          const { data: newCandidate, error } = await supabase
            .from('candidates')
            .insert([{
              name: candidateData.name,
              email: candidateData.email,
              phone: candidateData.phone,
              linkedin_profile_url: candidateData.linkedin_profile_url,
              linkedin_id: candidateData.linkedin_id,
              profile_picture_url: candidateData.profile_picture_url,
              location: candidateData.location,
              current_position: candidateData.current_position,
              company: candidateData.company,
              skills: candidateData.skills || [],
              experience_years: candidateData.experience_years,
              education: candidateData.education || [],
              source_platform: 'linkedin',
              last_synced_at: new Date().toISOString(),
              profile_completeness_score: calculateCompletenessScore(candidateData)
            }])
            .select()
            .single();

          if (error) throw error;
          candidateId = newCandidate.id;
        }

        // Log the sync operation
        await supabase
          .from('integration_sync_logs')
          .insert([{
            integration_type: 'linkedin',
            sync_type: 'candidate_import',
            candidate_id: candidateId,
            status: 'success',
            synced_data: candidateData
          }]);

        return new Response(
          JSON.stringify({ success: true, candidateId, message: 'Candidate imported from LinkedIn successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'enrich_candidate': {
        if (!candidateData.candidateId) {
          throw new Error('Candidate ID is required');
        }

        // Here you would typically search LinkedIn by email or name
        // For now, we'll simulate enrichment data
        const enrichmentData = {
          profile_picture_url: candidateData.profile_picture_url,
          current_position: candidateData.current_position,
          company: candidateData.company,
          location: candidateData.location,
          skills: candidateData.skills || [],
          last_synced_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('candidates')
          .update(enrichmentData)
          .eq('id', candidateData.candidateId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, candidate: data }),
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
    console.error('Error in linkedin-integration function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateCompletenessScore(candidate: any): number {
  let score = 0;
  const fields = [
    'name', 'email', 'phone', 'linkedin_profile_url', 'profile_picture_url',
    'location', 'current_position', 'company', 'skills', 'experience_years', 'education'
  ];
  
  fields.forEach(field => {
    if (candidate[field]) {
      if (Array.isArray(candidate[field])) {
        score += candidate[field].length > 0 ? 10 : 0;
      } else {
        score += 10;
      }
    }
  });
  
  return Math.min(score, 100);
}
