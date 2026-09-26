DROP POLICY IF EXISTS "View own or staff views all" ON public.time_entries;
CREATE POLICY "Employees view own and staff view all time entries"
ON public.time_entries
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Update own or staff" ON public.time_entries;
CREATE POLICY "Employees update own and staff update all time entries"
ON public.time_entries
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Delete own or staff" ON public.time_entries;
CREATE POLICY "Employees delete own and staff delete all time entries"
ON public.time_entries
FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff manage onboarding progress" ON public.onboarding_progress;
CREATE POLICY "Verified staff manage onboarding progress"
ON public.onboarding_progress
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Allow all access to email_campaigns" ON public.email_campaigns;
CREATE POLICY "Verified staff manage email campaigns"
ON public.email_campaigns
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

GRANT ALL ON public.email_campaigns TO service_role;
REVOKE ALL ON public.email_campaigns FROM anon;