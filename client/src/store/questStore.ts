import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getApiErrorMessage } from '../services/api';
import { questService, type UpdateQuestPayload } from '../services/quest.service';
import { streakService } from '../services/streak.service';
import type { Quest, QuestCategory, QuestRecurrenceType } from '../types/quest';
import { hasAuthToken, isGuestMode } from '../utils/authFlags';
import { toDateKey } from '../utils/formatDate';
import { generateDailyQuests } from '../utils/questGenerator';
import { storage } from '../utils/storage';
import { showToast } from './toastStore';

export interface CustomQuestInput {
  title: string;
  description: string;
  icon: string;
  category: QuestCategory;
  xp: number;
  isRecurring: boolean;
  recurrenceType: QuestRecurrenceType | null;
}

interface QuestState {
  todayQuests: Quest[];
  /** The date `todayQuests` belongs to — compared against the real "today" isn't needed
   * anymore (fetchTodayQuests always asks the server for today's date explicitly), kept
   * only for display/debugging. */
  date: string;
  /** Mirrors streaks.current_streak — kept here (not just in the new streakStore) so the
   * three existing consumers (DailyQuestCard, StreakWidget, StatsRow) don't need touching.
   * streakStore is the richer source (also has longestStreak) for anything new. */
  streak: number;
  isLoading: boolean;
  error: string | null;

  /** Call on mount wherever quests are shown (DailyQuestCard) — fetches today's quest set,
   * generating + persisting one server-side on the very first check-in of the day. */
  fetchTodayQuests: () => Promise<void>;
  toggleQuest: (id: string) => void;
  /** Real async (unlike updateQuest/deleteQuest below) — QuestFormModal awaits this to know
   * whether the create actually succeeded before closing itself. */
  addCustomQuest: (input: CustomQuestInput) => Promise<Quest>;
  /** Optimistic + rollback, same shape as taskStore/activityStore's mutations — covers both
   * a full edit (QuestFormModal) and pause/resume (QuestManagerModal's toggle). */
  updateQuest: (id: string, updates: UpdateQuestPayload) => void;
  /** Custom quests only (the client mirrors the server's own check so the button can be
   * hidden rather than just failing after the fact — see QuestManagerModal). */
  deleteQuest: (id: string) => void;
  /**
   * Local display order only, not persisted server-side — the quests table has no sort
   * column (same tradeoff activityStore.reorderActivity already makes, see its comment).
   * Swaps two ids' positions directly rather than an index-based move, since callers
   * already have both ids from their own rendered list.
   */
  reorderQuests: (id: string, swapWithId: string) => void;
  clearError: () => void;
  /** Wipes local state back to empty — see taskStore.reset()'s comment for why this exists
   * (a single non-user-scoped 'tide_quests' storage key otherwise leaks across accounts).
   * fetchTodayQuests() regenerates a fresh day's quest set on the next mount, same as any
   * other first login. */
  reset: () => void;
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      todayQuests: [],
      date: '',
      streak: 0,
      isLoading: false,
      error: null,

      fetchTodayQuests: async () => {
        const todayKey = toDateKey(new Date());

        // Guests have no backend account/JWT to persist quests against. If today's set was
        // already generated (persisted locally like everything else in this store), leave
        // it alone; otherwise generate one purely locally — no questService.create() calls,
        // no streak (that's server-tracked only, see bumpStreakIfDayComplete on the backend).
        if (isGuestMode()) {
          if (get().date === todayKey && get().todayQuests.length > 0) return;
          set({ todayQuests: generateDailyQuests(todayKey), date: todayKey, isLoading: false });
          return;
        }
        // No token yet — skip rather than 401 for a reason unrelated to the token itself.
        // See taskStore.ts's fetchTasks for the full rationale.
        if (!hasAuthToken()) return;

        set({ isLoading: true, error: null });
        try {
          let quests = await questService.list(todayKey);

          if (quests.length === 0) {
            // First check-in today — generate the same random set questGenerator.ts always
            // produced locally, but persist each one server-side this time, explicitly
            // marked is_custom: false so they can be paused but not deleted.
            const generated = generateDailyQuests(todayKey);
            quests = await Promise.all(
              generated.map((q) =>
                questService.create({
                  title: q.title,
                  description: q.description,
                  icon: q.icon,
                  category: q.category,
                  xp: q.xp,
                  date: todayKey,
                  isCustom: false,
                }),
              ),
            );
          }

          const streak = await streakService.get().catch(() => null);
          set({
            todayQuests: quests,
            date: todayKey,
            streak: streak?.currentStreak ?? get().streak,
            isLoading: false,
          });
        } catch (err) {
          set({ error: getApiErrorMessage(err), isLoading: false });
        }
      },

      toggleQuest: (id) => {
        const previous = get().todayQuests;
        const quest = previous.find((q) => q.id === id);
        if (!quest) return;

        const isCompleted = !quest.isCompleted;
        set((state) => ({
          todayQuests: state.todayQuests.map((q) =>
            q.id === id ? { ...q, isCompleted, completedAt: isCompleted ? new Date().toISOString() : undefined } : q,
          ),
        }));

        // No backend account to persist completion or credit a streak against — the local
        // toggle above is the whole story for a guest.
        if (isGuestMode()) return;

        questService.complete(id, isCompleted).then(
          ({ streak }) => {
            // Only present when this completion finished off every quest for the day — see
            // the comment on quest.service.ts's complete(). Un-completing never arrives with
            // a streak update (the server doesn't revoke an already-credited day), so the
            // locally displayed streak can stay stale until the next fetchTodayQuests().
            if (streak) set({ streak: streak.currentStreak });
          },
          (err) => {
            set({ todayQuests: previous });
            showToast(getApiErrorMessage(err), 'error');
          },
        );
      },

      addCustomQuest: async (input) => {
        const todayKey = get().date || toDateKey(new Date());

        if (isGuestMode()) {
          const quest: Quest = {
            id: `local_${Date.now()}`,
            title: input.title,
            description: input.description,
            icon: input.icon,
            category: input.category,
            xp: input.xp,
            isCompleted: false,
            date: todayKey,
            isCustom: true,
            isActive: true,
            isRecurring: input.isRecurring,
            recurrenceType: input.recurrenceType,
          };
          set((state) => ({ todayQuests: [...state.todayQuests, quest] }));
          return quest;
        }

        const quest = await questService.create({
          title: input.title,
          description: input.description,
          icon: input.icon,
          category: input.category,
          xp: input.xp,
          date: todayKey,
          isRecurring: input.isRecurring,
          recurrenceType: input.recurrenceType,
          isActive: true,
          isCustom: true,
        });
        set((state) => ({ todayQuests: [...state.todayQuests, quest] }));
        return quest;
      },

      updateQuest: (id, updates) => {
        const previous = get().todayQuests;
        set((state) => ({
          todayQuests: state.todayQuests.map((q) =>
            q.id === id
              ? {
                  ...q,
                  ...(updates.title !== undefined && { title: updates.title }),
                  ...(updates.description !== undefined && { description: updates.description }),
                  ...(updates.icon !== undefined && { icon: updates.icon }),
                  ...(updates.category !== undefined && { category: updates.category }),
                  ...(updates.xp !== undefined && { xp: updates.xp }),
                  ...(updates.isActive !== undefined && { isActive: updates.isActive }),
                  ...(updates.isRecurring !== undefined && { isRecurring: updates.isRecurring }),
                  ...(updates.recurrenceType !== undefined && { recurrenceType: updates.recurrenceType }),
                }
              : q,
          ),
        }));
        if (isGuestMode()) return;
        questService.update(id, updates).catch((err) => {
          set({ todayQuests: previous });
          showToast(getApiErrorMessage(err), 'error');
        });
      },

      deleteQuest: (id) => {
        const previous = get().todayQuests;
        const quest = previous.find((q) => q.id === id);
        if (!quest || !quest.isCustom) return;

        set((state) => ({ todayQuests: state.todayQuests.filter((q) => q.id !== id) }));
        if (isGuestMode()) return;
        questService.remove(id).catch((err) => {
          set({ todayQuests: previous });
          showToast(getApiErrorMessage(err), 'error');
        });
      },

      reorderQuests: (id, swapWithId) => {
        set((state) => {
          const index = state.todayQuests.findIndex((q) => q.id === id);
          const swapIndex = state.todayQuests.findIndex((q) => q.id === swapWithId);
          if (index === -1 || swapIndex === -1) return state;

          const next = [...state.todayQuests];
          [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
          return { todayQuests: next };
        });
      },

      clearError: () => set({ error: null }),
      reset: () => set({ todayQuests: [], date: '', streak: 0, isLoading: false, error: null }),
    }),
    {
      name: 'tide_quests',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({ todayQuests: state.todayQuests, date: state.date, streak: state.streak }),
    },
  ),
);
