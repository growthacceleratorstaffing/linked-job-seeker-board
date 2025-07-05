-- Update the handle_new_user function to work with JobAdder
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;