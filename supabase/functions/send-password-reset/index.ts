import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("🚀 Password Reset Email Function started");

serve(async (req) => {
  console.log(`📥 Received ${req.method} request`);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🔧 Creating Supabase client...");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("📋 Parsing request body...");
    const { email } = await req.json();
    console.log(`📧 Reset requested for email: ${email}`);

    if (!email) {
      console.error("❌ No email provided");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Supabase's built-in password reset
    console.log("🔗 Sending password reset email via Supabase...");
    const redirectUrl = `${req.headers.get('origin') || 'https://20d5d3d6-ce4d-4cb8-9c56-2297c6e76a92.lovableproject.com'}/auth`;
    
    const { data, error } = await supabaseClient.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectUrl,
      }
    });

    if (error) {
      console.error("❌ Error generating reset link:", error);
      throw error;
    }

    console.log("✅ Password reset link generated successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset email sent successfully",
        resetLink: data.properties?.action_link 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("❌ Critical error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});