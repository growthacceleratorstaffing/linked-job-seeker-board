-- Add unique constraint on email for candidates table to enable upsert operations
ALTER TABLE public.candidates ADD CONSTRAINT candidates_email_unique UNIQUE (email);