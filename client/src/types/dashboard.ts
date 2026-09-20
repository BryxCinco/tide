import type { IconName } from '@/components/ui';

export type AccentTone = 'teal' | 'blue' | 'purple' | 'muted';

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
