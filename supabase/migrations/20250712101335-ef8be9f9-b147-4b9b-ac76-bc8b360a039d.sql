-- Add user_id column to integration_settings table
ALTER TABLE public.integration_settings 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records to have a user_id (if any exist)
-- This is safe because we're setting up user-specific access
UPDATE public.integration_settings 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- Make user_id not null after populating existing records
ALTER TABLE public.integration_settings 
ALTER COLUMN user_id SET NOT NULL;

-- Drop existing RLS policies that allow all access
DROP POLICY IF EXISTS "Allow all access to integration_settings" ON public.integration_settings;

-- Create user-specific RLS policies for integration_settings
CREATE POLICY "Users can view their own integration settings"
ON public.integration_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own integration settings"
ON public.integration_settings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own integration settings"
ON public.integration_settings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own integration settings"
ON public.integration_settings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;