
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required and must be a string' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    let azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    console.log('API Configuration check:', {
      hasAzureApiKey: !!azureApiKey,
      hasAzureEndpoint: !!azureEndpoint,
      hasOpenAIKey: !!openaiApiKey
    });

    // Try Azure OpenAI first, then fallback to OpenAI
    let useOpenAI = false;
    if (!azureApiKey || !azureEndpoint) {
      console.log('Azure OpenAI not configured, trying OpenAI fallback');
      if (!openaiApiKey) {
        return new Response(
          JSON.stringify({ error: 'Neither Azure OpenAI nor OpenAI API key is configured' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      useOpenAI = true;
    }

    console.log('Generating vacancy for prompt:', prompt.substring(0, 100) + '...');

    const systemPrompt = `You are an expert HR professional and job description writer. Create a compelling, professional job vacancy based on the user's requirements. 

Structure the vacancy with these sections:
1. Job Title (extract or infer from the prompt)
2. About the Role (engaging overview)
3. Key Responsibilities (bullet points)
4. Requirements (bullet points)
5. What We Offer (benefits and perks)
6. Call to action

Make it engaging, professional, and tailored to the specific role described. Use markdown formatting for headers and lists.`;

    const requestBody = {
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Create a job vacancy for: ${prompt}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: false
    };

    let apiUrl, headers;
    
    if (useOpenAI) {
      // Use OpenAI API
      apiUrl = 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
        'Accept': 'application/json'
      };
      requestBody.model = 'gpt-4o-mini'; // Use the latest model
      console.log('Using OpenAI API');
    } else {
      // Use Azure OpenAI
      azureEndpoint = azureEndpoint.replace(/\/$/, '');
      apiUrl = `${azureEndpoint}/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview`;
      headers = {
        'Content-Type': 'application/json',
        'api-key': azureApiKey,
        'Accept': 'application/json'
      };
      console.log('Using Azure OpenAI API');
    }

    console.log('API URL:', apiUrl);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error:', response.status, errorText);
      
      // If Azure OpenAI fails with auth error and we have OpenAI key, try fallback
      if (!useOpenAI && response.status === 401 && openaiApiKey) {
        console.log('Azure OpenAI auth failed, trying OpenAI fallback');
        
        const fallbackRequestBody = {
          ...requestBody,
          model: 'gpt-4o-mini'
        };
        
        const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
            'Accept': 'application/json'
          },
          body: JSON.stringify(fallbackRequestBody),
        });
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const generatedVacancy = fallbackData.choices[0].message.content;
          
          console.log('Successfully generated vacancy with OpenAI fallback');
          
          return new Response(
            JSON.stringify({ generatedVacancy }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
      
      // Try to parse error as JSON for better debugging
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed error:', errorJson);
      } catch (e) {
        console.error('Error text is not JSON:', errorText);
      }
      
      return new Response(
        JSON.stringify({ error: `AI API error: ${response.status} - ${errorText}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const responseText = await response.text();
    console.log('Raw response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON response from AI API' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('Parsed response data:', JSON.stringify(data, null, 2));

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected response format from AI API:', data);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from AI API' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const generatedVacancy = data.choices[0].message.content;
    
    console.log('Successfully generated vacancy with AI');

    return new Response(
      JSON.stringify({ generatedVacancy }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-vacancy function:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
