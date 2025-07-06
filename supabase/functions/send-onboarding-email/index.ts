import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OnboardingEmailRequest {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
  location?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateName, candidateEmail, jobTitle, companyName, location }: OnboardingEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Growth Accelerator <onboarding@resend.dev>",
      to: [candidateEmail],
      subject: `Great news! You've been matched with ${jobTitle} at ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">Congratulations ${candidateName}!</h1>
          
          <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1e293b; margin-top: 0;">You've been matched with a great opportunity!</h2>
            
            <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid #ec4899;">
              <h3 style="color: #ec4899; margin-top: 0;">Position Details:</h3>
              <p><strong>Job Title:</strong> ${jobTitle}</p>
              <p><strong>Company:</strong> ${companyName}</p>
              ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
            </div>
            
            <p style="margin-top: 20px;">Our team has identified you as an excellent fit for this position. We believe your skills and experience align perfectly with what they're looking for.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="mailto:bart@growthaccelerator.nl?subject=Re: ${jobTitle} Match" 
                 style="background-color: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Get in Touch
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">
              Next steps: Our recruitment team will be in touch within 24 hours to discuss this opportunity in more detail and answer any questions you may have.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
            <p>Best regards,<br>The Growth Accelerator Team</p>
            <p>This is an automated message. Please don't reply directly to this email.</p>
          </div>
        </div>
      `,
    });

    console.log("Onboarding email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-onboarding-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);