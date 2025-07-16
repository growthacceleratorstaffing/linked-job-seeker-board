-- Drop all existing non-Workable policies and replace with Workable-based access control
-- This ensures ALL access is determined by Workable roles and job assignments

-- CANDIDATES TABLE - Workable role-based access
DROP POLICY IF EXISTS "Admins can manage all candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admins can view all candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can create their own candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can delete their own candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can update their own candidates" ON public.candidates;
DROP POLICY IF EXISTS "Users can view their own candidates" ON public.candidates;

-- Workable admin users can manage all candidates
CREATE POLICY "Workable admins can manage all candidates" ON public.candidates
FOR ALL USING (has_workable_admin_role(auth.uid()));

-- Users with hiring_manager or simple roles can view candidates for their assigned jobs
CREATE POLICY "Workable users can view candidates for assigned jobs" ON public.candidates
FOR SELECT USING (
  has_workable_admin_role(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.workable_users wu
    WHERE wu.user_id = auth.uid() 
    AND wu.workable_role IN ('hiring_manager', 'simple')
    AND (
      '*' = ANY(wu.assigned_jobs) OR
      -- If candidate is associated with a job, check if user has access to that job
      EXISTS (
        SELECT 1 FROM public.candidate_responses cr
        JOIN public.jobs j ON cr.job_id = j.id
        WHERE cr.candidate_id = candidates.id
        AND j.id::text = ANY(wu.assigned_jobs)
      )
    )
  )
);

-- Users with hiring_manager role can create candidates
CREATE POLICY "Workable hiring managers can create candidates" ON public.candidates
FOR INSERT WITH CHECK (
  has_workable_admin_role(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.workable_users
    WHERE user_id = auth.uid() AND workable_role IN ('admin', 'hiring_manager')
  )
);

-- Users with hiring_manager role can update candidates for their jobs
CREATE POLICY "Workable hiring managers can update candidates" ON public.candidates
FOR UPDATE USING (
  has_workable_admin_role(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.workable_users wu
    WHERE wu.user_id = auth.uid() 
    AND wu.workable_role IN ('hiring_manager', 'simple')
    AND (
      '*' = ANY(wu.assigned_jobs) OR
      EXISTS (
        SELECT 1 FROM public.candidate_responses cr
        JOIN public.jobs j ON cr.job_id = j.id
        WHERE cr.candidate_id = candidates.id
        AND j.id::text = ANY(wu.assigned_jobs)
      )
    )
  )
);

-- JOBS TABLE - Workable role-based access
DROP POLICY IF EXISTS "Authenticated users can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON public.jobs;

-- Workable admin users can manage all jobs
CREATE POLICY "Workable admins can manage all jobs" ON public.jobs
FOR ALL USING (has_workable_admin_role(auth.uid()));

-- Users can view jobs based on their Workable role and assignments
CREATE POLICY "Workable users can view assigned jobs" ON public.jobs
FOR SELECT USING (
  has_workable_admin_role(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.workable_users wu
    WHERE wu.user_id = auth.uid() 
    AND wu.workable_role IN ('hiring_manager', 'simple', 'reviewer')
    AND (
      '*' = ANY(wu.assigned_jobs) OR
      jobs.id::text = ANY(wu.assigned_jobs)
    )
  )
);

-- Users with hiring_manager role can create jobs
CREATE POLICY "Workable hiring managers can create jobs" ON public.jobs
FOR INSERT WITH CHECK (
  has_workable_admin_role(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.workable_users
    WHERE user_id = auth.uid() AND workable_role IN ('admin', 'hiring_manager')
  )
);

-- Users with hiring_manager role can update their assigned jobs
CREATE POLICY "Workable hiring managers can update jobs" ON public.jobs
FOR UPDATE USING (
  has_workable_admin_role(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.workable_users wu
    WHERE wu.user_id = auth.uid() 
    AND wu.workable_role IN ('hiring_manager')
    AND (
      '*' = ANY(wu.assigned_jobs) OR
      jobs.id::text = ANY(wu.assigned_jobs)
    )
  )
);

-- CANDIDATE RESPONSES - Workable role-based access
DROP POLICY IF EXISTS "Allow all access to candidate_responses" ON public.candidate_responses;
DROP POLICY IF EXISTS "Allow public delete access to candidate_responses" ON public.candidate_responses;
DROP POLICY IF EXISTS "Allow public insert access to candidate_responses" ON public.candidate_responses;
DROP POLICY IF EXISTS "Allow public read access to candidate_responses" ON public.candidate_responses;
DROP POLICY IF EXISTS "Allow public update access to candidate_responses" ON public.candidate_responses;
DROP POLICY IF EXISTS "Authenticated users can manage candidate responses" ON public.candidate_responses;
DROP POLICY IF EXISTS "Authenticated users can view all candidate responses" ON public.candidate_responses;

-- Workable users can manage candidate responses for their assigned jobs
CREATE POLICY "Workable users can manage candidate responses" ON public.candidate_responses
FOR ALL USING (
  has_workable_admin_role(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.workable_users wu
    WHERE wu.user_id = auth.uid() 
    AND wu.workable_role IN ('hiring_manager', 'simple')
    AND (
      '*' = ANY(wu.assigned_jobs) OR
      candidate_responses.job_id::text = ANY(wu.assigned_jobs)
    )
  )
);

-- CANDIDATE INTERVIEWS - Workable role-based access
DROP POLICY IF EXISTS "Users can manage candidate interviews" ON public.candidate_interviews;

-- Workable users can manage candidate interviews for their assigned jobs
CREATE POLICY "Workable users can manage candidate interviews" ON public.candidate_interviews
FOR ALL USING (
  has_workable_admin_role(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.workable_users wu
    WHERE wu.user_id = auth.uid() 
    AND wu.workable_role IN ('hiring_manager', 'simple', 'reviewer')
    AND (
      '*' = ANY(wu.assigned_jobs) OR
      candidate_interviews.job_id::text = ANY(wu.assigned_jobs)
    )
  )
);