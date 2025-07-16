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

    const workableApiToken = Deno.env.get('WORKABLE_API_TOKEN')
    const workableSubdomain = Deno.env.get('WORKABLE_SUBDOMAIN')
    
    if (!workableApiToken || !workableSubdomain) {
      throw new Error('Workable API configuration missing')
    }

    console.log('🔄 Starting background Workable sync for all users...')

    // Clean the subdomain
    const cleanSubdomain = workableSubdomain.replace('.workable.com', '')
    
    // Fetch all members from Workable API
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

    // Fetch all jobs from Workable API
    const jobsResponse = await fetch(`https://${cleanSubdomain}.workable.com/spi/v3/jobs`, {
      headers: {
        'Authorization': `Bearer ${workableApiToken}`,
        'Content-Type': 'application/json'
      }
    })

    let jobs: any[] = []
    if (jobsResponse.ok) {
      const jobsData = await jobsResponse.json()
      jobs = jobsData.jobs || []
    }

    console.log(`📋 Found ${jobs.length} jobs in Workable`)

    let syncedUsers = 0
    let errors = 0

    // Process each member
    for (const member of members) {
      if (!member.email || !member.active) continue

      try {
        // Determine job assignments based on role
        let assignedJobs: string[] = []
        
        if (member.role === 'admin') {
          assignedJobs = ['*'] // All jobs
        } else if (member.role === 'hiring_manager') {
          // Hiring managers get access to jobs they manage
          assignedJobs = jobs
            .filter((job: any) => job.hiring_team?.some((team: any) => team.id === member.id))
            .map((job: any) => job.shortcode)
        } else {
          // Regular employees get access to jobs they're assigned to
          assignedJobs = jobs
            .filter((job: any) => 
              job.hiring_team?.some((team: any) => team.id === member.id) ||
              job.department === member.department
            )
            .map((job: any) => job.shortcode)
        }

        // Update workable_users record
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
          console.error(`❌ Error updating ${member.email}:`, upsertError)
          errors++
          continue
        }

        // Update user roles and profiles if user exists
        const { data: userProfile } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', member.email)
          .single()

        if (userProfile) {
          // Update app role based on Workable role
          const appRole = member.role === 'admin' ? 'admin' : 
                         member.role === 'hiring_manager' ? 'moderator' : 'user'

          await supabaseClient
            .from('user_roles')
            .upsert({
              user_id: userProfile.id,
              role: appRole
            }, {
              onConflict: 'user_id,role'
            })

          await supabaseClient
            .from('profiles')
            .update({ role: appRole })
            .eq('id', userProfile.id)
        }

        syncedUsers++
        console.log(`✅ Synced ${member.email}: ${member.role} with ${assignedJobs.length} jobs`)

      } catch (error) {
        console.error(`❌ Error processing ${member.email}:`, error)
        errors++
      }
    }

    console.log(`🎉 Background sync completed: ${syncedUsers} users synced, ${errors} errors`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Background sync completed',
        syncedUsers,
        errors,
        totalMembers: members.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in background-sync function:', error)
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