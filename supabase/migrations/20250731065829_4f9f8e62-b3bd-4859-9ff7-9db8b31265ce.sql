-- Add indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_linkedin_campaigns_user_id ON public.linkedin_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_campaigns_status ON public.linkedin_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_linkedin_ad_accounts_user_id ON public.linkedin_ad_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_creatives_created_by ON public.linkedin_creatives(created_by);
CREATE INDEX IF NOT EXISTS idx_linkedin_creatives_account_id ON public.linkedin_creatives(account_id);

-- Only create triggers that don't exist yet
CREATE OR REPLACE FUNCTION public.update_linkedin_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to avoid conflicts
DROP TRIGGER IF EXISTS update_linkedin_campaigns_updated_at ON public.linkedin_campaigns;
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

-- Drop and recreate trigger to avoid conflicts
DROP TRIGGER IF EXISTS update_linkedin_ad_accounts_updated_at ON public.linkedin_ad_accounts;
CREATE TRIGGER update_linkedin_ad_accounts_updated_at
  BEFORE UPDATE ON public.linkedin_ad_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_linkedin_ad_accounts_updated_at();