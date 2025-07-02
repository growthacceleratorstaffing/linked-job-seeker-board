import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OnboardingEmailRequest {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle?: string;
  companyName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      candidateId, 
      candidateName, 
      candidateEmail, 
      jobTitle, 
      companyName 
    }: OnboardingEmailRequest = await req.json();

    console.log(`Sending onboarding email to: ${candidateEmail} for candidate: ${candidateName}`);

    const emailResponse = await resend.emails.send({
      from: "Growth Accelerator Staffing <onboarding@resend.dev>",
      to: [candidateEmail],
      subject: `Welcome to Growth Accelerator - Let's Get Started!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Growth Accelerator</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1e40af; font-size: 28px; margin-bottom: 10px;">Welcome to Growth Accelerator!</h1>
            <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #1e40af, #ec4899); margin: 0 auto;"></div>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h2 style="color: #1e40af; margin-top: 0;">Hello ${candidateName}! 👋</h2>
            <p style="font-size: 16px; margin-bottom: 15px;">
              Congratulations! We're excited to begin the onboarding process with you at <strong>${companyName}</strong>.
              ${jobTitle ? ` You've been selected for the <strong>${jobTitle}</strong> position.` : ''}
            </p>
            
            <p style="font-size: 16px;">
              Our team will be guiding you through the next steps to ensure a smooth transition into your new role.
            </p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1e40af;">What's Next?</h3>
            <ul style="padding-left: 20px;">
              <li style="margin-bottom: 8px;">📋 Complete your employment documentation</li>
              <li style="margin-bottom: 8px;">🏢 Schedule your office tour and workspace setup</li>
              <li style="margin-bottom: 8px;">👥 Meet your team and direct supervisor</li>
              <li style="margin-bottom: 8px;">🚀 Begin your role-specific training program</li>
            </ul>
          </div>
          
          <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
            <h3 style="margin-top: 0; font-size: 18px;">Ready to Get Started?</h3>
            <p style="margin-bottom: 15px;">Our HR team will contact you within 24 hours to schedule your first meeting.</p>
            <a href="mailto:hr@growthaccelerator.com" style="background: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Contact HR Team
            </a>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
            <p style="margin: 0; color: #92400e;">
              <strong>📞 Need Help?</strong> If you have any questions, don't hesitate to reach out to our support team.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">
              This email was sent by Growth Accelerator Staffing Platform
            </p>
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              If you believe you received this email in error, please contact us immediately.
            </p>
          </div>
          
        </body>
        </html>
      `,
    });

    console.log("Onboarding email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: `Onboarding email sent successfully to ${candidateName}`,
      emailId: emailResponse.data?.id,
      candidateId: candidateId
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-onboarding-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: "Failed to send onboarding email"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);