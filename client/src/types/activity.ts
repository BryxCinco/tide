export type ActivityCategory = 'predefined' | 'custom';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

/** Mon-first 3-letter day codes, for `recurrenceType: 'custom'` — matches the format stored
 * in Postgres's recurrence_days TEXT[] column. */
export type DayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface Activity {
  id: string;
  name: string;
  /** Lucide icon name, as a plain string since custom activities pick from a runtime list. */
  icon: string;
  /** Hex color, e.g. "#14B8A6" — arbitrary per-activity, not one of the fixed brand tints. */
  color: string;
  category: ActivityCategory;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  /** Computed from session history, not stored/mutated directly — see activityStore. */
  totalTimeSpent?: number;
  /** 'none' = one-time/not scheduled. 'weekly' recurs on startDate's weekday; 'monthly' on
   * startDate's day-of-month; 'custom' uses recurrenceDays. See utils/activityRecurrence.ts. */
  recurrenceType: RecurrenceType;
  recurrenceDays: DayCode[];
  /** Local "YYYY-MM-DD" date keys — see utils/formatDate.ts's toDateKey. */
  startDate: string;
  endDate: string | null;
}
