-- Run in Supabase SQL Editor before testing custom/recurring/pausable quests.
ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_type TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;
