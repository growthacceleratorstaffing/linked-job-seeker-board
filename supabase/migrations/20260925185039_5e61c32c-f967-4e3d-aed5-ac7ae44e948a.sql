CREATE TABLE public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL UNIQUE,
  candidate_name text NOT NULL,
  candidate_email text NOT NULL,
  job_title text,
  welcome_email_at timestamptz,
  account_created_at timestamptz,
  contract_signed_at timestamptz,
  team_intro_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_progress TO authenticated;
GRANT ALL ON public.onboarding_progress TO service_role;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage onboarding progress" ON public.onboarding_progress
  FOR ALL TO authenticated USING (NOT public.is_employee(auth.uid())) WITH CHECK (NOT public.is_employee(auth.uid()));
CREATE TRIGGER update_onboarding_progress_updated_at BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS submitted_at timestamptz;