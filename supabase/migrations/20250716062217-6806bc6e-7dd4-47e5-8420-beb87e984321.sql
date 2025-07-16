-- Fix the password for the existing user and confirm their email
UPDATE auth.users 
SET 
  encrypted_password = crypt('Password123!', gen_salt('bf')),
  email_confirmed_at = now(),
  updated_at = now()
WHERE email = 'bartwetselaar.books@gmail.com';

-- Also update the email_confirm_status if it exists
UPDATE auth.users 
SET confirmation_token = null,
    email_change_token_new = null,
    email_change_token_current = null
WHERE email = 'bartwetselaar.books@gmail.com';