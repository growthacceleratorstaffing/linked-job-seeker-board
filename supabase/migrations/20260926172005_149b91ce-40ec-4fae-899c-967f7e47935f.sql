CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workable_users WHERE user_id = _user_id
  ) OR public.has_role(_user_id, 'admin'::public.app_role)
$$;

REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Service can insert audit logs" ON public.security_audit_logs;
CREATE POLICY "Users can insert their own audit logs"
ON public.security_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage integration logs" ON public.integration_sync_logs;
CREATE POLICY "Service role can manage integration logs"
ON public.integration_sync_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Employees view own record" ON public.employees;
CREATE POLICY "Employees and staff view permitted records"
ON public.employees
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Employees update own record" ON public.employees;
CREATE POLICY "Employees and staff update permitted records"
ON public.employees
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.is_staff(auth.uid()))
WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff manage employees" ON public.employees;
CREATE POLICY "Verified staff delete employees"
ON public.employees
FOR DELETE
TO authenticated
USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can create jobs" ON public.jobs;
CREATE POLICY "Verified staff can create jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can view jobs" ON public.jobs;
CREATE POLICY "Verified staff can view jobs"
ON public.jobs
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can update jobs" ON public.jobs;
CREATE POLICY "Verified staff can update jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can delete jobs" ON public.jobs;
CREATE POLICY "Verified staff can delete jobs"
ON public.jobs
FOR DELETE
TO authenticated
USING (public.is_staff(auth.uid()));