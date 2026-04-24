
-- ROLES & PROFILES
CREATE TYPE public.app_role AS ENUM ('admin', 'hiring_manager', 'interviewer');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT, role_title TEXT, avatar_url TEXT, email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email, NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'interviewer');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PEOPLE & SKILLS
CREATE TABLE public.people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL, role_title TEXT, email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_people_updated_at BEFORE UPDATE ON public.people
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.people_skills (
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency INTEGER NOT NULL CHECK (proficiency BETWEEN 1 AND 5),
  PRIMARY KEY (person_id, skill_id)
);
ALTER TABLE public.people_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read people" ON public.people FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage people" ON public.people FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated read skills" ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage skills" ON public.skills FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated read people_skills" ON public.people_skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage people_skills" ON public.people_skills FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- CANDIDATES
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT UNIQUE,
  plan_id UUID NOT NULL REFERENCES public.interview_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL, email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','hired','rejected','withdrawn')),
  hire_start_date DATE,
  hiring_manager_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_candidates_short_code ON public.candidates(short_code);
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_candidates_updated_at BEFORE UPDATE ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Anyone read candidates" ON public.candidates FOR SELECT USING (true);
CREATE POLICY "Authenticated create candidates" ON public.candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update candidates" ON public.candidates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins delete candidates" ON public.candidates FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.generate_short_code()
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; result TEXT := ''; i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, 1 + floor(random()*length(chars))::int, 1);
  END LOOP;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.set_candidate_short_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE attempts INT := 0; new_code TEXT;
BEGIN
  IF NEW.short_code IS NULL OR NEW.short_code = '' THEN
    LOOP
      new_code := public.generate_short_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.candidates WHERE short_code = new_code);
      attempts := attempts + 1;
      IF attempts > 10 THEN RAISE EXCEPTION 'Could not generate unique code'; END IF;
    END LOOP;
    NEW.short_code := new_code;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_candidates_short_code BEFORE INSERT ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.set_candidate_short_code();

-- INTERVIEW ASSIGNMENTS
CREATE TABLE public.interview_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, stage_id, user_id)
);
ALTER TABLE public.interview_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone read assignments" ON public.interview_assignments FOR SELECT USING (true);
CREATE POLICY "Authenticated manage assignments" ON public.interview_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WASH-UP SESSIONS (must come before interview_notes so the helper can reference it)
CREATE TABLE public.washup_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  ai_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);
ALTER TABLE public.washup_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read sessions" ON public.washup_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated manage sessions" ON public.washup_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.washup_blind_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.washup_sessions(id) ON DELETE CASCADE,
  panelist_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, panelist_user_id)
);
ALTER TABLE public.washup_blind_scores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.session_is_closed(_session_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.washup_sessions WHERE id = _session_id AND status = 'closed')
$$;

CREATE OR REPLACE FUNCTION public.washup_closed_for(_candidate_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.washup_sessions WHERE candidate_id = _candidate_id AND status = 'closed')
$$;

CREATE POLICY "Read own or closed blind scores" ON public.washup_blind_scores FOR SELECT TO authenticated
  USING (panelist_user_id = auth.uid() OR public.session_is_closed(session_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Insert own blind score" ON public.washup_blind_scores FOR INSERT TO authenticated WITH CHECK (panelist_user_id = auth.uid());
CREATE POLICY "Update own blind score" ON public.washup_blind_scores FOR UPDATE TO authenticated USING (panelist_user_id = auth.uid());

-- INTERVIEW NOTES
CREATE TABLE public.interview_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL,
  panelist_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_index INTEGER,
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  notes TEXT,
  submitted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, stage_id, panelist_user_id, question_index)
);
ALTER TABLE public.interview_notes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_notes_updated_at BEFORE UPDATE ON public.interview_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Panelist read own or closed notes" ON public.interview_notes FOR SELECT TO authenticated
  USING (panelist_user_id = auth.uid() OR public.washup_closed_for(candidate_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Panelist insert own notes" ON public.interview_notes FOR INSERT TO authenticated WITH CHECK (panelist_user_id = auth.uid());
CREATE POLICY "Panelist update own notes" ON public.interview_notes FOR UPDATE TO authenticated USING (panelist_user_id = auth.uid());
CREATE POLICY "Panelist delete own notes" ON public.interview_notes FOR DELETE TO authenticated USING (panelist_user_id = auth.uid());

-- HIRE RATINGS
CREATE TABLE public.hire_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL UNIQUE REFERENCES public.candidates(id) ON DELETE CASCADE,
  rated_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment TEXT,
  rated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hire_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read hire ratings" ON public.hire_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert hire ratings" ON public.hire_ratings FOR INSERT TO authenticated WITH CHECK (rated_by_user_id = auth.uid());
CREATE POLICY "Rater update own rating" ON public.hire_ratings FOR UPDATE TO authenticated USING (rated_by_user_id = auth.uid());

-- Quality-per-Hire view per panelist user
CREATE OR REPLACE VIEW public.panelist_qph
WITH (security_invoker = true) AS
SELECT
  ia.user_id AS panelist_user_id,
  AVG(hr.score)::numeric(3,2) AS avg_score,
  COUNT(DISTINCT hr.candidate_id) AS rated_hires
FROM public.interview_assignments ia
JOIN public.hire_ratings hr ON hr.candidate_id = ia.candidate_id
GROUP BY ia.user_id;
