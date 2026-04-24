ALTER TABLE public.skills ADD COLUMN IF NOT EXISTS description text;
CREATE UNIQUE INDEX IF NOT EXISTS skills_name_unique ON public.skills (lower(name));