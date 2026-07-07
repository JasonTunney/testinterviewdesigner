-- =========================================================================
-- Security hardening: remove the anonymous / world-writable access that the
-- original Lovable build shipped with. Edge functions use the service-role key
-- and bypass RLS, so locking these tables does not affect server-side logic.
-- =========================================================================

-- COMPANY CONFIG -----------------------------------------------------------
-- Was world-readable (this table stores settings_password in plaintext) and
-- world-writable. Restrict direct API access to admins only.
DROP POLICY IF EXISTS "Anyone can read company config"   ON public.company_config;
DROP POLICY IF EXISTS "Anyone can update company config" ON public.company_config;
DROP POLICY IF EXISTS "Anyone can insert company config" ON public.company_config;

CREATE POLICY "Admins read company config" ON public.company_config
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update company config" ON public.company_config
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert company config" ON public.company_config
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- INTERVIEW PLANS ----------------------------------------------------------
-- Was world read/write. Restrict to signed-in users.
DROP POLICY IF EXISTS "Anyone can insert plans" ON public.interview_plans;
DROP POLICY IF EXISTS "Anyone can read plans"   ON public.interview_plans;
DROP POLICY IF EXISTS "Anyone can update plans" ON public.interview_plans;

CREATE POLICY "Authenticated read plans" ON public.interview_plans
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert plans" ON public.interview_plans
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update plans" ON public.interview_plans
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- CANDIDATES ---------------------------------------------------------------
-- Candidate names/emails (PII) were world-readable. Restrict to signed-in users.
DROP POLICY IF EXISTS "Anyone read candidates" ON public.candidates;
CREATE POLICY "Authenticated read candidates" ON public.candidates
  FOR SELECT TO authenticated USING (true);

-- INTERVIEW ASSIGNMENTS ----------------------------------------------------
-- Was world-readable.
DROP POLICY IF EXISTS "Anyone read assignments" ON public.interview_assignments;
CREATE POLICY "Authenticated read assignments" ON public.interview_assignments
  FOR SELECT TO authenticated USING (true);

-- STORAGE: org-charts bucket ----------------------------------------------
-- Anyone could upload, overwrite, or delete objects. Keep public read so the
-- org-chart image still renders via its public URL, but lock writes to admins.
DROP POLICY IF EXISTS "Anyone can upload org charts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view org charts"   ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update org charts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete org charts" ON storage.objects;

CREATE POLICY "Public read org charts" ON storage.objects
  FOR SELECT USING (bucket_id = 'org-charts');
CREATE POLICY "Admins upload org charts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'org-charts' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update org charts" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'org-charts' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete org charts" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'org-charts' AND public.has_role(auth.uid(), 'admin'));
