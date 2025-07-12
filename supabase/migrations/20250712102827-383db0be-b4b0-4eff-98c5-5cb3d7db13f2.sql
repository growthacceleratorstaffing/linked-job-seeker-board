-- Check if user_id column already exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'candidates' 
        AND column_name = 'user_id'
    ) THEN
        -- Add user_id column to candidates table to associate candidates with users
        ALTER TABLE public.candidates 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        -- Create index for better performance on user-specific queries
        CREATE INDEX idx_candidates_user_id ON public.candidates(user_id);
        
        -- Update existing candidates to be associated with admin users (fallback)
        UPDATE public.candidates 
        SET user_id = (
            SELECT id FROM auth.users 
            WHERE email IN ('bart@startupaccelerator.nl', 'bart@growthaccelerator.nl')
            LIMIT 1
        )
        WHERE user_id IS NULL;
    END IF;
END $$;