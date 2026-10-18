-- Run once in the Supabase SQL editor. Safe to re-run.

-- 1. Day streak columns (same as 012_task_streak.sql, repeated here in case 012 was never
--    applied). The day streak advances on the first task OR quest completed each day — see
--    server/lib/dailyStreak.js.
ALTER TABLE streaks
  ADD COLUMN IF NOT EXISTS task_current_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS task_longest_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS task_last_completed_date DATE;

-- 2. XP once per task: set the first time a task is completed, so un-checking and
--    re-checking it never awards XP again (server/lib/taskXp.js).
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS xp_awarded BOOLEAN NOT NULL DEFAULT FALSE;

-- Tasks already done have already paid out their XP.
UPDATE tasks SET xp_awarded = TRUE WHERE status = 'done' AND xp_awarded = FALSE;

-- 3. Rebuild every user's day streak from their history, so it doesn't start over at 0:
--    each day (Asia/Manila) with a completed task or quest counts, consecutive days form a
--    run, the latest run is the current streak and the longest run is the record. (The app
--    shows the current streak as 0 if the latest run ended before yesterday.)
WITH active_days AS (
  SELECT user_id, (completed_at AT TIME ZONE 'Asia/Manila')::date AS d
  FROM tasks
  WHERE status = 'done' AND completed_at IS NOT NULL
  UNION
  SELECT user_id, date::date AS d
  FROM quests
  WHERE is_completed = TRUE
),
grouped AS (
  SELECT user_id, d, d - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY d))::int AS run_id
  FROM active_days
),
runs AS (
  SELECT user_id, run_id, COUNT(*)::int AS len, MAX(d) AS last_day
  FROM grouped
  GROUP BY user_id, run_id
),
longest AS (
  SELECT user_id, MAX(len) AS longest FROM runs GROUP BY user_id
),
latest AS (
  SELECT DISTINCT ON (user_id) user_id, len, last_day
  FROM runs
  ORDER BY user_id, last_day DESC
)
UPDATE streaks s
SET task_current_streak = latest.len,
    task_longest_streak = GREATEST(s.task_longest_streak, longest.longest),
    task_last_completed_date = latest.last_day,
    updated_at = NOW()
FROM latest
JOIN longest USING (user_id)
WHERE s.user_id = latest.user_id;

-- Check the result:
-- SELECT user_id, task_current_streak, task_longest_streak, task_last_completed_date FROM streaks;
