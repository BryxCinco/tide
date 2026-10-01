-- Phase 13 Fix 1: up to 3 photos per journal entry (see server/lib/storage.js's
-- MAX_JOURNAL_PHOTOS, enforced server-side in routes/journals.js — this column itself has no
-- length constraint, same pattern as `tags`).
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';
