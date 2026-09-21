import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '../utils/storage';

export type RecentItemType = 'page' | 'action' | 'journal' | 'task' | 'activity';

export interface RecentItem {
  type: RecentItemType;
  id: string;
  title: string;
  route: string;
}

interface SearchState {
  recentItems: RecentItem[];
  addRecentItem: (item: RecentItem) => void;
  clearRecent: () => void;
}

const MAX_RECENT_ITEMS = 5;

/**
 * MRU cache of what the user has actually picked from search (Cmd+K/the dashboard search
 * bar) — shown as the "RECENT" group when the query is empty, the way VS Code's Cmd+P or
 * Notion's Cmd+K show recently-opened items before you type anything. Distinct from
 * journalStore/taskStore's own data, which useSearch.ts reads directly to match against a
 * typed query.
 */
export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentItems: [],

      addRecentItem: (item) => {
        set((state) => ({
          recentItems: [item, ...state.recentItems.filter((existing) => existing.id !== item.id)].slice(
            0,
            MAX_RECENT_ITEMS,
          ),
        }));
      },

      clearRecent: () => set({ recentItems: [] }),
    }),
    {
      name: 'tide_search',
      storage: createJSONStorage(() => storage),
    },
  ),
);
