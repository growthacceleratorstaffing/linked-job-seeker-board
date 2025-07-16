-- Fix the email_change column NULL values causing authentication failures
UPDATE auth.users 
SET email_change = COALESCE(email_change, '')
WHERE email_change IS NULL;

-- Also fix any other potential NULL string columns that could cause scan errors
UPDATE auth.users 
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    phone_change = COALESCE(phone_change, ''),
    email_change = COALESCE(email_change, '')
WHERE 
    confirmation_token IS NULL OR 
    recovery_token IS NULL OR 
    email_change_token_new IS NULL OR 
    email_change_token_current IS NULL OR 
    phone_change_token IS NULL OR 
    reauthentication_token IS NULL OR 
    phone_change IS NULL OR 
    email_change IS NULL;