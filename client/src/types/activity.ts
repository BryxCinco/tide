export type ActivityCategory = 'predefined' | 'custom';

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
}
