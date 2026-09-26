ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS linked_job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resume_text text,
  ADD COLUMN IF NOT EXISTS linkedin_headline text;

CREATE POLICY "Staff read candidate CVs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'candidate-cvs' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff upload candidate CVs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'candidate-cvs' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff update candidate CVs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'candidate-cvs' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff delete candidate CVs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'candidate-cvs' AND public.is_staff(auth.uid()));