-- Make user_id nullable in workable_users table since it gets populated by the trigger when user signs up
ALTER TABLE public.workable_users 
ALTER COLUMN user_id DROP NOT NULL;