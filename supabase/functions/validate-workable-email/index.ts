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

    // Check admin emails first (fallback - only for the main admin)
    if (email === 'bart@growthaccelerator.nl' || email === 'bartwetselaar.books@gmail.com') {
      console.log('✅ Admin email detected');
      return new Response(
        JSON.stringify({ 
          isValid: true, 
          message: 'Admin email is authorized',
          role: 'admin',
          name: email.split('@')[0]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch members from Workable API for other users
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

    // Fetch assigned jobs for this member
    const jobsResponse = await fetch(`https://${cleanSubdomain}.workable.com/spi/v3/jobs`, {
      headers: {
        'Authorization': `Bearer ${workableApiToken}`,
        'Content-Type': 'application/json'
      }
    });

    let assignedJobs: string[] = [];
    if (jobsResponse.ok) {
      const jobsData = await jobsResponse.json();
      const jobs = jobsData.jobs || [];
      
      console.log(`📊 Found ${jobs.length} jobs in Workable`);
      
      // Determine job assignments based on Workable's role system
      if (member.role === 'admin') {
        assignedJobs = ['*']; // All jobs
        console.log(`👑 Admin user - assigned to ALL jobs`);
      } else {
        // For non-admin users, check actual Workable permissions
        console.log(`🔍 Checking job access for ${member.role} user: ${member.email}`);
        
        for (const job of jobs) {
          let hasAccess = false;
          
          try {
            // Fetch detailed job information to check permissions
            const detailedJobResponse = await fetch(`https://${cleanSubdomain}.workable.com/spi/v3/jobs/${job.shortcode}`, {
              headers: {
                'Authorization': `Bearer ${workableApiToken}`,
                'Content-Type': 'application/json'
              }
            });

            if (detailedJobResponse.ok) {
              const detailedJob = await detailedJobResponse.json();
              
              // Check 1: User is in hiring team
              if (detailedJob.hiring_team?.some((team: any) => team.id === member.id)) {
                hasAccess = true;
                console.log(`✅ Access to "${job.title}" - member of hiring team`);
              }
              
              // Check 2: User is listed as recruiter or hiring manager for the job
              if (detailedJob.recruiter?.id === member.id || detailedJob.hiring_manager?.id === member.id) {
                hasAccess = true;
                console.log(`✅ Access to "${job.title}" - recruiter/hiring manager`);
              }
              
              // Check 3: User is in job members/collaborators
              if (detailedJob.members?.some((m: any) => m.id === member.id)) {
                hasAccess = true;
                console.log(`✅ Access to "${job.title}" - listed as job member`);
              }

              // Check 4: Department match (if both have departments)
              if (member.department && detailedJob.department && member.department === detailedJob.department) {
                hasAccess = true;
                console.log(`✅ Access to "${job.title}" - department match`);
              }

              // Check 5: For simple users, check if they have default access to published jobs
              if (!hasAccess && member.role === 'simple' && job.state === 'published') {
                hasAccess = true;
                console.log(`✅ Access to "${job.title}" - published job (simple role access)`);
              }

              if (hasAccess) {
                assignedJobs.push(job.shortcode);
              }
            } else {
              console.log(`⚠️ Failed to fetch detailed job info for ${job.title}: ${detailedJobResponse.status}`);
              // For simple users with published jobs, give default access as fallback
              if (member.role === 'simple' && job.state === 'published') {
                hasAccess = true;
                assignedJobs.push(job.shortcode);
                console.log(`✅ Access to "${job.title}" - published job (fallback access)`);
              }
            }
          } catch (error) {
            console.log(`❌ Error fetching job details for ${job.title}: ${error}`);
            // For simple users with published jobs, give default access as fallback
            if (member.role === 'simple' && job.state === 'published') {
              hasAccess = true;
              assignedJobs.push(job.shortcode);
              console.log(`✅ Access to "${job.title}" - published job (error fallback)`);
            }
          }
        }
      }
    }

    console.log(`📋 Final job assignments for ${member.name} (${member.role}): ${assignedJobs.length > 0 ? assignedJobs.join(', ') : 'None'}`);

    // Store/update the member in our database with proper role and job assignments
    const { error: upsertError } = await supabase
      .from('workable_users')
      .upsert({
        workable_email: member.email,
        workable_user_id: member.id,
        workable_role: member.role || 'reviewer',
        assigned_jobs: assignedJobs,
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
        name: member.name,
        assigned_jobs: assignedJobs
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