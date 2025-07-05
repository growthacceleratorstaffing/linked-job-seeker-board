-- Create jobadder_users table similar to workable_users
CREATE TABLE public.jobadder_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jobadder_user_id TEXT NOT NULL UNIQUE,
  jobadder_email TEXT NOT NULL UNIQUE,
  jobadder_role jobadder_scope NOT NULL DEFAULT 'read',
  permissions JSONB DEFAULT '{}',
  assigned_jobs TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jobadder_users ENABLE ROW LEVEL SECURITY;

-- Create policies for jobadder_users
CREATE POLICY "Users can view their own JobAdder data" 
ON public.jobadder_users 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all JobAdder data" 
ON public.jobadder_users 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM jobadder_users ju 
  WHERE ju.user_id = auth.uid() 
  AND ju.jobadder_role = ANY(ARRAY['write'::jobadder_scope, 'read'::jobadder_scope])
));

CREATE POLICY "Admins can manage all JobAdder data" 
ON public.jobadder_users 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM jobadder_users ju 
  WHERE ju.user_id = auth.uid() 
  AND ju.jobadder_role = 'write'::jobadder_scope
));

-- Create function to validate JobAdder email
CREATE OR REPLACE FUNCTION public.validate_jobadder_email(email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    jobadder_user_exists boolean := false;
    is_admin_email boolean := false;
BEGIN
    -- Check if this is the admin email
    IF email_to_check = 'bart@growthaccelerator.nl' THEN
        is_admin_email := true;
    END IF;
    
    -- Check if email exists in jobadder_users table
    SELECT EXISTS (
        SELECT 1 FROM public.jobadder_users 
        WHERE jobadder_email = email_to_check
    ) INTO jobadder_user_exists;
    
    -- Allow signup if it's admin email OR if email exists in JobAdder
    RETURN is_admin_email OR jobadder_user_exists;
END;
$function$

-- Update the handle_new_user function to work with JobAdder
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    existing_jobadder_user RECORD;
BEGIN
    -- Insert into profiles table
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', new.email)
    );
    
    -- Check if this is the admin
    IF new.email = 'bart@growthaccelerator.nl' OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
        -- Make them admin
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new.id, 'admin');
        
        -- Check if they already exist in jobadder_users, if not add them as admin
        IF NOT EXISTS (SELECT 1 FROM public.jobadder_users WHERE jobadder_email = new.email) THEN
            INSERT INTO public.jobadder_users (user_id, jobadder_email, jobadder_user_id, jobadder_role)
            VALUES (new.id, new.email, new.id::text, 'write');
        ELSE
            -- Update existing jobadder_users record
            UPDATE public.jobadder_users 
            SET user_id = new.id, jobadder_role = 'write'
            WHERE jobadder_email = new.email;
        END IF;
    ELSE
        -- Regular user - link to existing JobAdder profile
        SELECT * INTO existing_jobadder_user 
        FROM public.jobadder_users 
        WHERE jobadder_email = new.email;
        
        IF FOUND THEN
            -- Assign regular user role
            INSERT INTO public.user_roles (user_id, role)
            VALUES (new.id, 'user');
            
            -- Update the existing JobAdder user record
            UPDATE public.jobadder_users 
            SET user_id = new.id
            WHERE jobadder_email = new.email;
        ELSE
            -- This shouldn't happen if validation is working
            RAISE EXCEPTION 'Email % not found in JobAdder users', new.email;
        END IF;
    END IF;
    
    RETURN new;
END;
$function$