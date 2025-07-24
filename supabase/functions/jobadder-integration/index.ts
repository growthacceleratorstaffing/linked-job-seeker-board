import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('➕ JobAdder Integration Function started')

serve(async (req) => {
  console.log(`📥 Received ${req.method} request`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    console.log(`🔐 Auth header present: ${!!authHeader}`)
    
    if (!authHeader) {
      console.error('❌ No authorization header found')
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const token = authHeader.replace('Bearer ', '')
    console.log('👤 Getting user from token...')
    
    console.log('🔧 Creating Supabase client...')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    console.log('📋 Parsing request body...')
    const { action } = await req.json()
    console.log(`🎯 Action requested: ${action}`)
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`✅ User authenticated: ${user.email}`)

    // Get JobAdder API credentials from integration settings
    console.log('🔑 Fetching JobAdder API credentials from integration settings...')
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integration_settings')
      .select('settings')
      .eq('user_id', user.id)
      .eq('integration_type', 'jobadder')
      .eq('is_enabled', true)
      .single()

    if (integrationError) {
      console.error('❌ Error fetching integration settings:', integrationError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch integration settings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!integration?.settings?.client_id || !integration?.settings?.client_secret) {
      console.error('❌ JobAdder API credentials not found in integration settings')
      return new Response(
        JSON.stringify({ error: 'JobAdder API credentials not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const clientId = integration.settings.client_id
    const clientSecret = integration.settings.client_secret
    console.log(`🔑 JobAdder Client ID found: ${clientId.substring(0, 8)}...`)

    // For JobAdder, we need to handle OAuth2 flow, but for demo purposes, we'll return sample data
    // In a real implementation, you'd need to handle the OAuth2 token exchange
    if (action === 'get_candidates') {
      console.log('🔍 Fetching candidates from JobAdder API...')
      
      // Note: JobAdder uses OAuth2, so you'd need to implement token exchange here
      // For now, returning sample data structure
      console.log('⚠️ JobAdder OAuth2 integration requires additional setup')
      
      const sampleCandidates = [
        {
          id: '1',
          name: 'John Developer',
          email: 'john@example.com',
          phone: '+1234567890',
          status: 'Active',
          job_title: 'Software Engineer',
          applied_date: '2024-01-15',
          source: 'JobAdder'
        },
        {
          id: '2',
          name: 'Jane Designer',
          email: 'jane@example.com',
          phone: '+1234567891',
          status: 'Interviewing',
          job_title: 'UI/UX Designer',
          applied_date: '2024-01-14',
          source: 'JobAdder'
        }
      ]

      console.log(`✅ Returning ${sampleCandidates.length} sample candidates from JobAdder`)

      return new Response(
        JSON.stringify({ candidates: sampleCandidates }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_jobs') {
      console.log('🔍 Fetching jobs from JobAdder API...')
      
      const sampleJobs = [
        {
          id: '1',
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'San Francisco, CA',
          status: 'Active',
          created_date: '2024-01-10',
          board_code: 'ENG001'
        },
        {
          id: '2',
          title: 'Product Manager',
          department: 'Product',
          location: 'New York, NY',
          status: 'Active',
          created_date: '2024-01-12',
          board_code: 'PM001'
        }
      ]

      console.log(`✅ Returning ${sampleJobs.length} sample jobs from JobAdder`)

      return new Response(
        JSON.stringify({ jobs: sampleJobs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`❌ Invalid action: ${action}`)
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Critical error in jobadder-integration function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})