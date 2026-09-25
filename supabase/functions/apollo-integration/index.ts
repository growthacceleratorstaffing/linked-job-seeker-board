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
    const body = await req.json()
    const { action } = body
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
      const maxPages = 50 // up to 5,000 contacts

      while (hasMorePages && currentPage <= maxPages) {
        console.log(`📄 Fetching page ${currentPage}...`)

        // Contacts saved in the user's OWN Apollo account (not Apollo's global people database)
        const apolloResponse = await fetch('https://api.apollo.io/api/v1/contacts/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': apiKey,
          },
          body: JSON.stringify({ page: currentPage, per_page: 100, sort_by_field: 'contact_created_at', sort_ascending: false })
        })

        console.log(`📡 Apollo API response status for page ${currentPage}: ${apolloResponse.status}`)

        if (!apolloResponse.ok) {
          const errorText = await apolloResponse.text()
          console.error('❌ Apollo API error:', errorText)
          return new Response(
            JSON.stringify({ error: apolloResponse.status === 403 ? `Your Apollo API key can't read your contacts. In Apollo go to Settings → Integrations → API and use a master key (or enable the contacts search endpoint). Details: ${errorText}` : `Apollo API error: ${apolloResponse.status} ${errorText}` }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const apolloData = await apolloResponse.json()
        const pageContacts = apolloData.contacts || []
        console.log(`📊 Page ${currentPage}: received ${pageContacts.length} contacts`)
        allContacts = allContacts.concat(pageContacts)

        const totalPages = apolloData.pagination?.total_pages ?? currentPage
        if (pageContacts.length === 0 || currentPage >= totalPages) {
          hasMorePages = false
        } else {
          currentPage++
        }
      }

      console.log(`📊 Total contacts fetched: ${allContacts.length}`)

      const phone = (p: any) => (p.phone_numbers || []).map((n: any) => n.sanitized_number || n.raw_number).filter(Boolean).join(', ')
      const contacts = allContacts.map((p: any) => ({
        first_name: p.first_name ?? '',
        last_name: p.last_name ?? '',
        email: p.email ?? '',
        email_status: p.email_status ?? '',
        title: p.title ?? '',
        headline: p.headline ?? '',
        seniority: p.seniority ?? '',
        departments: (p.departments || []).join(', '),
        company: p.organization_name || p.organization?.name || '',
        company_website: p.organization?.website_url ?? '',
        company_domain: p.organization?.primary_domain ?? '',
        industry: p.organization?.industry ?? '',
        company_size: p.organization?.estimated_num_employees ?? '',
        phone: phone(p),
        city: p.city ?? '',
        state: p.state ?? '',
        country: p.country ?? '',
        time_zone: p.time_zone ?? '',
        linkedin_url: p.linkedin_url ?? '',
        twitter_url: p.twitter_url ?? '',
        stage: p.contact_stage_id ?? '',
        owner_id: p.owner_id ?? '',
        labels: (p.label_ids || []).join(', '),
        source: p.source ?? '',
        last_activity: p.last_activity_date ?? '',
        created_at: p.created_at ?? '',
        updated_at: p.updated_at ?? '',
        id: p.id,
      }))

      console.log(`✅ Successfully transformed ${contacts.length} contacts from Apollo`)

      return new Response(
        JSON.stringify({ contacts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update_contact') {
      const allowed = ['first_name', 'last_name', 'email', 'title', 'organization_name', 'website_url', 'present_raw_address', 'direct_phone', 'linkedin_url', 'twitter_url']
      const id = String(body.id ?? '')
      if (!/^[a-zA-Z0-9]+$/.test(id)) {
        return new Response(JSON.stringify({ error: 'Invalid contact id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const f = body.fields ?? {}
      const payload: Record<string, string> = {}
      const map: Record<string, string> = { company: 'organization_name', company_website: 'website_url', phone: 'direct_phone' }
      for (const [k, v] of Object.entries(f)) {
        const key = map[k] ?? k
        if (allowed.includes(key) && typeof v === 'string') payload[key] = v.slice(0, 500)
      }
      const r = await fetch(`https://api.apollo.io/api/v1/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'X-Api-Key': apiKey },
        body: JSON.stringify(payload),
      })
      const text = await r.text()
      if (!r.ok) {
        console.error('❌ Apollo update failed:', r.status, text)
        return new Response(JSON.stringify({ error: `Apollo couldn't save the change (${r.status}): ${text}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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