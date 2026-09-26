import type { Session } from '../types/timer';

export const INTEREST_TAGS: string[] = [
  'Productive',
  'Creative',
  'Learning',
  'Collaborative',
  'Focused',
  'Energizing',
];

/** Fresh-start: no fake sessions for a new account — timerStore.ts fetches the real list
 * from the API instead of seeding from this. Kept (empty) only in case anything still
 * imports it. */
export const mockTodaySessions: Session[] = [];
