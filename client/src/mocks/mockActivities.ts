import type { Activity } from '../types/activity';

export const PRESET_COLORS: string[] = [
  '#14B8A6', // teal
  '#0EA5E9', // blue
  '#8B5CF6', // purple
  '#F97316', // orange
  '#EC4899', // pink
  '#64748B', // slate
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // indigo
  '#A855F7', // violet
  '#6B7280', // gray
];

export const ICON_OPTIONS: string[] = [
  'Brain', 'Users', 'BookOpen', 'Dumbbell', 'Palette', 'Coffee',
  'Code', 'Music', 'Camera', 'PenLine', 'Target', 'Heart',
  'Briefcase', 'GraduationCap', 'Utensils', 'Plane', 'Home', 'ShoppingBag',
  'Gamepad2', 'Film', 'Mic', 'Phone', 'Mail', 'Calendar',
  'MapPin', 'Star', 'Zap', 'Sun', 'Moon', 'Leaf',
];

/**
 * The Timer's fallback when a session is started with no activity picked (Fix 3: "allow
 * starting without an activity"). A real `Activity` object, not a bare string default, so
 * it flows through the exact same code paths as any other activity — Today's Sessions,
 * Activity Breakdown, Insights — instead of needing special-cased handling at every call
 * site that reads `Session.activityId`. Deliberately NOT part of `createSeedActivities()`:
 * that array only seeds a brand-new user's persisted `activityStore`, and this constant
 * needs to exist even for existing users whose store was already persisted before this
 * activity was added.
 */
export const DEFAULT_FOCUS_ACTIVITY: Activity = {
  id: 'focus-session',
  name: 'Focus Session',
  icon: 'Target',
  color: '#14B8A6',
  category: 'predefined',
  isFavorite: false,
  isArchived: false,
  createdAt: new Date(0).toISOString(),
};

/** The 6 activities Phase 5 shipped with, now living as `category: 'predefined'` rows
 * in activityStore instead of a separate static list. */
export function createSeedActivities(): Activity[] {
  const now = new Date().toISOString();
  const base = { category: 'predefined' as const, isFavorite: false, isArchived: false, createdAt: now };

  return [
    { id: 'deep-work', name: 'Deep Work', icon: 'Brain', color: '#14B8A6', ...base },
    { id: 'meetings', name: 'Meetings', icon: 'Users', color: '#0EA5E9', ...base },
    { id: 'learning', name: 'Learning', icon: 'BookOpen', color: '#8B5CF6', ...base },
    { id: 'exercise', name: 'Exercise', icon: 'Dumbbell', color: '#F97316', ...base },
    { id: 'creative', name: 'Creative', icon: 'Palette', color: '#EC4899', ...base },
    { id: 'break', name: 'Break', icon: 'Coffee', color: '#6B7280', ...base },
  ];
}
