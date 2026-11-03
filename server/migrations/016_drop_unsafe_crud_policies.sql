-- Drop the remaining "own CRUD" (FOR ALL) RLS policies. Run in the Supabase SQL Editor.
--
-- Same problem as 015 (user_levels): with the user's access token (held by the client) and the
-- public anon key, these let any signed-in user read and WRITE their own rows straight through
-- Supabase's REST API, skipping the server's validation, XP rules, embedding sync and file
-- cleanup. On embeddings that also means planting text into their own AI Coach context.
--
-- The client never reads or writes these tables directly (it only uses Supabase for auth); the
-- server does all of it with the service-role key, which bypasses RLS. With RLS enabled and no
-- policy, anon/authenticated are denied and the server is unaffected.
--
-- Policy names for activities and journal_entries come from pg_policies on the live project
-- (their base schema predates this repo); embeddings' is from 004_embeddings.sql.
--
-- DROP POLICY IF EXISTS silently does nothing on a misspelled name, so the check at the end
-- fails the whole migration (rolling it back) if any write-capable policy is still left on
-- these tables.

BEGIN;

DROP POLICY IF EXISTS "Users can CRUD own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can CRUD own embeddings" ON public.embeddings;
DROP POLICY IF EXISTS "Users can CRUD own journal_entries" ON public.journal_entries;

-- So that "no policy" means "deny", not "no restriction".
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  leftover TEXT;
BEGIN
  SELECT string_agg(format('%s: "%s" (%s)', tablename, policyname, cmd), ', ')
    INTO leftover
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename IN ('activities', 'embeddings', 'journal_entries')
     AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE');

  IF leftover IS NOT NULL THEN
    RAISE EXCEPTION '016: write-capable policies still present, nothing was changed: %', leftover;
  END IF;
END $$;

COMMIT;
