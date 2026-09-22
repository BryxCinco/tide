import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Quest } from '../types/quest';
import { toDateKey } from '../utils/formatDate';
import { generateDailyQuests } from '../utils/questGenerator';
import { storage } from '../utils/storage';

interface QuestState {
  todayQuests: Quest[];
  /** The date `todayQuests` was generated for — compared against the real "today" on every
   * `ensureToday()` call so a day boundary crossed while the app sits open (or just
   * reopening the next day) regenerates instead of showing yesterday's set. */
  date: string;
  /** Local dates (YYYY-MM-DD) where every quest for that day was completed — the source of
   * truth for `streak`, which is recomputed from this rather than incremented/decremented
   * by hand, so it can never drift out of sync with what actually happened on a given day. */
  completedDates: string[];
  streak: number;

  /** Call on mount wherever quests are shown (DailyQuestCard) — regenerates today's set
   * exactly once per calendar day, a no-op every other call. */
  ensureToday: () => void;
  toggleQuest: (id: string) => void;
}

/** Consecutive days, ending today, present in `dates` — so a single missed day (yesterday
 * not in the set) naturally caps the streak at 0 without needing separate break-detection
 * logic layered on top. */
function computeStreak(dates: string[]): number {
  const set = new Set(dates);
  let streak = 0;
  const cursor = new Date();
  while (set.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      todayQuests: [],
      date: '',
      completedDates: [],
      streak: 0,

      ensureToday: () => {
        const todayKey = toDateKey(new Date());
        if (get().date === todayKey && get().todayQuests.length > 0) return;
        set({ date: todayKey, todayQuests: generateDailyQuests(todayKey) });
      },

      toggleQuest: (id) => {
        set((state) => {
          const todayQuests = state.todayQuests.map((quest) =>
            quest.id === id
              ? { ...quest, isCompleted: !quest.isCompleted, completedAt: quest.isCompleted ? undefined : new Date().toISOString() }
              : quest,
          );

          const allCompleted = todayQuests.length > 0 && todayQuests.every((q) => q.isCompleted);
          const alreadyCredited = state.completedDates.includes(state.date);

          let completedDates = state.completedDates;
          if (allCompleted && !alreadyCredited) {
            completedDates = [...completedDates, state.date];
          } else if (!allCompleted && alreadyCredited) {
            // Unchecking a quest after the day was already credited (e.g. a mis-tap)
            // revokes that credit instead of leaving a phantom completed day behind.
            completedDates = completedDates.filter((d) => d !== state.date);
          }

          return { todayQuests, completedDates, streak: computeStreak(completedDates) };
        });
      },
    }),
    {
      name: 'tide_quests',
      storage: createJSONStorage(() => storage),
    },
  ),
);
