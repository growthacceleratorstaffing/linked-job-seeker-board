-- Check the current state of the bartwetselaar.books@gmail.com user
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token IS NOT NULL as has_confirmation_token
FROM auth.users 
WHERE email = 'bartwetselaar.books@gmail.com';

-- Update the password and confirm the email for this specific user
UPDATE auth.users 
SET 
    encrypted_password = crypt('Password123!', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    confirmation_token = null,
    email_change_token_new = null,
    email_change_token_current = null,
    updated_at = now()
WHERE email = 'bartwetselaar.books@gmail.com';