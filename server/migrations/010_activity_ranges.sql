-- Phase 13 Fix 3: recurring activities ('none' | 'daily' | 'weekly' | 'monthly' | 'custom').
-- 'weekly' recurs on start_date's weekday; 'monthly' on start_date's day-of-month; 'custom'
-- uses recurrence_days (e.g. ['mon','wed','fri']) — see client/src/utils/activityRecurrence.ts.
ALTER TABLE activities ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT 'none';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS recurrence_days TEXT[] DEFAULT '{}';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS end_date DATE;
