-- Drop every client-side write policy in the public schema. Run in the Supabase SQL Editor.
--
-- pg_policies on the live project showed an "own CRUD" (FOR ALL) or INSERT/UPDATE policy on
-- almost every table. With the user's access token (held by the client) and the public anon
-- key, each one let a signed-in user write their own rows straight through Supabase's REST
-- API — XP (quests.xp), timers (time_logs), streaks, tasks, settings, profile — skipping the
-- server and every rule it enforces.
--
-- None of them are needed:
--   - The server does every read and write with the service-role key, which bypasses RLS.
--   - The client only uses Supabase for auth; it never queries a table directly.
--   - handle_new_user() (the signup trigger that creates profiles/user_settings/streaks/
--     user_levels rows) is SECURITY DEFINER, so it runs as the table owner and is not
--     subject to RLS.
-- RLS stays enabled on every table, so "no write policy" means "writes denied".
--
-- SELECT policies are left alone. This supersedes 015 and 016; running it after them is fine
-- (every DROP is IF EXISTS), and so is running it on its own.
--
-- DROP POLICY IF EXISTS silently does nothing on a misspelled name, so the check at the end
-- fails the whole migration (rolling it back) if ANY write-capable policy is still left
-- anywhere in the public schema, naming each one.

BEGIN;

DROP POLICY IF EXISTS "Users can CRUD own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can CRUD own embeddings" ON public.embeddings;
DROP POLICY IF EXISTS "Users can CRUD own journal_entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can CRUD own quests" ON public.quests;
DROP POLICY IF EXISTS "Users can CRUD own streaks" ON public.streaks;
DROP POLICY IF EXISTS "Users can CRUD own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can CRUD own time_logs" ON public.time_logs;
DROP POLICY IF EXISTS "Users can CRUD own settings" ON public.user_settings;
-- Already dropped by 015 if that ran; repeated so this migration is complete on its own.
DROP POLICY IF EXISTS "Users can CRUD own level" ON public.user_levels;

-- So that "no write policy" means "deny", not "no restriction".
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  leftover TEXT;
BEGIN
  SELECT string_agg(format('%s: "%s" (%s)', tablename, policyname, cmd), ', ' ORDER BY tablename, policyname)
    INTO leftover
    FROM pg_policies
   WHERE schemaname = 'public'
     AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE');

  IF leftover IS NOT NULL THEN
    RAISE EXCEPTION '017: write-capable policies still present in public, nothing was changed: %', leftover;
  END IF;
END $$;

COMMIT;
