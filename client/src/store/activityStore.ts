import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createSeedActivities } from '../mocks/mockActivities';
import { activityService } from '../services/activity.service';
import { getApiErrorMessage } from '../services/api';
import type { Activity } from '../types/activity';
import { hasAuthToken, isGuestMode } from '../utils/authFlags';
import { storage } from '../utils/storage';
import { showToast } from './toastStore';

interface ActivityState {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;

  fetchActivities: () => Promise<void>;
  addActivity: (input: { name: string; icon: string; color: string }) => Promise<Activity>;
  updateActivity: (id: string, updates: Partial<Pick<Activity, 'name' | 'icon' | 'color'>>) => void;
  /** Custom activities only — predefined ones can be edited but not removed. */
  deleteActivity: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setArchived: (id: string, archived: boolean) => void;
  reorderActivity: (id: string, swapWithId: string) => void;
  clearError: () => void;
  /** Wipes local state back to empty — see taskStore.reset()'s comment for why this exists
   * (a single non-user-scoped 'tide_activities' storage key otherwise leaks across
   * accounts). fetchActivities() re-seeds the 6 predefined ones for a genuinely fresh
   * account, same as any other first login. */
  reset: () => void;
}

/**
 * Persisted via our existing cross-platform `storage` wrapper as an offline cache —
 * `fetchActivities()` overwrites it with the server's copy on success, but the last-known
 * list still renders instantly on relaunch/offline instead of a blank screen.
 *
 * Mutations (update/delete/toggle/archive) apply to local state immediately and fire the
 * API call in the background, rolling back + toasting on failure — same "optimistic,
 * eventually-consistent" shape the spec asked for on tasks, applied uniformly here too since
 * none of these call sites use a return value. `addActivity` is the one exception: it stays
 * `async` and returns the server's real row, because its result is used synchronously
 * elsewhere (Timer's "+Custom" flow immediately sets the created activity as currentActivity,
 * which later gets sent as a real activity_id when the session is saved — a locally-generated
 * temp id would silently break that FK).
 */
export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      activities: createSeedActivities(),
      isLoading: false,
      error: null,

      fetchActivities: async () => {
        // Guests have no backend account/JWT — the request would just 401. The seeded
        // predefined set from initial state (and anything since added locally, since this
        // store persists to localStorage/SecureStore regardless of account type) is already
        // exactly what a guest should see, so this is a no-op rather than a network call.
        if (isGuestMode()) return;
        // No token yet (this fetch fired a tick ahead of sign-in actually completing) —
        // skip rather than 401 for a reason unrelated to the token itself. See
        // taskStore.ts's fetchTasks for the full rationale.
        if (!hasAuthToken()) return;

        set({ isLoading: true, error: null });
        try {
          let activities = await activityService.list();

          if (activities.length === 0) {
            // First login for this account — the activities table starts empty (the signup
            // trigger only seeds profiles/user_settings/streaks). Seed the same predefined
            // set the app used to ship with locally, persisted server-side this time, so a
            // new user doesn't land on an empty Activities screen.
            const seeds = createSeedActivities().filter((a) => a.category === 'predefined');
            activities = await Promise.all(
              seeds.map((seed) =>
                activityService.create({ name: seed.name, icon: seed.icon, color: seed.color, category: 'predefined' }),
              ),
            );
          }

          set({ activities, isLoading: false });
        } catch (err) {
          set({ error: getApiErrorMessage(err), isLoading: false });
        }
      },

      addActivity: async ({ name, icon, color }) => {
        if (isGuestMode()) {
          const activity: Activity = {
            id: `local_${Date.now()}`,
            name,
            icon,
            color,
            category: 'custom',
            isFavorite: false,
            isArchived: false,
            createdAt: new Date().toISOString(),
          };
          set((state) => ({ activities: [...state.activities, activity] }));
          return activity;
        }

        const activity = await activityService.create({ name, icon, color, category: 'custom' });
        set((state) => ({ activities: [...state.activities, activity] }));
        return activity;
      },

      updateActivity: (id, updates) => {
        const previous = get().activities;
        set((state) => ({
          activities: state.activities.map((activity) => (activity.id === id ? { ...activity, ...updates } : activity)),
        }));
        if (isGuestMode()) return;
        activityService.update(id, updates).catch((err) => {
          set({ activities: previous });
          showToast(getApiErrorMessage(err), 'error');
        });
      },

      deleteActivity: (id) => {
        const activity = get().activities.find((a) => a.id === id);
        if (!activity || activity.category !== 'custom') return;

        const previous = get().activities;
        set((state) => ({ activities: state.activities.filter((a) => a.id !== id) }));
        if (isGuestMode()) return;
        activityService.remove(id).catch((err) => {
          set({ activities: previous });
          showToast(getApiErrorMessage(err), 'error');
        });
      },

      toggleFavorite: (id) => {
        const previous = get().activities;
        const activity = previous.find((a) => a.id === id);
        if (!activity) return;

        const isFavorite = !activity.isFavorite;
        set((state) => ({
          activities: state.activities.map((a) => (a.id === id ? { ...a, isFavorite } : a)),
        }));
        if (isGuestMode()) return;
        activityService.update(id, { isFavorite }).catch((err) => {
          set({ activities: previous });
          showToast(getApiErrorMessage(err), 'error');
        });
      },

      setArchived: (id, archived) => {
        const previous = get().activities;
        set((state) => ({
          activities: state.activities.map((a) => (a.id === id ? { ...a, isArchived: archived } : a)),
        }));
        if (isGuestMode()) return;
        activityService.update(id, { isArchived: archived }).catch((err) => {
          set({ activities: previous });
          showToast(getApiErrorMessage(err), 'error');
        });
      },

      reorderActivity: (id, swapWithId) => {
        // Local display order only — the activities table has no sort-order column, so
        // this isn't synced to the server (unchanged from before the API integration).
        set((state) => {
          const index = state.activities.findIndex((a) => a.id === id);
          const swapIndex = state.activities.findIndex((a) => a.id === swapWithId);
          if (index === -1 || swapIndex === -1) return state;

          const next = [...state.activities];
          [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
          return { activities: next };
        });
      },

      clearError: () => set({ error: null }),
      reset: () => set({ activities: [], isLoading: false, error: null }),
    }),
    {
      name: 'tide_activities',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({ activities: state.activities }),
    },
  ),
);
