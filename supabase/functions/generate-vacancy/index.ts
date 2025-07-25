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

    if (!azureApiKey) {
      return new Response(
        JSON.stringify({ error: 'Azure OpenAI API key missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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

    const response = await fetch('https://aistudioaiservices773784968662.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': azureApiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `Create professional job vacancies. Use: Job Title, About Role, Key Responsibilities (3-5 bullets), Requirements (3-5 bullets), What We Offer, Call to action. Use markdown formatting. Be concise.` // Shortened system prompt
          },
          {
            role: 'user',
            content: `Create job vacancy: ${prompt}` // Shortened user prompt
          }
        ],
        temperature: 0.6, // Slightly lower for more consistent output
        max_tokens: 1000, // Reduced from 1500 to 1000 tokens
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Azure OpenAI error:', error);
      return new Response(
        JSON.stringify({ error: `Azure OpenAI error: ${response.status}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    const generatedVacancy = data.choices[0].message.content;
    
    console.log('Successfully generated vacancy');

    return new Response(
      JSON.stringify({ generatedVacancy }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in generate-vacancy function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});