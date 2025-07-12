-- Update RLS policies for candidates table to be user-specific
DROP POLICY IF EXISTS "Allow all access to candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow public delete access to candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow public insert access to candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow public read access to candidates" ON public.candidates;
DROP POLICY IF EXISTS "Allow public update access to candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can manage candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users can view all candidates" ON public.candidates;

-- Create new user-specific policies
CREATE POLICY "Users can view their own candidates" ON public.candidates
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own candidates" ON public.candidates
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own candidates" ON public.candidates
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own candidates" ON public.candidates
FOR DELETE USING (auth.uid() = user_id);

-- Allow admin users to see all candidates
CREATE POLICY "Admins can view all candidates" ON public.candidates
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can manage all candidates" ON public.candidates
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);