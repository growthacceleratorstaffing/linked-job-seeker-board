-- Add policy to allow service role (edge functions) to manage workable_users data
CREATE POLICY "Service role can manage workable_users data" 
ON public.workable_users 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);