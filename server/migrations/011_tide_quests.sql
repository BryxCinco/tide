-- Phase 13 Fix 4 (revised): Tide's Quest. category stays the existing free-text column
-- (no CHECK constraint to alter) — now also used with 'social' at the application level
-- alongside focus/journal/tasks/wellness/growth. xp and completed_at already exist from
-- earlier migrations; only these three are new:
ALTER TABLE quests ADD COLUMN IF NOT EXISTS tier INT DEFAULT 1;
-- 1=Common, 2=Uncommon, 3=Rare, 4=Epic, 5=Legendary — see server/lib/questXp.js
ALTER TABLE quests ADD COLUMN IF NOT EXISTS is_agentic BOOLEAN DEFAULT FALSE;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS generation_reason TEXT;

-- No separate quest_streaks table: the existing `streaks` table (migrations before this repo's
-- own migration files) is already bumped ONLY on quest completion (see quests.js's
-- bumpStreakIfDayComplete) — it IS the quest streak, not a different one. Adding a second
-- table tracking the same thing risked the two silently drifting apart. weekly_completion_rate
-- is computed on read (getQuestStreak tool / GET /api/quests/streak) from `quests` history
-- rather than stored, so there's nothing to keep in sync going forward either.
