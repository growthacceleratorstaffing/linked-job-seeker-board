CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  candidate_id uuid,
  full_name text NOT NULL,
  email text NOT NULL,
  job_title text,
  client_company text,
  hourly_rate numeric,
  start_date date,
  contract_signed_at timestamptz,
  contract_signature text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_employee(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.employees WHERE user_id = _user_id) $$;

CREATE POLICY "Employees view own record" ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR NOT public.is_employee(auth.uid()));
CREATE POLICY "Employees update own record" ON public.employees FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR NOT public.is_employee(auth.uid()));
CREATE POLICY "Staff manage employees" ON public.employees FOR DELETE TO authenticated
  USING (NOT public.is_employee(auth.uid()));

CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_date date NOT NULL,
  start_time time,
  end_time time,
  break_minutes integer NOT NULL DEFAULT 0,
  hours numeric NOT NULL DEFAULT 0,
  project text,
  description text,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own or staff views all" ON public.time_entries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR NOT public.is_employee(auth.uid()));
CREATE POLICY "Insert own hours" ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own or staff" ON public.time_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR NOT public.is_employee(auth.uid()));
CREATE POLICY "Delete own or staff" ON public.time_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR NOT public.is_employee(auth.uid()));

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();