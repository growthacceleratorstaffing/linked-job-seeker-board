import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const WORKABLE_SUBDOMAIN = Deno.env.get('WORKABLE_SUBDOMAIN')
    const WORKABLE_API_TOKEN = Deno.env.get('WORKABLE_API_TOKEN')

    if (!WORKABLE_SUBDOMAIN || !WORKABLE_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Missing Workable configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let allCandidates = []
    let limit = 100
    let offset = 0
    let hasMore = true

    console.log('Starting to fetch all candidates from Workable...')

    while (hasMore) {
      const url = `https://${WORKABLE_SUBDOMAIN}.workable.com/spi/v3/candidates?limit=${limit}&offset=${offset}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${WORKABLE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error('Workable API error:', response.status, response.statusText)
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          console.log(`Rate limited. Retry after: ${retryAfter} seconds`)
          await new Promise(resolve => setTimeout(resolve, (parseInt(retryAfter) || 60) * 1000))
          continue
        }
        throw new Error(`Workable API error: ${response.status}`)
      }

      const data = await response.json()
      console.log(`Fetched ${data.candidates?.length || 0} candidates (offset: ${offset})`)

      if (data.candidates && data.candidates.length > 0) {
        allCandidates = allCandidates.concat(data.candidates)
        offset += limit
        hasMore = data.candidates.length === limit
      } else {
        hasMore = false
      }

      // Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`Total candidates fetched: ${allCandidates.length}`)

    return new Response(
      JSON.stringify(allCandidates),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in workable-candidates function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})