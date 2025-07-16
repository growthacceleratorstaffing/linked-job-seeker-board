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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const workableApiToken = Deno.env.get('WORKABLE_API_TOKEN');
    const workableSubdomain = Deno.env.get('WORKABLE_SUBDOMAIN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!workableApiToken || !workableSubdomain || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuration missing');
    }

    const cleanSubdomain = workableSubdomain.replace('.workable.com', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`🔍 Validating email: ${email}`);

    // Temporarily simplified: Allow all emails for testing
    console.log(`✅ Email validation bypassed for testing: ${email}`);
    
    return new Response(
      JSON.stringify({ 
        isValid: true, 
        message: 'Email validation bypassed for testing - all emails allowed',
        role: 'admin', // Default to admin for testing
        name: email.split('@')[0]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in validate-workable-email function:', error);
    
    return new Response(
      JSON.stringify({ 
        isValid: false, 
        message: 'Error validating email. Please try again.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});