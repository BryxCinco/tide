-- Adds optional date-range support to tasks, alongside the existing single-date `due_date`.
-- `due_date` stays as-is for single-date tasks (and is also kept in sync with
-- due_date_start for range tasks, so existing sort/filter logic that only knows about
-- due_date keeps working — see client/src/store/taskStore.ts's getVisibleTasks).
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS due_date_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS due_date_end TIMESTAMPTZ;
