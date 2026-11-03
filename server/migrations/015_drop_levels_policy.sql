-- Drop the "own CRUD" policy on user_levels. Run in the Supabase SQL Editor.
--
-- 008_levels_xp.sql created it as FOR ALL USING (auth.uid() = user_id). The client holds the
-- user's access token and the anon key is public, so any signed-in user could write their own
-- row straight through Supabase's REST API —
--   PATCH /rest/v1/user_levels?user_id=eq.<own id>   { "total_xp": 99999999 }
-- — skipping the server and every XP rule it enforces.
--
-- Nothing in the client reads or writes user_levels directly (it only uses Supabase for
-- auth); the server uses the service-role key, which bypasses RLS. With RLS still enabled and
-- no policy left, anon/authenticated are denied everything and the server is unaffected.

DROP POLICY IF EXISTS "Users can CRUD own level" ON public.user_levels;

-- Belt and braces: make sure RLS is (still) on, so "no policy" means "deny" rather than
-- "no restriction".
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
