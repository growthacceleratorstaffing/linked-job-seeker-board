import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const workableApiToken = Deno.env.get('WORKABLE_API_TOKEN')
    const workableSubdomain = Deno.env.get('WORKABLE_SUBDOMAIN')
    
    if (!workableApiToken || !workableSubdomain) {
      return new Response(
        JSON.stringify({ error: 'Workable API configuration missing' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🔍 Syncing Workable role for: ${email}`)

    // Clean the subdomain
    const cleanSubdomain = workableSubdomain.replace('.workable.com', '')
    
    // Fetch member data from Workable API
    const membersResponse = await fetch(`https://${cleanSubdomain}.workable.com/spi/v3/members`, {
      headers: {
        'Authorization': `Bearer ${workableApiToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!membersResponse.ok) {
      throw new Error(`Failed to fetch Workable members: ${membersResponse.status}`)
    }

    const membersData = await membersResponse.json()
    const members = membersData.members || []
    
    console.log(`📊 Found ${members.length} members in Workable`)

    // Find the member by email
    const member = members.find((m: any) => 
      m.email && m.email.toLowerCase() === email.toLowerCase() && m.active
    )

    if (!member) {
      console.log(`❌ Email ${email} not found in active Workable members`)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email not found in active Workable members' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Found member: ${member.name} with role: ${member.role}`)

    // Fetch assigned jobs for this member
    const jobsResponse = await fetch(`https://${cleanSubdomain}.workable.com/spi/v3/jobs`, {
      headers: {
        'Authorization': `Bearer ${workableApiToken}`,
        'Content-Type': 'application/json'
      }
    })

    let assignedJobs: string[] = []
    if (jobsResponse.ok) {
      const jobsData = await jobsResponse.json()
      const jobs = jobsData.jobs || []
      
      console.log(`📊 Found ${jobs.length} jobs in Workable`)
      
      // Determine job assignments based on role
      if (member.role === 'admin') {
        assignedJobs = ['*'] // All jobs
        console.log(`👑 Admin user - assigned to ALL jobs`)
      } else {
        // For non-admin users, check multiple criteria for job access
        for (const job of jobs) {
          let hasAccess = false
          
          // Check 1: User is in hiring team
          if (job.hiring_team?.some((team: any) => team.id === member.id)) {
            hasAccess = true
            console.log(`✅ Access to "${job.title}" - member of hiring team`)
          }
          
          // Check 2: Department match
          if (job.department === member.department) {
            hasAccess = true
            console.log(`✅ Access to "${job.title}" - department match`)
          }
          
          // Check 3: User is listed as recruiter or hiring manager for the job
          if (job.recruiter?.id === member.id || job.hiring_manager?.id === member.id) {
            hasAccess = true
            console.log(`✅ Access to "${job.title}" - recruiter/hiring manager`)
          }
          
          // Check 4: User has permissions for the job based on their role
          if (member.role === 'hiring_manager' || member.role === 'simple') {
            // For hiring managers and simple users, check if they have any connection to the job
            if (job.members?.some((m: any) => m.id === member.id)) {
              hasAccess = true
              console.log(`✅ Access to "${job.title}" - listed as job member`)
            }
          }
          
          if (hasAccess) {
            assignedJobs.push(job.shortcode)
          }
        }
      }
    }

    console.log(`📋 Final job assignments for ${member.name} (${member.role}): ${assignedJobs.length > 0 ? assignedJobs.join(', ') : 'None'}`)

    // Update or create the workable_users record
    const { error: upsertError } = await supabaseClient
      .from('workable_users')
      .upsert({
        workable_email: member.email,
        workable_user_id: member.id,
        workable_role: member.role || 'reviewer',
        assigned_jobs: assignedJobs,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'workable_email'
      })

    if (upsertError) {
      console.error('Error updating workable_users:', upsertError)
      throw upsertError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Role synced successfully',
        role: member.role || 'reviewer',
        name: member.name,
        assigned_jobs: assignedJobs,
        permissions: {
          admin: member.role === 'admin',
          hiring_manager: member.role === 'hiring_manager',
          simple: ['admin', 'hiring_manager', 'simple'].includes(member.role),
          reviewer: ['admin', 'hiring_manager', 'simple', 'reviewer'].includes(member.role)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in sync-workable-role function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})