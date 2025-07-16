-- Update the handle_new_user function to properly sync with Workable API
-- This ensures ALL new users get their correct role and permissions from Workable

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    profile_exists BOOLEAN := FALSE;
    workable_user_record RECORD;
BEGIN
    -- Check if profile already exists to avoid conflicts
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
    
    IF NOT profile_exists THEN
        -- Insert into profiles table with basic error handling
        BEGIN
            INSERT INTO public.profiles (id, email, full_name, role)
            VALUES (
                NEW.id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                'user' -- Default to user role, will be updated by Workable sync
            );
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the auth process
            RAISE WARNING 'Failed to create profile for user %: %', NEW.email, SQLERRM;
        END;
    END IF;
    
    -- Check if user exists in workable_users table (from email validation)
    SELECT * INTO workable_user_record
    FROM public.workable_users 
    WHERE workable_email = NEW.email;
    
    IF workable_user_record IS NOT NULL THEN
        -- Update workable_users with user_id
        BEGIN
            UPDATE public.workable_users
            SET user_id = NEW.id,
                updated_at = now()
            WHERE workable_email = NEW.email;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to update workable_users for user %: %', NEW.email, SQLERRM;
        END;
        
        -- Create user_roles based on workable_role
        BEGIN
            -- Map Workable role to app role
            CASE workable_user_record.workable_role
                WHEN 'admin' THEN
                    INSERT INTO public.user_roles (user_id, role)
                    VALUES (NEW.id, 'admin')
                    ON CONFLICT (user_id, role) DO NOTHING;
                    
                    -- Update profile role for admins
                    UPDATE public.profiles SET role = 'admin' WHERE id = NEW.id;
                    
                WHEN 'hiring_manager' THEN
                    INSERT INTO public.user_roles (user_id, role)
                    VALUES (NEW.id, 'moderator')
                    ON CONFLICT (user_id, role) DO NOTHING;
                    
                    -- Update profile role for hiring managers
                    UPDATE public.profiles SET role = 'moderator' WHERE id = NEW.id;
                    
                ELSE
                    -- Default to user role for simple, reviewer, etc.
                    INSERT INTO public.user_roles (user_id, role)
                    VALUES (NEW.id, 'user')
                    ON CONFLICT (user_id, role) DO NOTHING;
            END CASE;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to assign user role for user %: %', NEW.email, SQLERRM;
        END;
    ELSE
        -- User not found in Workable, create minimal record
        BEGIN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, 'user')
            ON CONFLICT (user_id, role) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to assign default user role for user %: %', NEW.email, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;