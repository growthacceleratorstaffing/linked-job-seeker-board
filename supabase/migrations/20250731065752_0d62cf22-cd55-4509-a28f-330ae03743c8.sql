-- Create linkedin_leads table if it doesn't exist (already exists from schema)
-- This table is already created, just adding any missing columns

-- Update linkedin_user_tokens table to ensure all columns exist (already exists)
-- This table is already created and properly configured

-- The following tables already exist based on the schema, but we'll ensure they have proper constraints
-- linkedin_ad_accounts, linkedin_campaigns, linkedin_creatives, linkedin_user_tokens

-- Add any missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_linkedin_campaigns_user_id ON public.linkedin_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_campaigns_status ON public.linkedin_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_ad_accounts_user_id ON public.linkedin_ad_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_creatives_created_by ON public.linkedin_creatives(created_by);
CREATE INDEX IF NOT EXISTS idx_linkedin_creatives_account_id ON public.linkedin_creatives(account_id);

-- Ensure proper triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_linkedin_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_linkedin_campaigns_updated_at
  BEFORE UPDATE ON public.linkedin_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_linkedin_campaigns_updated_at();

CREATE OR REPLACE FUNCTION public.update_linkedin_ad_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_linkedin_ad_accounts_updated_at
  BEFORE UPDATE ON public.linkedin_ad_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_linkedin_ad_accounts_updated_at();

CREATE OR REPLACE FUNCTION public.update_linkedin_creatives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_linkedin_creatives_updated_at
  BEFORE UPDATE ON public.linkedin_creatives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_linkedin_creatives_updated_at();