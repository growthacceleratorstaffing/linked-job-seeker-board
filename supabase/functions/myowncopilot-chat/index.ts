import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.10";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BodySchema = z.object({
  message: z.string().trim().min(1).max(8000),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(20000),
  })).max(100).default([]),
});

const systemPrompt = `You are the Growth Accelerator Staffing recruitment assistant. Help staff create vacancies, improve job descriptions, prepare interviews, evaluate candidates, and plan hiring processes. Be practical, professional, concise, and use clear markdown. Never claim to have changed application data or contacted a candidate unless a tool result explicitly confirms it.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return new Response(JSON.stringify({ error: 'Please sign in again.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Please sign in again.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return new Response(JSON.stringify({ error: 'The message or conversation history is invalid.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return new Response(JSON.stringify({ error: 'Claude is not configured.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const messages = [...parsed.data.conversationHistory, { role: 'user' as const, content: parsed.data.message }];
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        system: systemPrompt,
        messages,
        max_tokens: 1200,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const safeMessage = payload?.error?.message || `Claude request failed (${response.status}).`;
      return new Response(JSON.stringify({ error: safeMessage }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const text = Array.isArray(payload?.content)
      ? payload.content.filter((part: { type?: string }) => part.type === 'text').map((part: { text?: string }) => part.text || '').join('\n')
      : '';
    if (!text) return new Response(JSON.stringify({ error: 'Claude returned no response.' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    return new Response(JSON.stringify({ response: text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Claude assistant error:', error);
    return new Response(JSON.stringify({ error: 'The AI assistant could not complete this request.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});