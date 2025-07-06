-- Update validate_workable_email function to only check admin email as fallback
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
    -- Check if this is the main admin email (fallback)
    IF email_to_check = 'bart@growthaccelerator.nl' THEN
        is_admin_email := true;
    END IF;
    
    -- Check if email exists in workable_users table (populated from API)
    SELECT EXISTS (
        SELECT 1 FROM public.workable_users 
        WHERE workable_email = email_to_check
    ) INTO workable_user_exists;
    
    -- Allow signup if it's admin email OR if email exists in Workable
    RETURN is_admin_email OR workable_user_exists;
END;
$$;

-- Update handle_new_user function to properly map Workable roles
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
    
    -- Check if this is the main admin email (fallback)
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
            SET user_id = new.id
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
            
            -- Update the existing Workable user record with user_id
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