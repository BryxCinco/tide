-- Phase 12.1 Fix 1: remove date-range mode from tasks (back to a single due_date).
-- Safe to run whether or not 006_task_date_range.sql was ever applied.
ALTER TABLE tasks DROP COLUMN IF EXISTS due_date_start;
ALTER TABLE tasks DROP COLUMN IF EXISTS due_date_end;
