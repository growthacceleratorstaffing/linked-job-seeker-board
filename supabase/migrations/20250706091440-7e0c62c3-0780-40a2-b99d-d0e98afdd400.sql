-- Add unique constraint on workable_email to support UPSERT operations
ALTER TABLE public.workable_users 
ADD CONSTRAINT workable_users_workable_email_unique 
UNIQUE (workable_email);