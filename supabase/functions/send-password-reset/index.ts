import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email } = await req.json();
    console.log(`📧 Password reset requested for: ${email}`);

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate password reset link using Supabase
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

    const resetLink = data.properties?.action_link;
    
    if (!resetLink) {
      throw new Error("Failed to generate reset link");
    }

    // Send password reset email using Resend
    const emailResponse = await resend.emails.send({
      from: "Workable Flow Central <onboarding@resend.dev>",
      to: [email],
      subject: "Reset your password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">Reset Your Password</h1>
          <p style="color: #666; font-size: 16px;">
            We received a request to reset your password for your Workable Flow Central account.
          </p>
          <p style="color: #666; font-size: 16px;">
            Click the button below to reset your password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetLink}">${resetLink}</a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
          </p>
          <p style="color: #666; font-size: 12px;">
            This link will expire in 24 hours for security reasons.
          </p>
        </div>
      `,
    });

    console.log("✅ Password reset email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset email sent successfully"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("❌ Error in send-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});