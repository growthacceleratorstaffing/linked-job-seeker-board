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

    console.log(`🔍 DEBUG: Syncing Workable role for: ${email}`)

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
    
    console.log(`📊 DEBUG: Found ${members.length} members in Workable`)

    // Find the member by email
    const member = members.find((m: any) => 
      m.email && m.email.toLowerCase() === email.toLowerCase() && m.active
    )

    if (!member) {
      console.log(`❌ DEBUG: Email ${email} not found in active Workable members`)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email not found in active Workable members' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ DEBUG: Found member details:`)
    console.log(`   - Name: ${member.name}`)
    console.log(`   - Email: ${member.email}`)
    console.log(`   - ID: ${member.id}`)
    console.log(`   - Role: ${member.role}`)
    console.log(`   - Department: ${member.department}`)
    console.log(`   - Active: ${member.active}`)
    console.log(`   - Full member object:`, JSON.stringify(member, null, 2))

    // Fetch all jobs from Workable API
    const jobsResponse = await fetch(`https://${cleanSubdomain}.workable.com/spi/v3/jobs`, {
      headers: {
        'Authorization': `Bearer ${workableApiToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!jobsResponse.ok) {
      throw new Error(`Failed to fetch Workable jobs: ${jobsResponse.status}`)
    }

    const jobsData = await jobsResponse.json()
    const jobs = jobsData.jobs || []
    
    console.log(`📊 DEBUG: Found ${jobs.length} jobs in Workable`)

    // Debug: Show structure of first few jobs
    console.log(`🔍 DEBUG: First 3 jobs structure:`)
    jobs.slice(0, 3).forEach((job: any, index: number) => {
      console.log(`   Job ${index + 1}:`)
      console.log(`     - Title: ${job.title}`)
      console.log(`     - Shortcode: ${job.shortcode}`)
      console.log(`     - Department: ${job.department}`)
      console.log(`     - Hiring Team: ${JSON.stringify(job.hiring_team)}`)
      console.log(`     - Recruiter: ${JSON.stringify(job.recruiter)}`)
      console.log(`     - Hiring Manager: ${JSON.stringify(job.hiring_manager)}`)
      console.log(`     - Members: ${JSON.stringify(job.members)}`)
      console.log(`     - State: ${job.state}`)
    })

    // Determine job assignments with detailed debugging
    let assignedJobs: string[] = []
    let debugLog: string[] = []

    if (member.role === 'admin') {
      assignedJobs = ['*']
      debugLog.push('👑 Admin user - assigned to ALL jobs')
    } else {
      // For "simple" role users in Workable, they typically have access to jobs based on Workable's built-in permissions
      // Let's check what Workable considers accessible for this user
      console.log(`🔍 Checking job access for ${member.role} user: ${member.email}`)
      
      for (const job of jobs) {
        let hasAccess = false
        let accessReason = ''

        // For simple role users, Workable typically gives access to:
        // 1. Jobs where they are explicitly assigned as team members
        // 2. Jobs in their department (if department matching is enabled)
        // 3. Jobs where they are the recruiter or hiring manager
        // 4. Published jobs (depending on Workable configuration for simple users)

        try {
          // Fetch detailed job information to check permissions
          const detailedJobResponse = await fetch(`https://${cleanSubdomain}.workable.com/spi/v3/jobs/${job.shortcode}`, {
            headers: {
              'Authorization': `Bearer ${workableApiToken}`,
              'Content-Type': 'application/json'
            }
          })

          if (detailedJobResponse.ok) {
            const detailedJob = await detailedJobResponse.json()
            
            // Check 1: User is explicitly in hiring team
            if (detailedJob.hiring_team && Array.isArray(detailedJob.hiring_team)) {
              const isInHiringTeam = detailedJob.hiring_team.some((team: any) => team.id === member.id)
              if (isInHiringTeam) {
                hasAccess = true
                accessReason = 'hiring team member'
              }
            }

            // Check 2: User is recruiter for the job
            if (detailedJob.recruiter && detailedJob.recruiter.id === member.id) {
              hasAccess = true
              accessReason = accessReason ? `${accessReason} + recruiter` : 'recruiter'
            }

            // Check 3: User is hiring manager for the job
            if (detailedJob.hiring_manager && detailedJob.hiring_manager.id === member.id) {
              hasAccess = true
              accessReason = accessReason ? `${accessReason} + hiring manager` : 'hiring manager'
            }

            // Check 4: User is in job members/collaborators
            if (detailedJob.members && Array.isArray(detailedJob.members)) {
              const isJobMember = detailedJob.members.some((m: any) => m.id === member.id)
              if (isJobMember) {
                hasAccess = true
                accessReason = accessReason ? `${accessReason} + job member` : 'job member'
              }
            }

            // Check 5: Department match (if both user and job have department)
            if (member.department && detailedJob.department && member.department === detailedJob.department) {
              hasAccess = true
              accessReason = accessReason ? `${accessReason} + department match` : 'department match'
            }

            // Check 6: For simple users, check if job is published and they have default access
            if (!hasAccess && member.role === 'simple') {
              // In many Workable setups, simple users can view published jobs
              if (job.state === 'published') {
                hasAccess = true
                accessReason = 'published job (simple role default access)'
              }
            }

          } else {
            console.log(`   ⚠️ Failed to fetch detailed job info: ${detailedJobResponse.status}`)
            // For simple users with published jobs, give default access as fallback
            if (member.role === 'simple' && job.state === 'published') {
              hasAccess = true
              accessReason = 'published job (fallback access)'
            }
          }
        } catch (error) {
          console.log(`   ❌ Error fetching job details: ${error}`)
          // For simple users with published jobs, give default access as fallback
          if (member.role === 'simple' && job.state === 'published') {
            hasAccess = true
            accessReason = 'published job (error fallback)'
          }
        }

        debugLog.push(`🔍 Job "${job.title}" (${job.shortcode}): ${hasAccess ? '✅ ACCESS' : '❌ NO ACCESS'} ${accessReason ? `(${accessReason})` : ''}`)

        if (hasAccess) {
          assignedJobs.push(job.shortcode)
        }
      }
    }

    console.log(`📋 DEBUG: Job assignment results:`)
    debugLog.forEach(log => console.log(`   ${log}`))
    console.log(`📋 DEBUG: Final assigned jobs: [${assignedJobs.join(', ')}]`)

    // Update the database
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
      console.error('❌ DEBUG: Error updating workable_users:', upsertError)
      throw upsertError
    }

    console.log(`✅ DEBUG: Successfully updated database for ${member.email}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Role synced successfully',
        debug: {
          member: {
            name: member.name,
            email: member.email,
            id: member.id,
            role: member.role,
            department: member.department
          },
          jobs: {
            total: jobs.length,
            assigned: assignedJobs.length,
            assigned_jobs: assignedJobs
          },
          debug_log: debugLog
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ DEBUG: Error in debug-workable-sync function:', error)
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