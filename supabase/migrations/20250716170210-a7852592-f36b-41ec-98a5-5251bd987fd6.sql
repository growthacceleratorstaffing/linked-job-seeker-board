-- Query the current user status and correct their role based on Workable API expectations
-- A "simple" role user should have specific job assignments, not global admin access

-- First, let's reset the user to proper "simple" role permissions
UPDATE public.workable_users 
SET 
    workable_role = 'simple',
    assigned_jobs = ARRAY[]::text[], -- Empty array - no job assignments for simple role
    updated_at = now()
WHERE workable_email = 'bartwetselaar.books@gmail.com';

-- Also update the user_roles table to reflect they are a regular user, not admin
UPDATE public.user_roles 
SET role = 'user'
WHERE user_id = 'db40694e-4dab-4c1b-a263-61efe39a8417' AND role = 'admin';

-- Update the profile role as well
UPDATE public.profiles 
SET role = 'user'
WHERE id = 'db40694e-4dab-4c1b-a263-61efe39a8417' AND role = 'admin';