import type { IconName } from '@/components/ui';

export type AccentTone = 'teal' | 'blue' | 'purple' | 'muted' | 'red';

export interface HeroFocus {
  label: string;
  subtitle: string;
}

export interface StatItem {
  id: string;
  label: string;
  value: string;
  icon: IconName;
  tint: AccentTone;
  /** e.g. "+18%" or "Personal best!" — free-form, not always a percentage. */
  trend?: string;
  /** 0-100 — renders a slim ProgressBar under the label instead of/alongside `trend` (used
   * by the Level card's XP-to-next-level bar). Omit for a plain stat with no bar. */
  progress?: number;
}

export interface FocusActivity {
  id: string;
  label: string;
  duration: string;
  /** 0-100 */
  percentage: number;
  tint: AccentTone;
}

export interface TimeLogEntry {
  id: string;
  activity: string;
  icon: IconName;
  tint: AccentTone;
  startTime: string;
  endTime: string;
  duration: string;
}

export interface JournalPreview {
  id: string;
  date: string;
  title: string;
  preview: string;
  mood?: string;
  tags: string[];
}

export interface QuickActionItem {
  id: string;
  label: string;
  icon: IconName;
  tint: AccentTone;
  href: string;
}

export interface Quote {
  id: string;
  text: string;
  author: string;
}

export interface Habit {
  id: string;
  label: string;
  icon: IconName;
  /** One entry per day of the current week, Monday-first. */
  completedDays: boolean[];
}

export type WidgetId =
  | 'hero'
  | 'stats'
  | 'tasks'
  | 'focusFlow'
  | 'quote'
  | 'quickActions'
  | 'recentActivity'
  | 'recentJournal'
  | 'insights'
  | 'habits'
  | 'time'
  | 'calendar'
  | 'weather'
  | 'weeklyProgress'
  | 'streak'
  | 'todaysRoutine';

/** sm/md/lg occupy increasing fractions of a row (see WidgetGrid's responsive columns:
 * phone 1-col, tablet 2-col, desktop 3-col); 'full' always takes the entire row regardless
 * of column count. Replaces the old binary 'full' | 'compact' — 'compact' widgets migrate
 * to 'sm' (see dashboardStore's persisted-prefs migration). */
export type WidgetSize = 'sm' | 'md' | 'lg' | 'full';

/**
 * One placed widget. `id` is this specific instance's unique id (stable across reorders/
 * edits); `type` says which widget component to render — the two are equal for every
 * widget's first/default instance, and only diverge once a second instance of the same
 * type is added (Phase 13 Fix 5: multiple instances of one widget, e.g. two Stats Rows).
 */
export interface WidgetInstance {
  id: string;
  type: WidgetId;
  enabled: boolean;
  /** Lower renders first. Not necessarily contiguous — reorder rewrites all of them. */
  order: number;
  size: WidgetSize;
  /** Reserved for a future per-instance setting (e.g. which stats a duplicated Stats Row
   * shows) — no widget component reads this yet, so it's always empty today. */
  config?: Record<string, unknown>;
}

export interface DashboardPreferences {
  widgets: WidgetInstance[];
}
