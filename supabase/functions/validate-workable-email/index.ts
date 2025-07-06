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

    // Check admin emails first (fallback)
    if (email === 'bart@growthaccelerator.nl' || email === 'bartwetselaar.books@gmail.com') {
      console.log('✅ Admin email detected');
      return new Response(
        JSON.stringify({ 
          isValid: true, 
          message: 'Admin email is authorized',
          role: 'admin'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch members from Workable API
    console.log('📡 Fetching Workable members...');
    const membersResponse = await fetch(`https://${cleanSubdomain}.workable.com/spi/v3/members`, {
      headers: {
        'Authorization': `Bearer ${workableApiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!membersResponse.ok) {
      console.error(`❌ Failed to fetch members: ${membersResponse.status}`);
      throw new Error(`Failed to fetch Workable members: ${membersResponse.status}`);
    }

    const membersData = await membersResponse.json();
    const members = membersData.members || [];
    
    console.log(`📊 Found ${members.length} members in Workable`);

    // Find the member by email
    const member = members.find((m: any) => 
      m.email && m.email.toLowerCase() === email.toLowerCase() && m.active
    );

    if (!member) {
      console.log(`❌ Email ${email} not found in active Workable members`);
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          message: 'This email is not authorised. Only Growth Accelerator Staffing Partners can create accounts.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Found member: ${member.name} with role: ${member.role}`);

    // Store/update the member in our database
    const { error: upsertError } = await supabase
      .from('workable_users')
      .upsert({
        workable_email: member.email,
        workable_user_id: member.id,
        workable_role: member.role || 'reviewer',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'workable_email'
      });

    if (upsertError) {
      console.error('Error updating workable_users:', upsertError);
    }

    return new Response(
      JSON.stringify({ 
        isValid: true, 
        message: 'Email is authorized for signup',
        role: member.role || 'reviewer',
        name: member.name
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