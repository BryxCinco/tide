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
}

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
