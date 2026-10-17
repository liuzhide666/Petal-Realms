-- Applied to project bfipozjqhzsbdvmisoct on 2026-10-17.
-- Retained for provenance. Do not re-apply blindly.
CREATE TABLE IF NOT EXISTS public.petal_realms_saves (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 5 CHECK (schema_version BETWEEN 1 AND 100),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision >= 1),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object' AND octet_length(payload::text) <= 1048576),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.petal_realms_saves IS 'Petal Realms V5.1 cloud-save experiment. One isolated row per Supabase Auth user, client-authoritative progression; not anti-cheat.';
ALTER TABLE public.petal_realms_saves ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.petal_realms_saves FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.petal_realms_saves TO authenticated;
CREATE POLICY petal_realms_read_own ON public.petal_realms_saves FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY petal_realms_insert_own ON public.petal_realms_saves FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY petal_realms_update_own ON public.petal_realms_saves FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
