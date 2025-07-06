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
    const { message, conversationHistory } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a string' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');

    if (!azureApiKey || !azureEndpoint) {
      return new Response(
        JSON.stringify({ error: 'Azure OpenAI configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Sending message to Azure OpenAI:', message.substring(0, 100) + '...');

    // Format conversation history for Azure OpenAI
    const messages = [
      {
        role: 'system',
        content: `You are an expert HR recruitment assistant specializing in job creation, hiring processes, and talent acquisition. You help users:

1. Create compelling job vacancies and descriptions
2. Improve existing job postings
3. Suggest interview questions for specific roles
4. Provide hiring best practices and insights
5. Offer advice on candidate evaluation
6. Help with recruitment strategy

Be conversational, helpful, and professional. Keep responses concise and to the point - aim for 2-3 short paragraphs maximum. When creating job vacancies, use a clear structure with sections like job title, about the role, key responsibilities, requirements, and what the company offers. Focus on being helpful rather than overly detailed.`
      }
    ];

    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory);
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message
    });

    const response = await fetch(`${azureEndpoint}/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': azureApiKey,
      },
      body: JSON.stringify({
        messages: messages,
        temperature: 0.7,
        max_tokens: 800,
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
    const aiResponse = data.choices[0].message.content;
    
    console.log('Successfully received response from Azure OpenAI');

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in myowncopilot-chat function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});