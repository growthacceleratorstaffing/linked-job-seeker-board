-- Add admin role for bart@startupaccelerator.nl and update admin email recognition
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role
FROM profiles p 
WHERE p.email = 'bart@startupaccelerator.nl'
AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p.id);

-- Update handle_new_user function to recognize both admin emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    
    -- Automatically confirm users validated through Workable
    UPDATE auth.users 
    SET email_confirmed_at = now()
    WHERE id = new.id AND email_confirmed_at IS NULL;
    
    -- Check if this is an admin email (multiple admin emails supported)
    IF new.email IN ('bart@growthaccelerator.nl', 'bart@startupaccelerator.nl') 
       OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
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
                WHEN existing_workable_user.workable_role IN ('simple', 'hiring_manager', 'recruiter', 'hris_admin') THEN 'moderator'
                ELSE 'user'
              END
            );
            
            -- Update the existing Workable user record with the auth user ID
            UPDATE public.workable_users 
            SET user_id = new.id
            WHERE workable_email = new.email;
            
            -- Log successful automatic sync
            INSERT INTO public.integration_sync_logs (
                integration_type,
                sync_type,
                status,
                synced_data
            ) VALUES (
                'workable',
                'auto_sync_on_signup',
                'success',
                jsonb_build_object(
                    'trigger', 'new_user_signup', 
                    'user_email', new.email,
                    'user_id', new.id,
                    'workable_role', existing_workable_user.workable_role,
                    'assigned_jobs', existing_workable_user.assigned_jobs,
                    'timestamp', now()
                )
            );
        ELSE
            -- User not found in Workable, trigger background sync
            INSERT INTO public.integration_sync_logs (
                integration_type,
                sync_type,
                status,
                synced_data
            ) VALUES (
                'workable',
                'auto_sync_new_user',
                'pending',
                jsonb_build_object(
                    'trigger', 'new_user_signup', 
                    'user_email', new.email,
                    'user_id', new.id,
                    'timestamp', now()
                )
            );
            
            -- Default to user role for now, will be updated after background sync
            INSERT INTO public.user_roles (user_id, role)
            VALUES (new.id, 'user');
        END IF;
    END IF;
    
    RETURN new;
END;
$$;