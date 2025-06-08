
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

    const copilotApiKey = Deno.env.get('MYOWNCOPILOT_API_KEY');
    const copilotUrl = Deno.env.get('MYOWNCOPILOT_URL');

    console.log('Environment check:', {
      hasApiKey: !!copilotApiKey,
      hasUrl: !!copilotUrl,
      urlValue: copilotUrl,
      apiKeyLength: copilotApiKey ? copilotApiKey.length : 0
    });

    if (!copilotApiKey || !copilotUrl) {
      return new Response(
        JSON.stringify({ error: 'MyOwnCopilot configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Sending message to MyOwnCopilot:', message.substring(0, 100) + '...');

    // Format conversation history for MyOwnCopilot
    const messages = conversationHistory || [];
    messages.push({
      role: 'user',
      content: message
    });

    // Ensure URL has proper protocol and format
    const baseUrl = copilotUrl.startsWith('http') ? copilotUrl : `https://${copilotUrl}`;
    const apiUrl = `${baseUrl}/api/chat`;

    console.log('Using MyOwnCopilot URL:', apiUrl);

    // Try different request formats to see what works
    const requestBody = {
      messages: messages,
      stream: false,
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 1500,
      system_prompt: `You are an expert HR recruitment assistant specializing in job creation, hiring processes, and talent acquisition. You help users:

1. Create compelling job vacancies and descriptions
2. Improve existing job postings
3. Suggest interview questions for specific roles
4. Provide hiring best practices and insights
5. Offer advice on candidate evaluation
6. Help with recruitment strategy

Be conversational, helpful, and professional. When creating job vacancies, use a clear structure with sections like job title, about the role, key responsibilities, requirements, and what the company offers. Keep responses concise but informative.`
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${copilotApiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MyOwnCopilot API error:', response.status, errorText);
      
      // Try to parse error as JSON for better debugging
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Parsed error:', errorJson);
      } catch (e) {
        console.error('Error text is not JSON:', errorText);
      }
      
      return new Response(
        JSON.stringify({ error: `MyOwnCopilot API error: ${response.status} - ${errorText}` }),
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
        JSON.stringify({ error: 'Invalid JSON response from MyOwnCopilot' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('Parsed response data:', JSON.stringify(data, null, 2));

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Unexpected response format from MyOwnCopilot:', data);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from MyOwnCopilot' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const aiResponse = data.choices[0].message.content;
    
    console.log('Successfully received response from MyOwnCopilot');

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
