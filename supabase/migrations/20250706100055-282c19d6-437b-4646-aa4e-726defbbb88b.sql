-- Fix infinite recursion in workable_users RLS policies by creating a security definer function
CREATE OR REPLACE FUNCTION public.has_workable_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workable_users 
    WHERE user_id = _user_id AND workable_role = 'admin'
  )
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all workable data" ON public.workable_users;
DROP POLICY IF EXISTS "Admins can view all workable data" ON public.workable_users;
DROP POLICY IF EXISTS "Users can view their own workable data" ON public.workable_users;

-- Create new policies using the security definer function
CREATE POLICY "Admins can manage all workable data" 
ON public.workable_users 
FOR ALL 
USING (has_workable_admin_role(auth.uid()));

CREATE POLICY "Users can view their own workable data" 
ON public.workable_users 
FOR SELECT 
USING (auth.uid() = user_id OR has_workable_admin_role(auth.uid()));