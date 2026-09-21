import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { createSeedActivities } from '../mocks/mockActivities';
import type { Activity } from '../types/activity';
import { storage } from '../utils/storage';

interface ActivityState {
  activities: Activity[];

  addActivity: (input: { name: string; icon: string; color: string }) => Activity;
  updateActivity: (id: string, updates: Partial<Pick<Activity, 'name' | 'icon' | 'color'>>) => void;
  /** Custom activities only — predefined ones can be edited but not removed. */
  deleteActivity: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setArchived: (id: string, archived: boolean) => void;
  /**
   * Swaps two activities' array positions directly (array position IS the persisted
   * order). Takes an explicit target id rather than a "direction, ±1" offset because the
   * UI shows activities split into filtered groups (Favorites/Custom/Predefined) — the
   * visual "previous/next" within a group is often not adjacent in the underlying array,
   * so the caller computes the correct neighbor id from its own rendered group list.
   */
  reorderActivity: (id: string, swapWithId: string) => void;
}

/**
 * Persisted via our existing cross-platform `storage` wrapper (SecureStore on native,
 * localStorage on web) rather than a new dependency — its getItem/setItem/removeItem
 * shape already matches zustand's StateStorage interface exactly.
 */
export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      activities: createSeedActivities(),

      addActivity: ({ name, icon, color }) => {
        const activity: Activity = {
          id: `activity_${Date.now()}`,
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
      },

      updateActivity: (id, updates) => {
        set((state) => ({
          activities: state.activities.map((activity) =>
            activity.id === id ? { ...activity, ...updates } : activity,
          ),
        }));
      },

      deleteActivity: (id) => {
        const activity = get().activities.find((a) => a.id === id);
        if (!activity || activity.category !== 'custom') return;
        set((state) => ({ activities: state.activities.filter((a) => a.id !== id) }));
      },

      toggleFavorite: (id) => {
        set((state) => ({
          activities: state.activities.map((a) => (a.id === id ? { ...a, isFavorite: !a.isFavorite } : a)),
        }));
      },

      setArchived: (id, archived) => {
        set((state) => ({
          activities: state.activities.map((a) => (a.id === id ? { ...a, isArchived: archived } : a)),
        }));
      },

      reorderActivity: (id, swapWithId) => {
        set((state) => {
          const index = state.activities.findIndex((a) => a.id === id);
          const swapIndex = state.activities.findIndex((a) => a.id === swapWithId);
          if (index === -1 || swapIndex === -1) return state;

          const next = [...state.activities];
          [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
          return { activities: next };
        });
      },
    }),
    {
      name: 'tide_activities',
      storage: createJSONStorage(() => storage),
    },
  ),
);
