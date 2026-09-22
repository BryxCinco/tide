import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DashboardPreferences, WidgetConfig, WidgetId } from '../types/dashboard';
import { storage } from '../utils/storage';

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'hero', enabled: true, order: 0 },
  { id: 'stats', enabled: true, order: 1 },
  { id: 'tasks', enabled: true, order: 2 },
  { id: 'focusFlow', enabled: true, order: 3 },
  { id: 'quote', enabled: true, order: 4 },
  { id: 'quickActions', enabled: true, order: 5 },
  { id: 'recentActivity', enabled: true, order: 6 },
  { id: 'recentJournal', enabled: false, order: 7 },
  { id: 'insights', enabled: false, order: 8 },
  { id: 'habits', enabled: false, order: 9 },
  // Fix 8's small tile widgets — Time and Streak on by default (an always-useful clock and
  // the Daily Quests streak restated as a glanceable tile), the other three off since they
  // either need a permission (Weather) or duplicate a screen that already exists (Calendar,
  // Weekly Progress vs. the Insights tab) until the user opts in.
  { id: 'time', enabled: true, order: 10, size: 'compact' },
  { id: 'streak', enabled: true, order: 11, size: 'compact' },
  { id: 'calendar', enabled: false, order: 12, size: 'compact' },
  { id: 'weather', enabled: false, order: 13, size: 'compact' },
  { id: 'weeklyProgress', enabled: false, order: 14, size: 'compact' },
];

interface DashboardState {
  preferences: DashboardPreferences;
  toggleWidget: (id: WidgetId) => void;
  /** Rewrites every widget's `order` to match its index in `orderedIds` — the caller
   * (CustomizeDashboardModal) always passes the full, current list, not a partial diff. */
  reorderWidgets: (orderedIds: WidgetId[]) => void;
  resetPreferences: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      preferences: { widgets: DEFAULT_WIDGETS },

      toggleWidget: (id) =>
        set((state) => ({
          preferences: {
            widgets: state.preferences.widgets.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)),
          },
        })),

      reorderWidgets: (orderedIds) =>
        set((state) => ({
          preferences: {
            widgets: state.preferences.widgets.map((w) => ({ ...w, order: orderedIds.indexOf(w.id) })),
          },
        })),

      resetPreferences: () => set({ preferences: { widgets: DEFAULT_WIDGETS } }),
    }),
    {
      name: 'tide_dashboard_prefs',
      storage: createJSONStorage(() => storage),
      // A widget added to DEFAULT_WIDGETS after a user's prefs were already persisted
      // (e.g. Fix 8's 5 new tiles) would otherwise never appear for them — the persist
      // middleware's default shallow merge replaces `preferences` wholesale with whatever
      // was saved. This appends any default widget missing from the persisted list instead
      // of dropping it, while leaving that user's existing enabled/order choices untouched.
      merge: (persisted, current) => {
        const persistedWidgets = (persisted as Partial<DashboardState>)?.preferences?.widgets ?? [];
        const persistedIds = new Set(persistedWidgets.map((w) => w.id));
        const missingDefaults = DEFAULT_WIDGETS.filter((w) => !persistedIds.has(w.id));
        return {
          ...current,
          ...(persisted as Partial<DashboardState>),
          preferences: { widgets: [...persistedWidgets, ...missingDefaults] },
        };
      },
    },
  ),
);

/** Shared by app/(tabs)/index.tsx and CustomizeDashboardModal — kept as a plain function
 * (not a store selector) so callers wrap it in their own `useMemo`. */
export function getVisibleWidgets(widgets: WidgetConfig[]): WidgetConfig[] {
  return widgets.filter((w) => w.enabled).sort((a, b) => a.order - b.order);
}

/** All widgets in display order, enabled or not — for the customize modal's full list. */
export function getOrderedWidgets(widgets: WidgetConfig[]): WidgetConfig[] {
  return [...widgets].sort((a, b) => a.order - b.order);
}
