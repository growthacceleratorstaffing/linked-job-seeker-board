-- Create jobadder_users table
CREATE TABLE public.jobadder_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jobadder_user_id TEXT NOT NULL UNIQUE,
  jobadder_email TEXT NOT NULL UNIQUE,
  jobadder_role jobadder_scope NOT NULL DEFAULT 'read',
  permissions JSONB DEFAULT '{}',
  assigned_jobs TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jobadder_users ENABLE ROW LEVEL SECURITY;

-- Create policies for jobadder_users
CREATE POLICY "Users can view their own JobAdder data" 
ON public.jobadder_users 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all JobAdder data" 
ON public.jobadder_users 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM jobadder_users ju 
  WHERE ju.user_id = auth.uid() 
  AND ju.jobadder_role = ANY(ARRAY['write'::jobadder_scope, 'read'::jobadder_scope])
));

CREATE POLICY "Admins can manage all JobAdder data" 
ON public.jobadder_users 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM jobadder_users ju 
  WHERE ju.user_id = auth.uid() 
  AND ju.jobadder_role = 'write'::jobadder_scope
));