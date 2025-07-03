import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.10';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

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
  campaignId: string;
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
      companyName,
      campaignId
    }: OnboardingEmailRequest = await req.json();

    console.log(`Sending onboarding email to: ${candidateEmail} for candidate: ${candidateName} using campaign: ${campaignId}`);

    // Fetch the email campaign template
    const { data: campaign, error: campaignError } = await supabase
      .from('email_campaigns')
      .select('name, subject, html_template')
      .eq('id', campaignId)
      .eq('is_active', true)
      .single();

    if (campaignError || !campaign) {
      console.error('Error fetching campaign:', campaignError);
      throw new Error('Email campaign not found or inactive');
    }

    // Replace template variables in the HTML
    let emailHTML = campaign.html_template
      .replace(/{{candidateName}}/g, candidateName)
      .replace(/{{companyName}}/g, companyName);
    
    if (jobTitle) {
      emailHTML = emailHTML.replace(/{{#if jobTitle}}(.*?){{\/if}}/g, '$1');
      emailHTML = emailHTML.replace(/{{jobTitle}}/g, jobTitle);
    } else {
      emailHTML = emailHTML.replace(/{{#if jobTitle}}(.*?){{\/if}}/g, '');
    }

    // First, add the candidate to the General audience
    try {
      console.log(`Adding candidate ${candidateEmail} to General audience...`);
      
      const audienceResponse = await resend.contacts.create({
        email: candidateEmail,
        firstName: candidateName.split(' ')[0],
        lastName: candidateName.split(' ').slice(1).join(' ') || '',
        audienceId: Deno.env.get("RESEND_AUDIENCE_ID")
      });
      
      console.log("Contact added to audience:", audienceResponse);
    } catch (audienceError: any) {
      // If contact already exists, that's fine - continue with sending email
      if (audienceError.message?.includes('already exists') || audienceError.message?.includes('duplicate')) {
        console.log(`Contact ${candidateEmail} already exists in audience, proceeding with email send`);
      } else {
        console.warn("Warning: Could not add contact to audience:", audienceError.message);
        // Don't throw here - we still want to try sending the email
      }
    }

    // Send the onboarding email
    const emailResponse = await resend.emails.send({
      from: "Growth Accelerator Staffing <onboarding@resend.dev>",
      to: [candidateEmail],
      subject: campaign.subject,
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