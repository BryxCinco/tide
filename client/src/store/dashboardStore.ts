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
