import type { JournalEntry } from '../types/journal';

/**
 * Fresh-start: new accounts get zero journal entries rather than 6 fake seed entries —
 * journalStore.ts fetches the real list from the API instead of calling this. Kept as a
 * function (not a plain `[]` export) only so any lingering import doesn't need to change
 * shape if this is ever revisited.
 */
export function createSeedJournalEntries(): JournalEntry[] {
  return [];
}
