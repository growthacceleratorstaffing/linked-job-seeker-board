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

    // First, add the candidate to the General audience (optional, don't fail if this fails)
    try {
      console.log(`Adding candidate ${candidateEmail} to General audience...`);
      
      const audienceId = Deno.env.get("RESEND_AUDIENCE_ID");
      if (audienceId) {
        const audienceResponse = await resend.contacts.create({
          email: candidateEmail,
          firstName: candidateName.split(' ')[0],
          lastName: candidateName.split(' ').slice(1).join(' ') || '',
          audienceId: audienceId
        });
        
        console.log("Contact added to audience:", audienceResponse);
      }
    } catch (audienceError: any) {
      // If contact already exists, that's fine - continue with sending email
      if (audienceError.message?.includes('already exists') || audienceError.message?.includes('duplicate')) {
        console.log(`Contact ${candidateEmail} already exists in audience, proceeding with email send`);
      } else {
        console.warn("Warning: Could not add contact to audience:", audienceError.message);
        // Don't throw here - we still want to try sending the email
      }
    }

    // Create a simple HTML email template
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to the team</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <p>Hi ${candidateName}!</p>
        
        <p>Welcome to the team!</p>
        
        <p>To finish your onboarding, please create an account at Growth Accelerator Contracting, where you can view your contracts, fill in your hours and see your payslips, among other things.</p>
        
        <p><strong>Sign-up URL:</strong> <a href="https://www.contractdossier.nl" style="color: #1e40af;">https://www.contractdossier.nl</a></p>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>
        Bart Wetselaar</p>
        
      </body>
      </html>
    `;

    // Send the onboarding email
    console.log("Attempting to send email via Resend...");
    const emailResponse = await resend.emails.send({
      from: "Growth Accelerator Staffing <onboarding@resend.dev>",
      to: [candidateEmail],
      subject: "Welcome to the team!",
      html: emailHTML,
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