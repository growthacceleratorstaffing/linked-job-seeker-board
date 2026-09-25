REVOKE EXECUTE ON FUNCTION public.is_employee(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_employee(uuid) TO authenticated;