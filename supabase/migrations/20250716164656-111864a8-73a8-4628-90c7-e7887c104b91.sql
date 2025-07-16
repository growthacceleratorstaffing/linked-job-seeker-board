-- Fix the recovery_token NULL issue that's causing "Database error querying schema"
UPDATE auth.users 
SET recovery_token = COALESCE(recovery_token, '')
WHERE recovery_token IS NULL;

-- Also ensure all other auth token fields are properly handled
UPDATE auth.users 
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change_token = COALESCE(phone_change_token, '')
WHERE 
    confirmation_token IS NULL OR 
    email_change_token_new IS NULL OR 
    email_change_token_current IS NULL OR 
    phone_change_token IS NULL OR
    recovery_token IS NULL;