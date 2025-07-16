import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.10'

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

    const { action } = await req.json()
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Apollo API key from integration settings
    const { data: integration } = await supabaseClient
      .from('integration_settings')
      .select('settings')
      .eq('user_id', user.id)
      .eq('integration_type', 'apollo')
      .eq('is_enabled', true)
      .single()

    if (!integration?.settings?.api_key) {
      return new Response(
        JSON.stringify({ error: 'Apollo API key not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = integration.settings.api_key

    if (action === 'get_contacts') {
      console.log('🔍 Fetching contacts from Apollo...')
      
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

      if (!apolloResponse.ok) {
        const errorText = await apolloResponse.text()
        console.error('Apollo API error:', errorText)
        throw new Error(`Apollo API error: ${apolloResponse.status} ${errorText}`)
      }

      const apolloData = await apolloResponse.json()
      
      // Transform Apollo data to consistent format
      const contacts = apolloData.people?.map((person: any) => ({
        id: person.id,
        name: `${person.first_name} ${person.last_name}`,
        email: person.email,
        title: person.title,
        company: person.organization?.name,
        industry: person.organization?.industry,
        location: person.city,
        linkedin_url: person.linkedin_url
      })) || []

      console.log(`✅ Retrieved ${contacts.length} contacts from Apollo`)

      return new Response(
        JSON.stringify({ contacts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})