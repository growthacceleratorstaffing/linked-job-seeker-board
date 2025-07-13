-- Add unique constraint for workable_candidate_id to support upsert operations
ALTER TABLE public.candidates 
ADD CONSTRAINT unique_workable_candidate_id 
UNIQUE (workable_candidate_id);

-- Create index for better performance on workable_candidate_id queries
CREATE INDEX IF NOT EXISTS idx_candidates_workable_id 
ON public.candidates (workable_candidate_id) 
WHERE workable_candidate_id IS NOT NULL;