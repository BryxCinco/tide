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

export interface WidgetConfig {
  id: WidgetId;
  enabled: boolean;
  /** Lower renders first. Not necessarily contiguous — reorder rewrites all of them. */
  order: number;
  /** 'compact' widgets (the small Fix-8 tiles: Time/Calendar/Weather/Weekly Progress/
   * Streak) wrap multiple-per-row in WidgetGrid instead of each taking a full row like
   * every other widget ('full', the default when omitted — every widget from before this
   * field existed). */
  size?: 'full' | 'compact';
}

export interface DashboardPreferences {
  widgets: WidgetConfig[];
}
