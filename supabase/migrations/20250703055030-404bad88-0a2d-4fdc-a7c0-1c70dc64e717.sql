-- Create email_campaigns table for onboarding email templates
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  html_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for email campaigns
CREATE POLICY "Allow all access to email_campaigns" 
ON public.email_campaigns 
FOR ALL 
USING (true);

-- Insert default email campaign templates
INSERT INTO public.email_campaigns (name, subject, description, html_template) VALUES 
(
  'Standard Welcome',
  'Welcome to Growth Accelerator - Let''s Get Started!',
  'Standard onboarding email with company overview',
  '<!DOCTYPE html>
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
    <h2 style="color: #1e40af; margin-top: 0;">Hello {{candidateName}}! 👋</h2>
    <p style="font-size: 16px; margin-bottom: 15px;">
      Congratulations! We''re excited to begin the onboarding process with you at <strong>{{companyName}}</strong>.
      {{#if jobTitle}} You''ve been selected for the <strong>{{jobTitle}}</strong> position.{{/if}}
    </p>
    
    <p style="font-size: 16px;">
      Our team will be guiding you through the next steps to ensure a smooth transition into your new role.
    </p>
  </div>
  
  <div style="margin-bottom: 25px;">
    <h3 style="color: #1e40af;">What''s Next?</h3>
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
      <strong>📞 Need Help?</strong> If you have any questions, don''t hesitate to reach out to our support team.
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
</html>'
),
(
  'Quick Start Guide',
  'Your Quick Start Guide - Welcome to the Team!',
  'Streamlined onboarding focused on immediate next steps',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quick Start Guide</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #059669; font-size: 28px; margin-bottom: 10px;">Welcome Aboard, {{candidateName}}! 🚀</h1>
    <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #059669, #0ea5e9); margin: 0 auto;"></div>
  </div>
  
  <div style="background: #ecfdf5; padding: 25px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #059669;">
    <h2 style="color: #059669; margin-top: 0;">Let''s Get You Started Quickly! ⚡</h2>
    <p style="font-size: 16px;">
      Welcome to <strong>{{companyName}}</strong>! We''ve prepared a streamlined onboarding process to get you up and running fast.
    </p>
  </div>
  
  <div style="margin-bottom: 25px;">
    <h3 style="color: #059669;">Your First 48 Hours</h3>
    <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
      <strong>Day 1:</strong> Complete digital paperwork & IT setup
    </div>
    <div style="background: #f0fdf4; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
      <strong>Day 2:</strong> Team introductions & project overview
    </div>
  </div>
  
  <div style="background: #059669; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
    <h3 style="margin-top: 0;">Action Required</h3>
    <p style="margin-bottom: 15px;">Please check your email for login credentials and complete your profile setup.</p>
    <a href="mailto:onboarding@growthaccelerator.com" style="background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
      Get Started Now
    </a>
  </div>
  
</body>
</html>'
),
(
  'Formal Welcome',
  'Welcome to Growth Accelerator - Official Onboarding',
  'Professional and detailed onboarding communication',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Official Welcome</title>
</head>
<body style="font-family: Georgia, serif; line-height: 1.8; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; margin-bottom: 40px;">
    <h1 style="color: #1f2937; font-size: 30px; margin-bottom: 10px; font-weight: normal;">Growth Accelerator</h1>
    <div style="width: 100px; height: 2px; background: #1f2937; margin: 0 auto;"></div>
  </div>
  
  <div style="margin-bottom: 30px;">
    <p style="font-size: 18px; margin-bottom: 20px;">Dear {{candidateName}},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      On behalf of the entire team at <strong>{{companyName}}</strong>, I am delighted to welcome you to our organization. 
      {{#if jobTitle}}Your appointment to the position of <strong>{{jobTitle}}</strong> represents an important step in our continued growth and success.{{/if}}
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      We believe that your skills, experience, and fresh perspective will contribute significantly to our mission and objectives. 
      Our commitment is to provide you with the resources, support, and environment necessary for your professional success.
    </p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
    <h3 style="color: #1f2937; margin-top: 0; margin-bottom: 20px;">Onboarding Schedule</h3>
    <ul style="list-style: none; padding: 0;">
      <li style="margin-bottom: 12px; padding-left: 20px; position: relative;">
        <span style="position: absolute; left: 0; color: #6b7280;">•</span>
        Human Resources orientation and documentation
      </li>
      <li style="margin-bottom: 12px; padding-left: 20px; position: relative;">
        <span style="position: absolute; left: 0; color: #6b7280;">•</span>
        Department introduction and workspace assignment
      </li>
      <li style="margin-bottom: 12px; padding-left: 20px; position: relative;">
        <span style="position: absolute; left: 0; color: #6b7280;">•</span>
        Technology setup and security protocols
      </li>
      <li style="margin-bottom: 12px; padding-left: 20px; position: relative;">
        <span style="position: absolute; left: 0; color: #6b7280;">•</span>
        Initial project briefings and goal setting
      </li>
    </ul>
  </div>
  
  <div style="margin-bottom: 30px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Please do not hesitate to reach out if you have any questions or require assistance during this transition period. 
      We look forward to your contributions and to supporting your professional development within our organization.
    </p>
    
    <p style="font-size: 16px;">
      Sincerely,<br>
      <strong>The Growth Accelerator Team</strong>
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">
      Growth Accelerator Staffing Platform
    </p>
    <p style="color: #6b7280; font-size: 12px; margin: 0;">
      Confidential and proprietary information
    </p>
  </div>
  
</body>
</html>'
);