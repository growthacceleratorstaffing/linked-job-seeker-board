
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, jobData, jobId } = await req.json();
    
    const workableApiToken = Deno.env.get('WORKABLE_API_TOKEN');
    const workableSubdomain = Deno.env.get('WORKABLE_SUBDOMAIN');

    if (!workableApiToken || !workableSubdomain) {
      return new Response(
        JSON.stringify({ error: 'Workable credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const baseUrl = `https://${workableSubdomain}.workable.com/spi/v3`;
    const headers = {
      'Authorization': `Bearer ${workableApiToken}`,
      'Content-Type': 'application/json',
    };

    switch (action) {
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
        
        const response = await fetch(`${baseUrl}/jobs?state=published&limit=50`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Workable API error:', response.status, errorText);
          throw new Error(`Failed to sync jobs: ${response.status}`);
        }

        const data = await response.json();
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            jobs: data.jobs || [],
            total: data.jobs?.length || 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_job': {
        if (!jobId) {
          throw new Error('Job ID is required');
        }

        console.log('Getting job from Workable:', jobId);
        
        const response = await fetch(`${baseUrl}/jobs/${jobId}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Workable API error:', response.status, errorText);
          throw new Error(`Failed to get job: ${response.status}`);
        }

        const job = await response.json();
        
        return new Response(
          JSON.stringify({ success: true, job }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error) {
    console.error('Error in workable-integration function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
