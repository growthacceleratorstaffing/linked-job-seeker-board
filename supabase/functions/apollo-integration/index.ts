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
    // Get auth header first
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

    // Get Apollo API key from integration settings
    console.log('🔑 Fetching Apollo API key from integration settings...')
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integration_settings')
      .select('settings')
      .eq('user_id', user.id)
      .eq('integration_type', 'apollo')
      .eq('is_enabled', true)
      .maybeSingle()

    if (integrationError || !integration) {
      console.error('❌ Error fetching integration settings:', integrationError)
      return new Response(
        JSON.stringify({ error: 'Apollo is not connected yet. Save your API key first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = String(integration?.settings?.api_key ?? '').trim()
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Apollo API key not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'test_connection') {
      const r = await fetch('https://api.apollo.io/api/v1/auth/health', {
        headers: { 'X-Api-Key': apiKey, 'Cache-Control': 'no-cache' },
      })
      const body = await r.text()
      let ok = r.ok
      try { const j = JSON.parse(body); if (j.is_logged_in === false) ok = false } catch { /* ignore */ }
      if (!ok) {
        console.error('❌ Apollo test failed:', r.status, body)
        return new Response(
          JSON.stringify({ error: `Apollo rejected the API key (${r.status}): ${body}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'get_contacts') {
      console.log('🔍 Fetching all contacts from Apollo API...')
      
      let allContacts: any[] = []
      let currentPage = 1
      let hasMorePages = true
      const maxPages = 10
      
      while (hasMorePages && currentPage <= maxPages) {
        console.log(`📄 Fetching page ${currentPage}...`)
        
        // New Apollo people search endpoint (old /v1/mixed_people/search is deprecated for API keys)
        const apolloResponse = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': apiKey,
          },
          body: JSON.stringify({
            page: currentPage,
            per_page: 100,
            person_seniorities: ["senior", "manager", "director", "vp", "c_suite"]
          })
        })

        console.log(`📡 Apollo API response status for page ${currentPage}: ${apolloResponse.status}`)

        if (!apolloResponse.ok) {
          const errorText = await apolloResponse.text()
          console.error('❌ Apollo API error:', errorText)
          return new Response(
            JSON.stringify({ error: `Apollo API error: ${apolloResponse.status} ${errorText}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const apolloData = await apolloResponse.json()
        console.log(`📊 Page ${currentPage}: received ${apolloData.people?.length || 0} contacts`)
        
        if (apolloData.people && apolloData.people.length > 0) {
          allContacts = allContacts.concat(apolloData.people)
          
          // Check if there are more pages
          if (apolloData.people.length < 200) {
            hasMorePages = false
          } else {
            currentPage++
          }
        } else {
          hasMorePages = false
        }
      }
      
      console.log(`📊 Total contacts fetched: ${allContacts.length}`)
      
      // Transform Apollo data to consistent format
      const contacts = allContacts.map((person: any) => ({
        id: person.id,
        name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unknown',
        email: person.email || 'No email',
        title: person.title || 'No title',
        company: person.organization?.name || 'No company',
        industry: person.organization?.industry || 'No industry',
        location: person.city || 'No location',
        linkedin_url: person.linkedin_url || null
      }))

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