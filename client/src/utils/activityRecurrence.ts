import type { Activity, DayCode } from '../types/activity';
import { fromDateKey, toDateKey } from './formatDate';

/** JS Date.getDay() is Sunday-first (0-6) — this maps that index straight to DayCode. */
const DAY_CODES: DayCode[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const DAY_CODE_LABELS: Record<DayCode, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

/** Display order for the custom-days checkbox row — Monday-first, matching every other
 * weekday list in this app (see formatDate.ts's mondayFirstIndex convention). */
export const DAY_CODE_ORDER: DayCode[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * True if `activity` is scheduled on `date` per its recurrence rule and start/end range.
 * 'none' always returns false — a one-time activity has no "scheduled day" concept, it's
 * just always available (see ActivityPicker's "All Activities" section).
 */
export function isActivityScheduledOn(activity: Activity, date: Date = new Date()): boolean {
  if (activity.recurrenceType === 'none') return false;

  const dateKey = toDateKey(date);
  if (activity.startDate && dateKey < activity.startDate) return false;
  if (activity.endDate && dateKey > activity.endDate) return false;

  switch (activity.recurrenceType) {
    case 'daily':
      return true;
    case 'weekly':
      return fromDateKey(activity.startDate).getDay() === date.getDay();
    case 'monthly':
      return fromDateKey(activity.startDate).getDate() === date.getDate();
    case 'custom':
      return activity.recurrenceDays.includes(DAY_CODES[date.getDay()]);
    default:
      return false;
  }
}

/** Short badge text for ActivityRow/ActivityCard — "Daily", "Weekly", "Monthly", or the
 * selected days for 'custom' (e.g. "Mon/Wed/Fri"), null for 'none'. */
export function recurrenceBadgeLabel(activity: Activity): string | null {
  switch (activity.recurrenceType) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'custom':
      return activity.recurrenceDays.length > 0
        ? DAY_CODE_ORDER.filter((d) => activity.recurrenceDays.includes(d))
            .map((d) => DAY_CODE_LABELS[d])
            .join('/')
        : null;
    default:
      return null;
  }
}
