import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

console.log('🚀 Apollo Integration Function started')

serve(async (req) => {
  console.log(`📥 Received ${req.method} request`)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔧 Creating Supabase client...')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('📋 Parsing request body...')
    const { action } = await req.json()
    console.log(`🎯 Action requested: ${action}`)
    
    // Get user from auth header
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
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`✅ User authenticated: ${user.email}`)

    // Get Apollo API key from integration settings
    console.log('🔑 Fetching Apollo API key from integration settings...')
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integration_settings')
      .select('settings')
      .eq('user_id', user.id)
      .eq('integration_type', 'apollo')
      .eq('is_enabled', true)
      .single()

    if (integrationError) {
      console.error('❌ Error fetching integration settings:', integrationError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch integration settings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!integration?.settings?.api_key) {
      console.error('❌ Apollo API key not found in integration settings')
      return new Response(
        JSON.stringify({ error: 'Apollo API key not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = integration.settings.api_key
    console.log(`🔑 Apollo API key found: ${apiKey.substring(0, 8)}...`)

    if (action === 'get_contacts') {
      console.log('🔍 Fetching contacts from Apollo API...')
      
      // Call Apollo API to get contacts
      const apolloResponse = await fetch('https://api.apollo.io/v1/mixed_people/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify({
          page: 1,
          per_page: 25,
          organization_locations: ["United States"],
          person_seniorities: ["senior", "manager", "director", "vp", "c_level"]
        })
      })

      console.log(`📡 Apollo API response status: ${apolloResponse.status}`)

      if (!apolloResponse.ok) {
        const errorText = await apolloResponse.text()
        console.error('❌ Apollo API error:', errorText)
        return new Response(
          JSON.stringify({ error: `Apollo API error: ${apolloResponse.status} ${errorText}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const apolloData = await apolloResponse.json()
      console.log('📊 Apollo API response received, parsing data...')
      
      // Transform Apollo data to consistent format
      const contacts = apolloData.people?.map((person: any) => ({
        id: person.id,
        name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unknown',
        email: person.email || 'No email',
        title: person.title || 'No title',
        company: person.organization?.name || 'No company',
        industry: person.organization?.industry || 'No industry',
        location: person.city || 'No location',
        linkedin_url: person.linkedin_url || null
      })) || []

      console.log(`✅ Successfully transformed ${contacts.length} contacts from Apollo`)

      return new Response(
        JSON.stringify({ contacts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`❌ Invalid action: ${action}`)
    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Critical error in apollo-integration function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})