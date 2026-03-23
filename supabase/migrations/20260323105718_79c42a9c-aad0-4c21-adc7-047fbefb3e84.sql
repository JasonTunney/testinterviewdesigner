ALTER TABLE public.interview_plans ADD COLUMN status text NOT NULL DEFAULT 'draft';

CREATE POLICY "Anyone can update plans" ON public.interview_plans FOR UPDATE USING (true) WITH CHECK (true);