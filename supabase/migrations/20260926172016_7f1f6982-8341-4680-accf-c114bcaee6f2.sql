CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workable_users WHERE user_id = _user_id
  ) OR public.has_role(_user_id, 'admin'::public.app_role)
$$;