import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('🎵 JazzHR Integration Function started')

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

    // Get JazzHR API key from integration settings
    console.log('🔑 Fetching JazzHR API key from integration settings...')
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integration_settings')
      .select('settings')
      .eq('user_id', user.id)
      .eq('integration_type', 'jazzhr')
      .eq('is_enabled', true)
      .single()

    if (integrationError) {
      console.error('❌ Error fetching integration settings:', integrationError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch integration settings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!integration?.settings?.api_key || !integration?.settings?.username) {
      console.error('❌ JazzHR API credentials not found in integration settings')
      return new Response(
        JSON.stringify({ error: 'JazzHR API credentials not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = integration.settings.api_key
    const username = integration.settings.username
    console.log(`🔑 JazzHR API key found: ${apiKey.substring(0, 8)}...`)

    if (action === 'get_candidates') {
      console.log('🔍 Fetching candidates from JazzHR API...')
      
      // JazzHR API endpoint for candidates (using username in URL)
      const jazzhrResponse = await fetch(`https://api.resumatorapi.com/v1/applicants?apikey=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      console.log(`📡 JazzHR API response status: ${jazzhrResponse.status}`)

      if (!jazzhrResponse.ok) {
        const errorText = await jazzhrResponse.text()
        console.error('❌ JazzHR API error:', errorText)
        return new Response(
          JSON.stringify({ error: `JazzHR API error: ${jazzhrResponse.status} ${errorText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const jazzhrData = await jazzhrResponse.json()
      console.log(`📊 Received ${jazzhrData?.length || 0} candidates from JazzHR`)
      
      // Transform JazzHR data to consistent format
      const candidates = (jazzhrData || []).map((candidate: any) => ({
        id: candidate.id,
        name: `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'Unknown',
        email: candidate.email || 'No email',
        phone: candidate.phone || 'No phone',
        status: candidate.status || 'Unknown',
        job_title: candidate.job?.title || 'No job title',
        applied_date: candidate.apply_date || null,
        source: candidate.source || 'Unknown'
      }))

      console.log(`✅ Successfully transformed ${candidates.length} candidates from JazzHR`)

      return new Response(
        JSON.stringify({ candidates }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_jobs') {
      console.log('🔍 Fetching jobs from JazzHR API...')
      
      // JazzHR API endpoint for jobs
      const jazzhrResponse = await fetch(`https://api.resumatorapi.com/v1/jobs?apikey=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      console.log(`📡 JazzHR API response status: ${jazzhrResponse.status}`)

      if (!jazzhrResponse.ok) {
        const errorText = await jazzhrResponse.text()
        console.error('❌ JazzHR API error:', errorText)
        return new Response(
          JSON.stringify({ error: `JazzHR API error: ${jazzhrResponse.status} ${errorText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const jazzhrData = await jazzhrResponse.json()
      console.log(`📊 Received ${jazzhrData?.length || 0} jobs from JazzHR`)
      
      // Transform JazzHR data to consistent format
      const jobs = (jazzhrData || []).map((job: any) => ({
        id: job.id,
        title: job.title || 'Unknown Title',
        department: job.department || 'No department',
        location: job.city || 'No location',
        status: job.status || 'Unknown',
        created_date: job.created_date || null,
        board_code: job.board_code || null
      }))

      console.log(`✅ Successfully transformed ${jobs.length} jobs from JazzHR`)

      return new Response(
        JSON.stringify({ jobs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`❌ Invalid action: ${action}`)
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Critical error in jazzhr-integration function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})