-- Atomic XP awards. Run in the Supabase SQL Editor BEFORE deploying the server change that
-- calls it (server/lib/xpService.js) — until this exists, every XP award fails.
--
-- awardXp used to read total_xp, add in JS, and upsert the sum. Two awards in flight at once
-- (a quest completion and its streak-milestone bonus, two tabs, a double-tap) both read the
-- same total and the later write erased the earlier one. Doing the increment inside one
-- INSERT ... ON CONFLICT DO UPDATE makes Postgres serialize them on the row lock.
--
-- level mirrors server/lib/xpService.js levelFromXp / client/src/utils/xp.ts exactly:
--   floor(sqrt(xp / 100)) + 1, in double precision like JS's Math.sqrt.

CREATE OR REPLACE FUNCTION public.award_xp(p_user_id UUID, p_amount INT)
RETURNS TABLE (new_total_xp INT, new_level INT)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total INT;
  v_level INT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'award_xp: p_amount must be a positive integer (got %)', p_amount;
  END IF;

  INSERT INTO public.user_levels AS ul (user_id, total_xp, level, updated_at)
  VALUES (p_user_id, p_amount, floor(sqrt(p_amount / 100.0::float8))::INT + 1, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = ul.total_xp + EXCLUDED.total_xp,
        level = floor(sqrt(GREATEST(0, ul.total_xp + EXCLUDED.total_xp) / 100.0::float8))::INT + 1,
        updated_at = NOW()
  RETURNING ul.total_xp, ul.level INTO v_total, v_level;

  RETURN QUERY SELECT v_total, v_level;
END;
$$;

-- Every new function is executable by PUBLIC by default, and Supabase exposes it at
-- /rest/v1/rpc/award_xp to anyone holding the (public) anon key. Only the server's
-- service-role key may call this — otherwise any client could award any user any XP.
REVOKE EXECUTE ON FUNCTION public.award_xp(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp(UUID, INT) TO service_role;
