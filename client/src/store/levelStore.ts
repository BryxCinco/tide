import { create } from 'zustand';

import { getApiErrorMessage } from '../services/api';
import { levelService } from '../services/level.service';
import type { XpResult } from '../types/xp';
import { hasAuthToken, isGuestMode } from '../utils/authFlags';
import { showToast } from './toastStore';

interface LevelState {
  level: number;
  totalXp: number;
  isLoading: boolean;
  error: string | null;

  fetchLevel: () => Promise<void>;
  /** Applied straight from a mutation response's `xp` field (task completed, session
   * logged, journal entry added, quest completed, streak milestone) instead of a refetch —
   * also fires the "+N XP" / level-up toast in one place rather than every call site
   * duplicating it. No-ops for guests/no-xp responses since `xp` is just null there. */
  applyXpResult: (xp: XpResult | null | undefined) => void;
  clearError: () => void;
  reset: () => void;
}

export const useLevelStore = create<LevelState>()((set) => ({
  level: 1,
  totalXp: 0,
  isLoading: false,
  error: null,

  fetchLevel: async () => {
    // Guests have no backend account/JWT — XP is entirely server-tracked, so a guest simply
    // doesn't have any yet; the default level 1 / 0 XP above is correct here, not an error.
    if (isGuestMode()) return;
    if (!hasAuthToken()) return;

    set({ isLoading: true, error: null });
    try {
      const { level, totalXp } = await levelService.get();
      set({ level, totalXp, isLoading: false });
    } catch (err) {
      set({ error: getApiErrorMessage(err), isLoading: false });
    }
  },

  applyXpResult: (xp) => {
    if (!xp) return;
    set({ level: xp.level, totalXp: xp.totalXp });
    showToast(xp.leveledUp ? `🎉 Level ${xp.level}!` : `+${xp.xpGained} XP!`, 'success');
  },

  clearError: () => set({ error: null }),
  reset: () => set({ level: 1, totalXp: 0, isLoading: false, error: null }),
}));
