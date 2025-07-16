-- Delete the problematic user account completely and recreate it
DELETE FROM auth.users WHERE email = 'bartwetselaar.books@gmail.com';

-- Also clean up any related records
DELETE FROM public.profiles WHERE email = 'bartwetselaar.books@gmail.com';
DELETE FROM public.user_roles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'bartwetselaar.books@gmail.com'
);

-- Create a fresh user account with proper setup
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'bartwetselaar.books@gmail.com',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Bart Wetselaar"}',
    now(),
    now(),
    null,
    null,
    null,
    null
);