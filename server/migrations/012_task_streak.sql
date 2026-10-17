-- Adds a second, independent streak tracked on the same per-user `streaks` row as the
-- existing quest streak (current_streak/longest_streak/last_activity_date) — a separate
-- counter based on completing at least one Task per day, intentionally left disjoint from
-- the quest streak so the quest streak's existing XP milestone bonuses (see quests.js's
-- STREAK_MILESTONES) are untouched by this.
ALTER TABLE streaks
  ADD COLUMN IF NOT EXISTS task_current_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS task_longest_streak INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS task_last_completed_date DATE;
