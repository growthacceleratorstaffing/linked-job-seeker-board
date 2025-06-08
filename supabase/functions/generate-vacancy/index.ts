
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
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
    const deploymentName = Deno.env.get('AZURE_OPENAI_DEPLOYMENT_NAME') || 'gpt-4o';

    if (!azureApiKey || !azureEndpoint) {
      console.error('Missing Azure OpenAI configuration:', { 
        hasApiKey: !!azureApiKey, 
        hasEndpoint: !!azureEndpoint 
      });
      return new Response(
        JSON.stringify({ error: 'Azure OpenAI configuration missing. Please check AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT.' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Construct the proper Azure OpenAI endpoint URL
    const baseUrl = azureEndpoint.endsWith('/') ? azureEndpoint.slice(0, -1) : azureEndpoint;
    const apiUrl = `${baseUrl}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`;

    console.log('Generating vacancy with Azure OpenAI for prompt:', prompt.substring(0, 100) + '...');
    console.log('Using endpoint:', apiUrl);

    const systemPrompt = `You are an expert HR professional and job description writer. Create a compelling, professional job vacancy based on the user's requirements. 

Structure the vacancy with these sections:
1. Job Title (extract or infer from the prompt)
2. About the Role (engaging overview)
3. Key Responsibilities (bullet points)
4. Requirements (bullet points)
5. What We Offer (benefits and perks)
6. Call to action

Make it engaging, professional, and tailored to the specific role described. Use markdown formatting for headers and lists.`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': azureApiKey,
      },
      body: JSON.stringify({
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
        max_tokens: 1500,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI API error:', response.status, errorText);
      
      let errorMessage = `Azure OpenAI API error: ${response.status}`;
      if (response.status === 404) {
        errorMessage += ' - Check your endpoint URL and deployment name. The resource was not found.';
      } else if (response.status === 401) {
        errorMessage += ' - Invalid API key or unauthorized access.';
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected response format from Azure OpenAI:', data);
      return new Response(
        JSON.stringify({ error: 'Invalid response from Azure OpenAI' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const generatedVacancy = data.choices[0].message.content;
    
    console.log('Successfully generated vacancy with Azure OpenAI');

    return new Response(
      JSON.stringify({ generatedVacancy }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-vacancy function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
