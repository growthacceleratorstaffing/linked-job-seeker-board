-- Create a simplified handle_new_user function that won't cause schema errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    profile_exists BOOLEAN := FALSE;
BEGIN
    -- Check if profile already exists to avoid conflicts
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
    
    IF NOT profile_exists THEN
        -- Insert into profiles table with basic error handling
        BEGIN
            INSERT INTO public.profiles (id, email, full_name)
            VALUES (
                NEW.id,
                NEW.email,
                COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
            );
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail the auth process
            RAISE WARNING 'Failed to create profile for user %: %', NEW.email, SQLERRM;
        END;
    END IF;
    
    -- Check if this is an admin email
    IF NEW.email IN ('bart@growthaccelerator.nl', 'bartwetselaar.books@gmail.com') THEN
        -- Make them admin if no admin role exists yet
        BEGIN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, 'admin')
            ON CONFLICT (user_id, role) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to assign admin role for user %: %', NEW.email, SQLERRM;
        END;
    ELSE
        -- Default to user role
        BEGIN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, 'user')
            ON CONFLICT (user_id, role) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Failed to assign user role for user %: %', NEW.email, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Drop existing trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();