import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DashboardPreferences, WidgetId, WidgetInstance, WidgetSize } from '../types/dashboard';
import { storage } from '../utils/storage';

const DEFAULT_WIDGETS: WidgetInstance[] = [
  { id: 'hero', type: 'hero', enabled: true, order: 0, size: 'full' },
  { id: 'stats', type: 'stats', enabled: true, order: 1, size: 'full' },
  { id: 'tasks', type: 'tasks', enabled: true, order: 2, size: 'full' },
  { id: 'focusFlow', type: 'focusFlow', enabled: true, order: 3, size: 'full' },
  { id: 'quote', type: 'quote', enabled: true, order: 4, size: 'full' },
  { id: 'quickActions', type: 'quickActions', enabled: true, order: 5, size: 'full' },
  { id: 'recentActivity', type: 'recentActivity', enabled: true, order: 6, size: 'full' },
  { id: 'recentJournal', type: 'recentJournal', enabled: false, order: 7, size: 'full' },
  { id: 'insights', type: 'insights', enabled: false, order: 8, size: 'full' },
  { id: 'habits', type: 'habits', enabled: false, order: 9, size: 'full' },
  // Fix 8's small tile widgets — Time and Streak on by default (an always-useful clock and
  // the Daily Quests streak restated as a glanceable tile), the other three off since they
  // either need a permission (Weather) or duplicate a screen that already exists (Calendar,
  // Weekly Progress vs. the Insights tab) until the user opts in.
  { id: 'time', type: 'time', enabled: true, order: 10, size: 'sm' },
  { id: 'streak', type: 'streak', enabled: true, order: 11, size: 'sm' },
  { id: 'calendar', type: 'calendar', enabled: false, order: 12, size: 'sm' },
  { id: 'weather', type: 'weather', enabled: false, order: 13, size: 'sm' },
  { id: 'weeklyProgress', type: 'weeklyProgress', enabled: false, order: 14, size: 'sm' },
  // Off by default — most accounts haven't set up a recurring activity yet, so this would
  // just show its empty state until they opt in (same reasoning as insights/habits above).
  { id: 'todaysRoutine', type: 'todaysRoutine', enabled: false, order: 15, size: 'full' },
];

interface DashboardState {
  preferences: DashboardPreferences;
  toggleWidget: (id: string) => void;
  setWidgetSize: (id: string, size: WidgetSize) => void;
  /** Appends a new instance of `type`, enabled, at the end of the current order — "Add
   * Widget" in CustomizeDashboardModal. Multiple instances of the same type are allowed
   * (e.g. two Stats Rows); each gets its own fresh id, never reusing an existing one. */
  addWidgetInstance: (type: WidgetId) => void;
  /** Removes one instance outright — unlike toggleWidget (hide/show), this actually drops
   * it from the list. Meant for a duplicate a user added and no longer wants; removing a
   * single remaining instance of a type is allowed too (same as hiding it, just permanent). */
  removeWidgetInstance: (id: string) => void;
  /** Rewrites every widget's `order` to match its index in `orderedIds` — the caller
   * (CustomizeDashboardModal) always passes the full, current list, not a partial diff. */
  reorderWidgets: (orderedIds: string[]) => void;
  resetPreferences: () => void;
}

/** Old persisted shape (pre-Fix-5): id doubled as the widget type, and size was only
 * 'full' | 'compact' | undefined. Detected by the absence of a `type` field. */
interface LegacyWidgetConfig {
  id: string;
  enabled: boolean;
  order: number;
  size?: 'full' | 'compact';
}

function isLegacyWidget(w: LegacyWidgetConfig | WidgetInstance): w is LegacyWidgetConfig {
  return !('type' in w);
}

/** One-time shape migration, run from the persist `merge` below so it applies transparently
 * on every load of an old-shape store — no separate migrate step or version bump needed
 * since `merge` already receives the raw persisted JSON before anything else touches it. */
function migrateWidgets(widgets: (LegacyWidgetConfig | WidgetInstance)[]): WidgetInstance[] {
  return widgets.map((w) =>
    isLegacyWidget(w)
      ? { id: w.id, type: w.id as WidgetId, enabled: w.enabled, order: w.order, size: w.size === 'compact' ? 'sm' : 'full' }
      : w,
  );
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

      setWidgetSize: (id, size) =>
        set((state) => ({
          preferences: { widgets: state.preferences.widgets.map((w) => (w.id === id ? { ...w, size } : w)) },
        })),

      addWidgetInstance: (type) =>
        set((state) => {
          const maxOrder = state.preferences.widgets.reduce((max, w) => Math.max(max, w.order), -1);
          const instance: WidgetInstance = { id: `${type}_${Date.now()}`, type, enabled: true, order: maxOrder + 1, size: 'full' };
          return { preferences: { widgets: [...state.preferences.widgets, instance] } };
        }),

      removeWidgetInstance: (id) =>
        set((state) => ({ preferences: { widgets: state.preferences.widgets.filter((w) => w.id !== id) } })),

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
      // A widget TYPE added to DEFAULT_WIDGETS after a user's prefs were already persisted
      // (e.g. Fix 8's 5 new tiles, or Fix 3's Today's Routine) would otherwise never appear
      // for them — the persist middleware's default shallow merge replaces `preferences`
      // wholesale with whatever was saved. This appends any default instance whose TYPE is
      // missing from the persisted list (not just id, now that a type can have several
      // instances with different ids) instead of dropping it, while leaving that user's
      // existing enabled/order/size/instance choices untouched. Also runs the old-shape ->
      // WidgetInstance migration first, so both concerns are handled in the one place persist
      // already calls on every load.
      merge: (persisted, current) => {
        const rawWidgets = (persisted as Partial<DashboardState>)?.preferences?.widgets ?? [];
        const persistedWidgets = migrateWidgets(rawWidgets as (LegacyWidgetConfig | WidgetInstance)[]);
        const persistedTypes = new Set(persistedWidgets.map((w) => w.type));
        const missingDefaults = DEFAULT_WIDGETS.filter((w) => !persistedTypes.has(w.type));
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
export function getVisibleWidgets(widgets: WidgetInstance[]): WidgetInstance[] {
  return widgets.filter((w) => w.enabled).sort((a, b) => a.order - b.order);
}

/** All widgets in display order, enabled or not — for the customize modal's full list. */
export function getOrderedWidgets(widgets: WidgetInstance[]): WidgetInstance[] {
  return [...widgets].sort((a, b) => a.order - b.order);
}
