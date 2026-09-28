
-- Placements: commercials, hiring manager, employee link + lock down RLS
ALTER TABLE public.local_placements
  ADD COLUMN IF NOT EXISTS buy_rate numeric,
  ADD COLUMN IF NOT EXISTS sell_rate numeric,
  ADD COLUMN IF NOT EXISTS project text,
  ADD COLUMN IF NOT EXISTS hiring_manager_name text,
  ADD COLUMN IF NOT EXISTS hiring_manager_email text,
  ADD COLUMN IF NOT EXISTS employee_user_id uuid,
  ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 21,
  ADD COLUMN IF NOT EXISTS freelancer_company text,
  ADD COLUMN IF NOT EXISTS freelancer_vat_number text,
  ADD COLUMN IF NOT EXISTS freelancer_kvk text,
  ADD COLUMN IF NOT EXISTS freelancer_iban text;

DROP POLICY IF EXISTS "Authenticated users can delete local placements" ON public.local_placements;
DROP POLICY IF EXISTS "Authenticated users can update local placements" ON public.local_placements;
DROP POLICY IF EXISTS "Authenticated users can view all local placements" ON public.local_placements;
DROP POLICY IF EXISTS "Authenticated users can create local placements" ON public.local_placements;

CREATE POLICY "Staff manage placements" ON public.local_placements FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Employees view own placement" ON public.local_placements FOR SELECT TO authenticated
  USING (employee_user_id = auth.uid());

-- Candidate availability
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS available_from date,
  ADD COLUMN IF NOT EXISTS target_rate numeric,
  ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'available';

-- Timesheets
CREATE TABLE public.timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  placement_id uuid REFERENCES public.local_placements(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_hours numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  attachment_path text,
  approver_name text,
  approver_email text,
  approval_token_hash text,
  approval_token_expires_at timestamptz,
  requested_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  decision_note text,
  backoffice_push_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timesheets TO authenticated;
GRANT ALL ON public.timesheets TO service_role;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own timesheets read" ON public.timesheets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Own timesheets insert" ON public.timesheets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'draft');
CREATE POLICY "Own draft timesheets update" ON public.timesheets FOR UPDATE TO authenticated
  USING ((user_id = auth.uid() AND status IN ('draft','rejected')) OR public.is_staff(auth.uid()))
  WITH CHECK ((user_id = auth.uid() AND status IN ('draft','rejected')) OR public.is_staff(auth.uid()));
CREATE POLICY "Own draft timesheets delete" ON public.timesheets FOR DELETE TO authenticated
  USING ((user_id = auth.uid() AND status = 'draft') OR public.is_staff(auth.uid()));
CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS timesheet_id uuid REFERENCES public.timesheets(id) ON DELETE SET NULL;

-- Invoices
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1001;
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE DEFAULT ('SB-' || to_char(now(),'YYYY') || '-' || nextval('public.invoice_number_seq')::text),
  timesheet_id uuid REFERENCES public.timesheets(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  placement_id uuid REFERENCES public.local_placements(id) ON DELETE SET NULL,
  hours numeric NOT NULL,
  rate numeric NOT NULL,
  subtotal numeric NOT NULL,
  vat_rate numeric NOT NULL,
  vat_amount numeric NOT NULL,
  total numeric NOT NULL,
  pdf_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT USAGE ON SEQUENCE public.invoice_number_seq TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or staff invoices read" ON public.invoices FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

-- Storage policies (buckets created separately)
CREATE POLICY "Timesheet files own folder" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'timesheets' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())))
  WITH CHECK (bucket_id = 'timesheets' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));
CREATE POLICY "Invoice files read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoices' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));
