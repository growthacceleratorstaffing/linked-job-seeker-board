import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the request body (contains user data from auth webhook)
    const body = await req.json();
    const userEmail = body?.user?.email;
    const confirmationUrl = body?.email_data?.confirmation_url;
    
    if (!userEmail) {
      throw new Error("No user email provided");
    }

    console.log("Sending confirmation email to:", userEmail);

    // Send confirmation email using Resend
    const emailResponse = await resend.emails.send({
      from: "Workable Flow Central <onboarding@resend.dev>",
      to: [userEmail],
      subject: "Confirm your email address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">Welcome to Workable Flow Central!</h1>
          <p style="color: #666; font-size: 16px;">
            Thank you for signing up. Please confirm your email address by clicking the button below:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Confirm Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${confirmationUrl}">${confirmationUrl}</a>
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Confirmation email sent" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-login-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});