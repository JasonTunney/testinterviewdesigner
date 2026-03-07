-- Company configuration table (single row, password protected in app)
CREATE TABLE public.company_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  settings_password TEXT NOT NULL DEFAULT 'admin123',
  company_name TEXT,
  company_description TEXT,
  company_values TEXT,
  industry TEXT,
  org_structure TEXT,
  org_chart_url TEXT,
  hiring_philosophy TEXT,
  min_stages INTEGER DEFAULT 3,
  max_stages INTEGER DEFAULT 5,
  min_questions_per_stage INTEGER DEFAULT 2,
  max_questions_per_stage INTEGER DEFAULT 4,
  max_interview_duration_minutes INTEGER DEFAULT 300,
  competency_framework TEXT,
  additional_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read company config" ON public.company_config FOR SELECT USING (true);
CREATE POLICY "Anyone can update company config" ON public.company_config FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert company config" ON public.company_config FOR INSERT WITH CHECK (true);

INSERT INTO public.company_config (company_name) VALUES ('');

INSERT INTO storage.buckets (id, name, public) VALUES ('org-charts', 'org-charts', true);

CREATE POLICY "Anyone can upload org charts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'org-charts');
CREATE POLICY "Anyone can view org charts" ON storage.objects FOR SELECT USING (bucket_id = 'org-charts');
CREATE POLICY "Anyone can update org charts" ON storage.objects FOR UPDATE USING (bucket_id = 'org-charts');
CREATE POLICY "Anyone can delete org charts" ON storage.objects FOR DELETE USING (bucket_id = 'org-charts');