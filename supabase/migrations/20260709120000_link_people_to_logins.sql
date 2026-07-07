-- =========================================================================
-- Link directory people to login accounts by email, on any insert path.
--
-- Previously people were linked to profiles only at signup (handle_new_user).
-- Bulk-uploaded / manually-added people never got linked, so their
-- profile_id stayed null and they could never earn Quality-per-Hire credit
-- (the leaderboard maps kit panelist -> people.profile_id -> user).
-- =========================================================================

CREATE OR REPLACE FUNCTION public.link_person_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.profile_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT id INTO NEW.profile_id
    FROM public.profiles
    WHERE lower(email) = lower(NEW.email)
    LIMIT 1;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_link_person_profile ON public.people;
CREATE TRIGGER trg_link_person_profile
  BEFORE INSERT OR UPDATE OF email ON public.people
  FOR EACH ROW EXECUTE FUNCTION public.link_person_profile();

-- Backfill the existing directory.
UPDATE public.people p
SET profile_id = pr.id
FROM public.profiles pr
WHERE p.profile_id IS NULL
  AND p.email IS NOT NULL
  AND lower(p.email) = lower(pr.email);
