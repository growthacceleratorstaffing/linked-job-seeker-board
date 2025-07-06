
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

    console.log('Sending message to AI:', message.substring(0, 100) + '...');

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

    const requestBody = {
      messages: messages,
      temperature: 0.7,
      max_tokens: 800,
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
      requestBody.model = 'gpt-4o-mini';
      console.log('Using OpenAI API');
    } else {
      // Use Azure OpenAI
      azureEndpoint = azureEndpoint.replace(/\/$/, '');
      apiUrl = `${azureEndpoint}/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview`;
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
      console.error('AI API error:', response.status, errorText);
      
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

    const aiResponse = data.choices[0].message.content;
    
    console.log('Successfully received response from AI');

    return new Response(
      JSON.stringify({ response: aiResponse }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in myowncopilot-chat function:', error);
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
