-- Create function to validate JobAdder email
CREATE OR REPLACE FUNCTION public.validate_jobadder_email(email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;