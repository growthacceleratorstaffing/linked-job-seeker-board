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
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: 'Email is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const jobadderClientId = Deno.env.get('JOBADDER_CLIENT_ID');
    const jobadderClientSecret = Deno.env.get('JOBADDER_CLIENT_SECRET');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: 'Server configuration error' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use the database function to validate the email
    const { data, error } = await supabase.rpc('validate_jobadder_email', {
      email_to_check: email
    });

    if (error) {
      console.error('Database validation error:', error);
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: 'Failed to validate email against JobAdder accounts' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: 'This email is not registered with JobAdder. Please contact your administrator to get access.' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // If we have JobAdder credentials, we could also validate against JobAdder API
    // But for now, we'll rely on the database validation
    if (jobadderClientId && jobadderClientSecret) {
      // TODO: Add JobAdder API validation here if needed
      // This would involve checking if the user exists in JobAdder
      console.log('JobAdder API validation could be added here');
    }

    return new Response(
      JSON.stringify({ 
        isValid: true, 
        message: 'Email validated successfully against JobAdder accounts' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in validate-jobadder-email function:', error);
    
    return new Response(
      JSON.stringify({ 
        isValid: false, 
        message: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});