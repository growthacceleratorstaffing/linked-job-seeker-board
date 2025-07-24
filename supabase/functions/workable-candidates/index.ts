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
    let page = 1
    let hasMore = true
    let totalFetched = 0

    console.log('Starting to fetch all candidates from Workable...')

    while (hasMore) {
      const url = `https://${WORKABLE_SUBDOMAIN}.workable.com/spi/v3/candidates?limit=${limit}&page=${page}`
      
      console.log(`Fetching page ${page} from: ${url}`)
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${WORKABLE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      })

      console.log(`Page ${page} response status: ${response.status}`)

      if (!response.ok) {
        if (response.status === 429) {
          const responseText = await response.text()
          console.error(`Workable API error on page ${page}: ${response.status} ${response.statusText} ${responseText}`)
          
          const retryAfter = response.headers.get('Retry-After')
          const waitTime = retryAfter ? parseInt(retryAfter) : 60
          console.log(`Rate limit hit on page ${page}, waiting ${waitTime} seconds...`)
          
          await new Promise(resolve => setTimeout(resolve, waitTime * 1000))
          continue // Retry the same page
        }
        
        console.error(`Workable API error on page ${page}:`, response.status, response.statusText)
        throw new Error(`Workable API error: ${response.status}`)
      }

      const data = await response.json()
      const candidatesCount = data.candidates?.length || 0
      console.log(`Page ${page} fetched ${candidatesCount} candidates`)

      if (data.candidates && candidatesCount > 0) {
        allCandidates = allCandidates.concat(data.candidates)
        totalFetched += candidatesCount
        console.log(`Running total candidates: ${totalFetched}`)
        
        // Move to next page
        page++
        hasMore = candidatesCount === limit // Continue if we got a full page
      } else {
        hasMore = false
      }

      // Add delay between requests to avoid overwhelming the API
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 200)) // 200ms delay
      }
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