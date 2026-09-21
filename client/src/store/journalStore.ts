import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createSeedJournalEntries } from '../mocks/mockJournal';
import type { JournalEntry, Mood } from '../types/journal';
import { countWords } from '../utils/formatDate';
import { storage } from '../utils/storage';

export type JournalFilter = 'all' | 'week' | 'month' | 'favorites';

interface JournalState {
  entries: JournalEntry[];
  searchQuery: string;
  filter: JournalFilter;
  moodFilter: Mood | null;

  addEntry: (entry: { title: string; content: string; mood: Mood | null; tags: string[] }) => JournalEntry;
  updateEntry: (id: string, updates: Partial<Pick<JournalEntry, 'title' | 'content' | 'mood' | 'tags' | 'isFavorite'>>) => void;
  deleteEntry: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setFilter: (filter: JournalFilter) => void;
  setMoodFilter: (mood: Mood | null) => void;
  getEntryById: (id: string) => JournalEntry | undefined;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: createSeedJournalEntries(),
      searchQuery: '',
      filter: 'all',
      moodFilter: null,

      addEntry: ({ title, content, mood, tags }) => {
        const now = new Date().toISOString();
        const newEntry: JournalEntry = {
          id: `journal_${Date.now()}`,
          title,
          content,
          mood,
          tags,
          isFavorite: false,
          createdAt: now,
          updatedAt: now,
          wordCount: countWords(content),
        };
        set((state) => ({ entries: [newEntry, ...state.entries] }));
        return newEntry;
      },

      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id
              ? {
                  ...e,
                  ...updates,
                  wordCount: updates.content !== undefined ? countWords(updates.content) : e.wordCount,
                  updatedAt: new Date().toISOString(),
                }
              : e,
          ),
        }));
      },

      deleteEntry: (id) => {
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
      },

      toggleFavorite: (id) => {
        set((state) => ({
          entries: state.entries.map((e) => (e.id === id ? { ...e, isFavorite: !e.isFavorite } : e)),
        }));
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setFilter: (filter) => set({ filter }),
      setMoodFilter: (moodFilter) => set({ moodFilter }),

      getEntryById: (id) => get().entries.find((e) => e.id === id),
    }),
    {
      name: 'tide_journal',
      storage: createJSONStorage(() => storage),
      // Search/filter/mood-filter are view state, not data — persisting them would make
      // the screen "remember" a stale view instead of defaulting to All/no-filter each session.
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);

function isWithinDays(iso: string, days: number): boolean {
  const date = new Date(iso).getTime();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return date >= cutoff;
}

/**
 * Shared by app/(tabs)/journal.tsx. Kept as a plain function (not a store selector) so
 * callers wrap it in their own `useMemo` — see the Zustand v5 selector-stability note in
 * journalStore's consumers.
 */
export function getVisibleEntries(
  entries: JournalEntry[],
  searchQuery: string,
  filter: JournalFilter,
  moodFilter: Mood | null,
): JournalEntry[] {
  const query = searchQuery.trim().toLowerCase();

  return entries.filter((entry) => {
    if (filter === 'favorites' && !entry.isFavorite) return false;
    if (filter === 'week' && !isWithinDays(entry.createdAt, 7)) return false;
    if (filter === 'month' && !isWithinDays(entry.createdAt, 30)) return false;
    if (moodFilter && entry.mood !== moodFilter) return false;

    if (query) {
      const haystack = `${entry.title} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}
