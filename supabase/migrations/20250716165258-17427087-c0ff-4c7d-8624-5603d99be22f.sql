-- Fix incomplete user record for bart@growthaccelerator.nl
-- Create the missing profile record
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
    'c5198387-91d6-4480-afe0-84fac5fcc857',
    'bart@growthaccelerator.nl',
    'Bart Wetselaar',
    'admin'
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- Create the missing user role record
INSERT INTO public.user_roles (user_id, role)
VALUES (
    'c5198387-91d6-4480-afe0-84fac5fcc857',
    'admin'
) ON CONFLICT (user_id, role) DO NOTHING;

-- Create the missing workable_users record
INSERT INTO public.workable_users (user_id, workable_user_id, workable_email, workable_role)
VALUES (
    'c5198387-91d6-4480-afe0-84fac5fcc857',
    'admin-' || 'c5198387-91d6-4480-afe0-84fac5fcc857',
    'bart@growthaccelerator.nl',
    'admin'
) ON CONFLICT (workable_email) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    workable_user_id = EXCLUDED.workable_user_id,
    workable_role = EXCLUDED.workable_role;