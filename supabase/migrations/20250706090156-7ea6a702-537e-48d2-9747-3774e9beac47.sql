-- Create Workable authentication functions

-- Create function to validate Workable emails by checking if they exist as members
CREATE OR REPLACE FUNCTION public.validate_workable_email(email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    workable_user_exists boolean := false;
    is_admin_email boolean := false;
BEGIN
    -- Check if this is the admin email (you)
    IF email_to_check = 'bart@growthaccelerator.nl' THEN
        is_admin_email := true;
    END IF;
    
    -- Check if email exists in workable_users table (for existing Workable employees)
    SELECT EXISTS (
        SELECT 1 FROM public.workable_users 
        WHERE workable_email = email_to_check
    ) INTO workable_user_exists;
    
    -- Allow signup if it's admin email OR if email exists in Workable
    RETURN is_admin_email OR workable_user_exists;
END;
$$;

-- Create function to check if user has specific Workable access permissions
CREATE OR REPLACE FUNCTION public.has_workable_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    CASE 
      WHEN _permission = 'admin' THEN 
        EXISTS (
          SELECT 1 FROM workable_users 
          WHERE user_id = _user_id AND workable_role = 'admin'
        )
      WHEN _permission = 'simple' THEN 
        EXISTS (
          SELECT 1 FROM workable_users 
          WHERE user_id = _user_id AND workable_role IN ('admin', 'simple')
        )
      WHEN _permission = 'reviewer' THEN 
        EXISTS (
          SELECT 1 FROM workable_users 
          WHERE user_id = _user_id AND workable_role IN ('admin', 'simple', 'reviewer')
        )
      WHEN _permission = 'candidates' THEN 
        EXISTS (
          SELECT 1 FROM workable_users 
          WHERE user_id = _user_id AND workable_role IN ('admin', 'simple')
        )
      WHEN _permission = 'jobs' THEN 
        EXISTS (
          SELECT 1 FROM workable_users 
          WHERE user_id = _user_id AND workable_role IN ('admin', 'simple', 'reviewer')
        )
      ELSE false
    END
$$;

-- Update handle_new_user function to work with Workable instead of JobAdder
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    existing_workable_user RECORD;
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
        
        -- Check if they already exist in workable_users, if not add them as admin
        IF NOT EXISTS (SELECT 1 FROM public.workable_users WHERE workable_email = new.email) THEN
            INSERT INTO public.workable_users (user_id, workable_email, workable_user_id, workable_role)
            VALUES (new.id, new.email, new.id::text, 'admin');
        ELSE
            -- Update existing workable_users record
            UPDATE public.workable_users 
            SET user_id = new.id, workable_role = 'admin'
            WHERE workable_email = new.email;
        END IF;
    ELSE
        -- Regular user - link to existing Workable profile
        SELECT * INTO existing_workable_user 
        FROM public.workable_users 
        WHERE workable_email = new.email;
        
        IF FOUND THEN
            -- Assign user role based on their Workable role
            INSERT INTO public.user_roles (user_id, role)
            VALUES (new.id, 
              CASE 
                WHEN existing_workable_user.workable_role = 'admin' THEN 'admin'
                WHEN existing_workable_user.workable_role IN ('simple', 'hris_admin') THEN 'moderator'
                ELSE 'user'
              END
            );
            
            -- Update the existing Workable user record
            UPDATE public.workable_users 
            SET user_id = new.id
            WHERE workable_email = new.email;
        ELSE
            -- This shouldn't happen if validation is working
            RAISE EXCEPTION 'Email % not found in Workable users', new.email;
        END IF;
    END IF;
    
    RETURN new;
END;
$$;