-- Check if there are any issues with the bartwetselaar.books@gmail.com user record
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    aud,
    role
FROM auth.users 
WHERE email = 'bartwetselaar.books@gmail.com';

-- Also check if there are any duplicate or corrupted entries
SELECT count(*) as user_count FROM auth.users WHERE email = 'bartwetselaar.books@gmail.com';