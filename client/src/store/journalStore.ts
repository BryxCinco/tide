import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getApiErrorMessage } from '../services/api';
import { journalService } from '../services/journal.service';
import type { JournalEntry, Mood } from '../types/journal';
import { isGuestMode } from '../utils/authFlags';
import { countWords } from '../utils/formatDate';
import { storage } from '../utils/storage';
import { showToast } from './toastStore';

export type JournalFilter = 'all' | 'week' | 'month' | 'favorites';

interface JournalState {
  entries: JournalEntry[];
  searchQuery: string;
  filter: JournalFilter;
  moodFilter: Mood | null;
  isLoading: boolean;
  error: string | null;

  fetchEntries: () => Promise<void>;
  addEntry: (entry: { title: string; content: string; mood: Mood | null; tags: string[] }) => Promise<JournalEntry>;
  updateEntry: (id: string, updates: Partial<Pick<JournalEntry, 'title' | 'content' | 'mood' | 'tags' | 'isFavorite'>>) => void;
  deleteEntry: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setFilter: (filter: JournalFilter) => void;
  setMoodFilter: (mood: Mood | null) => void;
  getEntryById: (id: string) => JournalEntry | undefined;
  clearError: () => void;
  /** Wipes local state back to empty — see taskStore.reset()'s comment for why this exists
   * (a single non-user-scoped 'tide_journal' storage key otherwise leaks across accounts). */
  reset: () => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      searchQuery: '',
      filter: 'all',
      moodFilter: null,
      isLoading: false,
      error: null,

      fetchEntries: async () => {
        // Guests have no backend account/JWT — this store persists to
        // localStorage/SecureStore regardless of account type, so whatever's already
        // loaded there is already correct; there's nothing to fetch.
        if (isGuestMode()) return;

        set({ isLoading: true, error: null });
        try {
          const entries = await journalService.list();
          set({ entries, isLoading: false });
        } catch (err) {
          set({ error: getApiErrorMessage(err), isLoading: false });
        }
      },

      // Genuinely async (unlike taskStore.addTask) — JournalEditor captures the returned
      // id in React state (savedId) and reuses it for every subsequent autosave, so a
      // temporary local id swapped out later would silently break those follow-up saves.
      addEntry: async ({ title, content, mood, tags }) => {
        if (isGuestMode()) {
          const now = new Date().toISOString();
          const entry: JournalEntry = {
            id: `local_${Date.now()}`,
            title,
            content,
            mood,
            tags,
            isFavorite: false,
            wordCount: countWords(content),
            createdAt: now,
            updatedAt: now,
          };
          set((state) => ({ entries: [entry, ...state.entries] }));
          return entry;
        }

        const newEntry = await journalService.create({ title, content, mood, tags });
        set((state) => ({ entries: [newEntry, ...state.entries] }));
        return newEntry;
      },

      updateEntry: (id, updates) => {
        const previous = get().entries;
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
        if (isGuestMode()) return;
        journalService.update(id, updates).catch((err) => {
          set({ entries: previous });
          showToast(getApiErrorMessage(err), 'error');
        });
      },

      deleteEntry: (id) => {
        const previous = get().entries;
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
        if (isGuestMode()) return;
        journalService.remove(id).catch((err) => {
          set({ entries: previous });
          showToast(getApiErrorMessage(err), 'error');
        });
      },

      toggleFavorite: (id) => {
        const previous = get().entries;
        const entry = previous.find((e) => e.id === id);
        if (!entry) return;

        const isFavorite = !entry.isFavorite;
        set((state) => ({ entries: state.entries.map((e) => (e.id === id ? { ...e, isFavorite } : e)) }));
        if (isGuestMode()) return;
        journalService.update(id, { isFavorite }).catch((err) => {
          set({ entries: previous });
          showToast(getApiErrorMessage(err), 'error');
        });
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setFilter: (filter) => set({ filter }),
      setMoodFilter: (moodFilter) => set({ moodFilter }),
      clearError: () => set({ error: null }),
      reset: () => set({ entries: [], searchQuery: '', filter: 'all', moodFilter: null, isLoading: false, error: null }),

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
