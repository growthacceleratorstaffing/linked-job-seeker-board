-- Update the user to have proper Workable admin access
UPDATE public.workable_users 
SET 
    workable_role = 'admin',
    assigned_jobs = ARRAY['*'], -- Admin access to all jobs
    updated_at = now()
WHERE workable_email = 'bartwetselaar.books@gmail.com';

-- Also create a sample "Senior Cloud Engineer" job if needed
INSERT INTO public.jobs (title, company_name, created_by, job_description, skill_tags)
VALUES (
    'Senior Cloud Engineer',
    'Growth Accelerator',
    'db40694e-4dab-4c1b-a263-61efe39a8417',
    'We are looking for a Senior Cloud Engineer to join our team and help build scalable cloud infrastructure.',
    ARRAY['AWS', 'Cloud', 'DevOps', 'Kubernetes', 'Docker']
) ON CONFLICT DO NOTHING;