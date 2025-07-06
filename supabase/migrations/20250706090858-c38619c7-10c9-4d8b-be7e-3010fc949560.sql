-- Update validate_workable_email function to include both admin emails
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
    -- Check if this is one of the admin emails
    IF email_to_check IN ('bart@growthaccelerator.nl', 'bartwetselaar.books@gmail.com') THEN
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