-- Create jobadder_tokens table to store OAuth tokens
CREATE TABLE public.jobadder_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  api_base_url TEXT NOT NULL DEFAULT 'https://api.jobadder.com/v2',
  scopes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jobadder_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for jobadder_tokens
CREATE POLICY "Users can view their own JobAdder tokens" 
ON public.jobadder_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own JobAdder tokens" 
ON public.jobadder_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own JobAdder tokens" 
ON public.jobadder_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own JobAdder tokens" 
ON public.jobadder_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_jobadder_tokens()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_jobadder_tokens_updated_at
  BEFORE UPDATE ON public.jobadder_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_jobadder_tokens();