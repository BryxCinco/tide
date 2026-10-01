export type Mood = 'terrible' | 'bad' | 'okay' | 'good' | 'great';

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: Mood | null;
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
  /** Up to 3 photo URLs — see server/lib/storage.js's MAX_JOURNAL_PHOTOS. */
  photoUrls: string[];
}

/** Max photos a single journal entry can carry — mirrors server/lib/storage.js's
 * MAX_JOURNAL_PHOTOS (hand-duplicated the same way xp.ts/xpService.js already are). */
export const MAX_JOURNAL_PHOTOS = 3;

/** Display order for mood pickers/filters. Icon, color, and label live in
 * MoodIcon.tsx (MOOD_ICON_MAP) — the single source of truth for mood presentation. */
export const MOOD_ORDER: Mood[] = ['terrible', 'bad', 'okay', 'good', 'great'];

/** Pre-defined interest tags offered in the editor — users can also add free-text ones. */
export const INTEREST_TAGS: string[] = [
  'Productive',
  'Creative',
  'Learning',
  'Personal',
  'Reflective',
  'Grateful',
  'Challenging',
  'Peaceful',
];
