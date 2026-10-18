import { create } from 'zustand';

import { getApiErrorMessage } from '../services/api';
import { streakService } from '../services/streak.service';
import type { Streak } from '../types/streak';
import { hasAuthToken, isGuestMode } from '../utils/authFlags';

interface StreakState {
  streak: Streak | null;
  isLoading: boolean;
  error: string | null;

  fetchStreak: () => Promise<void>;
  /** Patches just the task streak's current count in place, from a task-completion
   * response's `taskStreak` field (server/routes/tasks.js's bumpTaskStreak) — avoids a
   * full refetch for instant UI feedback. No-ops if nothing has been fetched yet or the
   * value is null (that response's completion didn't actually advance the streak — e.g.
   * a second task completed the same day). */
  applyTaskStreak: (next: number | null) => void;
  clearError: () => void;
}

/**
 * Read-only mirror of the `streaks` row — it only ever changes server-side, as a side
 * effect of completing a day's quests (see quests.js's bumpStreakIfDayComplete), so there's
 * no local mutation here, just fetch. questStore keeps its own lighter `streak: number`
 * for its three existing consumers (QuestCard, StreakWidget, StatsRow); this store is
 * for anything that wants the fuller picture (longestStreak, lastActivityDate) without
 * pulling in questStore's whole quest-list machinery.
 */
export const useStreakStore = create<StreakState>()((set, get) => ({
  streak: null,
  isLoading: false,
  error: null,

  fetchStreak: async () => {
    // Guests have no backend account/JWT — streaks are entirely server-tracked (see
    // quests.js's bumpStreakIfDayComplete), so a guest simply doesn't have one to fetch;
    // leaving `streak: null` is correct here, not an error state.
    if (isGuestMode()) return;
    // No token yet — skip rather than 401 for a reason unrelated to the token itself. See
    // taskStore.ts's fetchTasks for the full rationale.
    if (!hasAuthToken()) return;

    set({ isLoading: true, error: null });
    try {
      const streak = await streakService.get();
      set({ streak, isLoading: false });
    } catch (err) {
      set({ error: getApiErrorMessage(err), isLoading: false });
    }
  },

  applyTaskStreak: (next) => {
    const current = get().streak;
    if (next == null) return;
    if (!current) {
      get().fetchStreak();
      return;
    }
    set({ streak: { ...current, taskCurrentStreak: next, taskLongestStreak: Math.max(current.taskLongestStreak, next) } });
  },

  clearError: () => set({ error: null }),
}));

/** The headline "day streak" — days in a row with at least one task or quest completed
 * (server/lib/dailyStreak.js). Shown on the Dashboard, Profile and Streak widget. */
export const useDayStreak = () => useStreakStore((s) => s.streak?.taskCurrentStreak ?? 0);
