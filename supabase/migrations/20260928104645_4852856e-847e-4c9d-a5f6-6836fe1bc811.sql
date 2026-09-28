DROP POLICY IF EXISTS "Service role can manage crawled jobs" ON public.crawled_jobs;
CREATE POLICY "Service role can manage crawled jobs" ON public.crawled_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated users can view active crawled jobs" ON public.crawled_jobs;