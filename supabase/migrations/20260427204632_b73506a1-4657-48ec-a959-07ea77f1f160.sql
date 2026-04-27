-- 1. Backfill people.profile_id by email match
UPDATE public.people p
SET profile_id = pr.id
FROM public.profiles pr
WHERE p.profile_id IS NULL
  AND p.email IS NOT NULL
  AND lower(p.email) = lower(pr.email);

-- 2. Update handle_new_user to auto-link a People record by email
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email, NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'interviewer');

  -- Auto-link any People record with matching email
  UPDATE public.people
     SET profile_id = NEW.id
   WHERE profile_id IS NULL
     AND email IS NOT NULL
     AND lower(email) = lower(NEW.email);

  RETURN NEW;
END; $function$;

-- 3. Unique constraint for clean upsert/delete of assignments
ALTER TABLE public.interview_assignments
  DROP CONSTRAINT IF EXISTS interview_assignments_candidate_stage_person_key;
ALTER TABLE public.interview_assignments
  ADD CONSTRAINT interview_assignments_candidate_stage_person_key
  UNIQUE (candidate_id, stage_id, person_id);

-- 4. Sync function: rebuilds interview_assignments for one candidate from its plan
CREATE OR REPLACE FUNCTION public.sync_assignments_for_candidate(_candidate_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  _plan_id uuid;
  _plan jsonb;
BEGIN
  SELECT plan_id INTO _plan_id FROM public.candidates WHERE id = _candidate_id;
  IF _plan_id IS NULL THEN RETURN; END IF;

  SELECT plan_data INTO _plan FROM public.interview_plans WHERE id = _plan_id;
  IF _plan IS NULL THEN RETURN; END IF;

  -- Compute desired (stage_id, person_id, user_id) set from plan_data
  WITH desired AS (
    SELECT
      COALESCE(stage->>'id', 's' || (stage_idx::text)) AS stage_id,
      (panelist->>'person_id')::uuid AS person_id
    FROM jsonb_array_elements(COALESCE(_plan->'stages', '[]'::jsonb)) WITH ORDINALITY AS s(stage, stage_idx)
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(stage->'panelists', '[]'::jsonb)) AS panelist
    WHERE panelist ? 'person_id' AND panelist->>'person_id' <> ''
  ),
  resolved AS (
    SELECT d.stage_id, d.person_id, p.profile_id AS user_id
    FROM desired d
    JOIN public.people p ON p.id = d.person_id
    WHERE p.profile_id IS NOT NULL
  )
  -- Delete assignments that are no longer in the plan
  DELETE FROM public.interview_assignments ia
  WHERE ia.candidate_id = _candidate_id
    AND NOT EXISTS (
      SELECT 1 FROM resolved r
      WHERE r.stage_id = ia.stage_id AND r.person_id = ia.person_id
    );

  -- Upsert current assignments
  INSERT INTO public.interview_assignments (candidate_id, stage_id, person_id, user_id)
  SELECT _candidate_id, r.stage_id, r.person_id, r.user_id
  FROM (
    SELECT
      COALESCE(stage->>'id', 's' || (stage_idx::text)) AS stage_id,
      (panelist->>'person_id')::uuid AS person_id,
      p.profile_id AS user_id
    FROM jsonb_array_elements(COALESCE(_plan->'stages', '[]'::jsonb)) WITH ORDINALITY AS s(stage, stage_idx)
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(stage->'panelists', '[]'::jsonb)) AS panelist
    JOIN public.people p ON p.id = (panelist->>'person_id')::uuid
    WHERE panelist ? 'person_id' AND panelist->>'person_id' <> ''
      AND p.profile_id IS NOT NULL
  ) r
  ON CONFLICT (candidate_id, stage_id, person_id)
  DO UPDATE SET user_id = EXCLUDED.user_id;
END; $$;

-- 5. Trigger on candidates: sync after insert/update
CREATE OR REPLACE FUNCTION public.trg_sync_assignments_candidate()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sync_assignments_for_candidate(NEW.id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS sync_assignments_after_candidate ON public.candidates;
CREATE TRIGGER sync_assignments_after_candidate
AFTER INSERT OR UPDATE OF plan_id ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_assignments_candidate();

-- 6. Trigger on interview_plans: when plan_data changes, sync all candidates of that plan
CREATE OR REPLACE FUNCTION public.trg_sync_assignments_plan()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE c_id uuid;
BEGIN
  IF NEW.plan_data IS DISTINCT FROM OLD.plan_data THEN
    FOR c_id IN SELECT id FROM public.candidates WHERE plan_id = NEW.id LOOP
      PERFORM public.sync_assignments_for_candidate(c_id);
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS sync_assignments_after_plan ON public.interview_plans;
CREATE TRIGGER sync_assignments_after_plan
AFTER UPDATE ON public.interview_plans
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_assignments_plan();