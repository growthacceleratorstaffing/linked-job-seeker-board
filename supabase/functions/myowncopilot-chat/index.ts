
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
    let azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');

    console.log('Azure OpenAI Environment check:', {
      hasApiKey: !!azureApiKey,
      hasEndpoint: !!azureEndpoint,
      endpointValue: azureEndpoint,
      apiKeyLength: azureApiKey ? azureApiKey.length : 0
    });

    if (!azureApiKey || !azureEndpoint) {
      return new Response(
        JSON.stringify({ error: 'Azure OpenAI configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Clean up the endpoint URL to avoid double slashes
    azureEndpoint = azureEndpoint.replace(/\/$/, '');

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

Be conversational, helpful, and professional. When creating job vacancies, use a clear structure with sections like job title, about the role, key responsibilities, requirements, and what the company offers. Keep responses concise but informative.`
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

    // Use your specific deployment name and API version
    const apiUrl = `${azureEndpoint}/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview`;
    console.log('Using Azure OpenAI URL:', apiUrl);

    const requestBody = {
      messages: messages,
      temperature: 0.7,
      max_tokens: 1500,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
      stream: false
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': azureApiKey,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure OpenAI API error:', response.status, errorText);
      
      // Try to parse error as JSON for better debugging
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed error:', errorJson);
      } catch (e) {
        console.error('Error text is not JSON:', errorText);
      }
      
      return new Response(
        JSON.stringify({ error: `Azure OpenAI API error: ${response.status} - ${errorText}` }),
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
        JSON.stringify({ error: 'Invalid JSON response from Azure OpenAI' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('Parsed response data:', JSON.stringify(data, null, 2));

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected response format from Azure OpenAI:', data);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from Azure OpenAI' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const aiResponse = data.choices[0].message.content;
    
    console.log('Successfully received response from Azure OpenAI');

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in azure-openai-chat function:', error);
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
