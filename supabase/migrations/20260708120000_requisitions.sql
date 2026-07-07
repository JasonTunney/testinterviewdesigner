-- =========================================================================
-- Requisition-centric model
--  * requisitions are the top-level object (Job Title + external Req ID)
--  * the interview kit (interview_plans) is saved against a requisition
--  * hires are recorded directly on the requisition
--  * Quality-per-Hire is tracked per requisition and credited to every
--    panelist named in that requisition's interview kit
-- =========================================================================

-- REQUISITIONS -------------------------------------------------------------
CREATE TABLE public.requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id text NOT NULL UNIQUE,
  job_title text NOT NULL,
  department text,
  plan_id uuid REFERENCES public.interview_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','filled','closed')),
  hired_name text,
  hired_email text,
  hire_start_date date,
  hiring_manager_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_requisitions_updated_at BEFORE UPDATE ON public.requisitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Authenticated read requisitions" ON public.requisitions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated create requisitions" ON public.requisitions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update requisitions" ON public.requisitions
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins delete requisitions" ON public.requisitions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Candidates remain for interview execution; link them to a requisition.
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS requisition_id uuid REFERENCES public.requisitions(id) ON DELETE CASCADE;

-- HIRE RATINGS: re-key from candidate to requisition ------------------------
-- CASCADE drops the dependent panelist_qph view (recreated below). No data to
-- preserve at this stage.
DROP TABLE IF EXISTS public.hire_ratings CASCADE;
CREATE TABLE public.hire_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id uuid NOT NULL UNIQUE REFERENCES public.requisitions(id) ON DELETE CASCADE,
  rated_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment text,
  rated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hire_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read hire ratings" ON public.hire_ratings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert hire ratings" ON public.hire_ratings
  FOR INSERT TO authenticated WITH CHECK (rated_by_user_id = auth.uid());
CREATE POLICY "Rater update own rating" ON public.hire_ratings
  FOR UPDATE TO authenticated USING (rated_by_user_id = auth.uid());

-- REQUISITION PANELISTS: who interviews for a requisition (from its kit) -----
CREATE TABLE public.requisition_panelists (
  requisition_id uuid NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (requisition_id, person_id)
);
ALTER TABLE public.requisition_panelists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read requisition panelists" ON public.requisition_panelists
  FOR SELECT TO authenticated USING (true);

-- Rebuild a requisition's panelist set from its kit's plan_data.
CREATE OR REPLACE FUNCTION public.sync_requisition_panelists(_requisition_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _plan_id uuid; _plan jsonb;
BEGIN
  SELECT plan_id INTO _plan_id FROM public.requisitions WHERE id = _requisition_id;
  DELETE FROM public.requisition_panelists WHERE requisition_id = _requisition_id;
  IF _plan_id IS NULL THEN RETURN; END IF;
  SELECT plan_data INTO _plan FROM public.interview_plans WHERE id = _plan_id;
  IF _plan IS NULL THEN RETURN; END IF;

  INSERT INTO public.requisition_panelists (requisition_id, person_id, user_id)
  SELECT DISTINCT _requisition_id, p.id, p.profile_id
  FROM (
    SELECT panelist->>'person_id' AS pid
    FROM jsonb_array_elements(COALESCE(_plan->'stages', '[]'::jsonb)) AS stage
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(stage->'panelists', '[]'::jsonb)) AS panelist
    WHERE panelist ? 'person_id' AND (panelist->>'person_id') ~ '^[0-9a-fA-F-]{36}$'
  ) src
  JOIN public.people p ON p.id = src.pid::uuid
  WHERE p.profile_id IS NOT NULL
  ON CONFLICT (requisition_id, person_id) DO UPDATE SET user_id = EXCLUDED.user_id;
END; $$;

-- Resync when a requisition's plan is (re)assigned.
CREATE OR REPLACE FUNCTION public.trg_sync_req_panelists_req()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.sync_requisition_panelists(NEW.id); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS sync_req_panelists_after_req ON public.requisitions;
CREATE TRIGGER sync_req_panelists_after_req
  AFTER INSERT OR UPDATE OF plan_id ON public.requisitions
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_req_panelists_req();

-- Resync all requisitions on a kit when the kit's panelists change.
CREATE OR REPLACE FUNCTION public.trg_sync_req_panelists_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r_id uuid;
BEGIN
  IF NEW.plan_data IS DISTINCT FROM OLD.plan_data THEN
    FOR r_id IN SELECT id FROM public.requisitions WHERE plan_id = NEW.id LOOP
      PERFORM public.sync_requisition_panelists(r_id);
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS sync_req_panelists_after_plan ON public.interview_plans;
CREATE TRIGGER sync_req_panelists_after_plan
  AFTER UPDATE ON public.interview_plans
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_req_panelists_plan();

-- Quality-per-Hire leaderboard: every panelist on a requisition's kit is
-- credited with that requisition's hire rating.
CREATE OR REPLACE VIEW public.panelist_qph WITH (security_invoker = true) AS
SELECT
  rp.user_id AS panelist_user_id,
  AVG(hr.score)::numeric(3,2) AS avg_score,
  COUNT(DISTINCT hr.requisition_id) AS rated_hires
FROM public.requisition_panelists rp
JOIN public.hire_ratings hr ON hr.requisition_id = rp.requisition_id
GROUP BY rp.user_id;
