GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
CREATE POLICY "Staff can create jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (NOT public.is_employee(auth.uid()));
CREATE POLICY "Staff can update jobs" ON public.jobs FOR UPDATE TO authenticated USING (NOT public.is_employee(auth.uid()));
CREATE POLICY "Staff can delete jobs" ON public.jobs FOR DELETE TO authenticated USING (NOT public.is_employee(auth.uid()));
CREATE POLICY "Staff can view jobs" ON public.jobs FOR SELECT TO authenticated USING (NOT public.is_employee(auth.uid()));
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS approved_at timestamptz;