-- Fix the incomplete user record for bartwetselaar.books@gmail.com
-- Create the missing profile record
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
    'db40694e-4dab-4c1b-a263-61efe39a8417',
    'bartwetselaar.books@gmail.com',
    'Bart Wetselaar',
    'admin'
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- Create the missing user role record
INSERT INTO public.user_roles (user_id, role)
VALUES (
    'db40694e-4dab-4c1b-a263-61efe39a8417',
    'admin'
) ON CONFLICT (user_id, role) DO NOTHING;

-- Create the missing workable_users record for the admin with a proper workable_user_id
INSERT INTO public.workable_users (user_id, workable_user_id, workable_email, workable_role)
VALUES (
    'db40694e-4dab-4c1b-a263-61efe39a8417',
    'admin-' || 'db40694e-4dab-4c1b-a263-61efe39a8417',
    'bartwetselaar.books@gmail.com',
    'admin'
) ON CONFLICT (workable_email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    workable_user_id = EXCLUDED.workable_user_id,
    workable_role = EXCLUDED.workable_role;

-- Also fix the confirmation_token issue by updating the auth.users record
UPDATE auth.users 
SET confirmation_token = COALESCE(confirmation_token, '')
WHERE id = 'db40694e-4dab-4c1b-a263-61efe39a8417';