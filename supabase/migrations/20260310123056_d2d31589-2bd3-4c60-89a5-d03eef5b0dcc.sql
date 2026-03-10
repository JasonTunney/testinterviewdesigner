CREATE TABLE public.interview_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title text NOT NULL,
  department text,
  summary text,
  job_description text,
  plan_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (no auth required since app has no auth)
CREATE POLICY "Anyone can insert plans"
  ON public.interview_plans FOR INSERT
  WITH CHECK (true);

-- Only readable via settings password (enforced in app), but allow select for admin page
CREATE POLICY "Anyone can read plans"
  ON public.interview_plans FOR SELECT
  USING (true);