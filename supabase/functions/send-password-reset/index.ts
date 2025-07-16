import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Generate password reset link using Supabase admin
    console.log("🔗 Generating password reset link...");
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
    console.log("✅ Reset link generated successfully");

    // Send email using Resend
    console.log("📤 Sending password reset email...");
    const emailResponse = await resend.emails.send({
      from: "Growth Accelerator <noreply@resend.dev>",
      to: [email],
      subject: "Reset Your Password - Growth Accelerator",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .card { background: white; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .logo { text-align: center; margin-bottom: 30px; }
            .heading { color: #1e293b; font-size: 24px; font-weight: bold; margin-bottom: 16px; text-align: center; }
            .text { color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
            .button { display: inline-block; background: linear-gradient(135deg, #8b5cf6, #3b82f6); color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; text-align: center; margin: 20px 0; }
            .footer { color: #94a3b8; font-size: 14px; margin-top: 40px; text-align: center; }
            .link { color: #3b82f6; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="logo">
                <h2 style="color: #3b82f6; margin: 0;">Growth Accelerator</h2>
              </div>
              
              <h1 class="heading">Reset Your Password</h1>
              
              <p class="text">
                We received a request to reset your password for your Growth Accelerator account. 
                Click the button below to set a new password:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" class="button">Reset My Password</a>
              </div>
              
              <p class="text">
                This link will expire in 1 hour for security reasons. If you didn't request this password reset, 
                you can safely ignore this email.
              </p>
              
              <p class="text">
                If the button doesn't work, you can copy and paste this link into your browser:
                <br><a href="${resetLink}" class="link">${resetLink}</a>
              </p>
              
              <div class="footer">
                <p>© 2024 Growth Accelerator. All rights reserved.</p>
                <p>If you have any questions, please contact our support team.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("✅ Password reset email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset email sent successfully",
        emailId: emailResponse.data?.id 
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