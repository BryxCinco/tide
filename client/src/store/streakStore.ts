import { create } from 'zustand';

import { getApiErrorMessage } from '../services/api';
import { streakService } from '../services/streak.service';
import type { Streak } from '../types/streak';
import { isGuestMode } from '../utils/authFlags';

interface StreakState {
  streak: Streak | null;
  isLoading: boolean;
  error: string | null;

  fetchStreak: () => Promise<void>;
  clearError: () => void;
}

/**
 * Read-only mirror of the `streaks` row — it only ever changes server-side, as a side
 * effect of completing a day's quests (see quests.js's bumpStreakIfDayComplete), so there's
 * no local mutation here, just fetch. questStore keeps its own lighter `streak: number`
 * for its three existing consumers (DailyQuestCard, StreakWidget, StatsRow); this store is
 * for anything that wants the fuller picture (longestStreak, lastActivityDate) without
 * pulling in questStore's whole quest-list machinery.
 */
export const useStreakStore = create<StreakState>()((set) => ({
  streak: null,
  isLoading: false,
  error: null,

  fetchStreak: async () => {
    // Guests have no backend account/JWT — streaks are entirely server-tracked (see
    // quests.js's bumpStreakIfDayComplete), so a guest simply doesn't have one to fetch;
    // leaving `streak: null` is correct here, not an error state.
    if (isGuestMode()) return;

    set({ isLoading: true, error: null });
    try {
      const streak = await streakService.get();
      set({ streak, isLoading: false });
    } catch (err) {
      set({ error: getApiErrorMessage(err), isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
