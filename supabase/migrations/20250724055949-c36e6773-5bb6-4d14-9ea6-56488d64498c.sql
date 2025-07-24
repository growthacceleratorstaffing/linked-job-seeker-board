-- Remove JobAdder and JazzHR related tables, functions, and columns

-- Drop JobAdder related tables
DROP TABLE IF EXISTS public.jobadder_tokens CASCADE;
DROP TABLE IF EXISTS public.jobadder_user_permissions CASCADE;  
DROP TABLE IF EXISTS public.jobadder_users CASCADE;

-- Drop JazzHR related tables
DROP TABLE IF EXISTS public.jazzhr_oauth_users CASCADE;
DROP TABLE IF EXISTS public.jazzhr_users CASCADE;

-- Remove JobAdder columns from jobs table
ALTER TABLE public.jobs DROP COLUMN IF EXISTS synced_to_jobadder CASCADE;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS jobadder_job_id CASCADE;

-- Remove JobAdder columns from local_placements table  
ALTER TABLE public.local_placements DROP COLUMN IF EXISTS synced_to_jobadder CASCADE;
ALTER TABLE public.local_placements DROP COLUMN IF EXISTS jobadder_placement_id CASCADE;

-- Remove JobAdder columns from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS jobadder_scopes CASCADE;

-- Drop JobAdder and JazzHR related functions
DROP FUNCTION IF EXISTS public.has_jobadder_scope(uuid, jobadder_scope) CASCADE;
DROP FUNCTION IF EXISTS public.validate_jobadder_email(text) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_jobadder_tokens() CASCADE;
DROP FUNCTION IF EXISTS public.has_jazzhr_role(uuid, jazzhr_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_jazzhr_role(uuid, jazzhr_user_role) CASCADE;
DROP FUNCTION IF EXISTS public.validate_jazzhr_oauth_email(text) CASCADE;
DROP FUNCTION IF EXISTS public.validate_jazzhr_email(text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_jazzhr_oauth_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_assigned_jobs(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_can_access_job(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_jazzhr_users_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_jazzhr_oauth_users_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_jazzhr_sync() CASCADE;

-- Drop JobAdder and JazzHR related enums
DROP TYPE IF EXISTS jobadder_scope CASCADE;
DROP TYPE IF EXISTS jazzhr_role CASCADE;
DROP TYPE IF EXISTS jazzhr_user_role CASCADE;

-- Update handle_new_user function to remove JobAdder/JazzHR references
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    profile_exists BOOLEAN := FALSE;
    workable_user_record RECORD;
    is_admin_email BOOLEAN := FALSE;
BEGIN
    -- Check if profile already exists to avoid conflicts
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
    
    IF NOT profile_exists THEN
        -- Check if this is an admin email
        IF NEW.email IN ('bart@growthaccelerator.nl', 'bart@startupaccelerator.nl') THEN
            is_admin_email := TRUE;
        END IF;
        
        -- Insert into profiles table
        BEGIN
            INSERT INTO public.profiles (id, email, full_name, role)
            VALUES (
                NEW.id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
                CASE WHEN is_admin_email THEN 'admin' ELSE 'user' END
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to create profile for user %: %', NEW.email, SQLERRM;
        END;
    END IF;
    
    -- Auto-confirm the user's email
    UPDATE auth.users 
    SET email_confirmed_at = now()
    WHERE id = NEW.id AND email_confirmed_at IS NULL;
    
    -- Handle admin role assignment
    IF is_admin_email OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
        BEGIN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, 'admin')
            ON CONFLICT (user_id, role) DO NOTHING;
            
            UPDATE public.profiles SET role = 'admin' WHERE id = NEW.id;
            
            -- Create or update workable_users record for admin
            INSERT INTO public.workable_users (
                user_id, 
                workable_user_id, 
                workable_email, 
                workable_role,
                assigned_jobs
            ) VALUES (
                NEW.id, 
                'admin-' || NEW.id::text, 
                NEW.email, 
                'admin',
                ARRAY['*']
            )
            ON CONFLICT (workable_email) DO UPDATE SET
                user_id = NEW.id,
                workable_role = 'admin',
                assigned_jobs = ARRAY['*'],
                updated_at = now();
                
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to assign admin role for user %: %', NEW.email, SQLERRM;
        END;
    ELSE
        -- Check if user exists in workable_users table
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
                
                -- Create user_roles based on workable_role
                CASE workable_user_record.workable_role
                    WHEN 'admin' THEN
                        INSERT INTO public.user_roles (user_id, role)
                        VALUES (NEW.id, 'admin')
                        ON CONFLICT (user_id, role) DO NOTHING;
                        
                        UPDATE public.profiles SET role = 'admin' WHERE id = NEW.id;
                        
                    WHEN 'simple', 'hiring_manager' THEN
                        INSERT INTO public.user_roles (user_id, role)
                        VALUES (NEW.id, 'moderator')
                        ON CONFLICT (user_id, role) DO NOTHING;
                        
                        UPDATE public.profiles SET role = 'moderator' WHERE id = NEW.id;
                        
                    ELSE
                        INSERT INTO public.user_roles (user_id, role)
                        VALUES (NEW.id, 'user')
                        ON CONFLICT (user_id, role) DO NOTHING;
                END CASE;
                
                -- Log successful sync
                INSERT INTO integration_sync_logs (
                    integration_type,
                    sync_type,
                    status,
                    synced_data
                ) VALUES (
                    'workable',
                    'user_signup_sync',
                    'success',
                    jsonb_build_object(
                        'user_email', NEW.email,
                        'workable_role', workable_user_record.workable_role,
                        'sync_timestamp', now()
                    )
                );
                
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to update workable user for %: %', NEW.email, SQLERRM;
            END;
        ELSE
            -- User not found in Workable, create default user role
            BEGIN
                INSERT INTO public.user_roles (user_id, role)
                VALUES (NEW.id, 'user')
                ON CONFLICT (user_id, role) DO NOTHING;
                
                -- Log pending sync for background processing
                INSERT INTO integration_sync_logs (
                    integration_type,
                    sync_type,
                    status,
                    synced_data
                ) VALUES (
                    'workable',
                    'user_signup_sync',
                    'pending',
                    jsonb_build_object(
                        'user_email', NEW.email,
                        'sync_timestamp', now(),
                        'reason', 'user_not_found_in_workable'
                    )
                );
                
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to assign default user role for user %: %', NEW.email, SQLERRM;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;