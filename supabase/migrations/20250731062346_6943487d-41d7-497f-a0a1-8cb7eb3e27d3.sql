-- Create LinkedIn integration tables
CREATE TABLE public.linkedin_user_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE public.linkedin_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  linkedin_lead_id TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  form_name TEXT,
  linkedin_campaign_id TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  lead_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, linkedin_lead_id)
);

CREATE TABLE public.linkedin_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  linkedin_campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  campaign_type TEXT,
  objective_type TEXT,
  budget_amount NUMERIC,
  budget_currency TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, linkedin_campaign_id)
);

CREATE TABLE public.linkedin_ad_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  linkedin_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT,
  status TEXT,
  currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, linkedin_account_id)
);

-- Enable Row Level Security
ALTER TABLE public.linkedin_user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_ad_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own LinkedIn tokens" 
ON public.linkedin_user_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own LinkedIn tokens" 
ON public.linkedin_user_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own LinkedIn tokens" 
ON public.linkedin_user_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own LinkedIn tokens" 
ON public.linkedin_user_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own LinkedIn leads" 
ON public.linkedin_leads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own LinkedIn leads" 
ON public.linkedin_leads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own LinkedIn leads" 
ON public.linkedin_leads 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own LinkedIn leads" 
ON public.linkedin_leads 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own LinkedIn campaigns" 
ON public.linkedin_campaigns 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own LinkedIn campaigns" 
ON public.linkedin_campaigns 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own LinkedIn campaigns" 
ON public.linkedin_campaigns 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own LinkedIn campaigns" 
ON public.linkedin_campaigns 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own LinkedIn ad accounts" 
ON public.linkedin_ad_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own LinkedIn ad accounts" 
ON public.linkedin_ad_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own LinkedIn ad accounts" 
ON public.linkedin_ad_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own LinkedIn ad accounts" 
ON public.linkedin_ad_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create update triggers
CREATE TRIGGER update_linkedin_user_tokens_updated_at
  BEFORE UPDATE ON public.linkedin_user_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_linkedin_leads_updated_at
  BEFORE UPDATE ON public.linkedin_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_linkedin_campaigns_updated_at
  BEFORE UPDATE ON public.linkedin_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_linkedin_ad_accounts_updated_at
  BEFORE UPDATE ON public.linkedin_ad_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();