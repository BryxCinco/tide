export interface Streak {
  currentStreak: number;
  longestStreak: number;
  /** Local "YYYY-MM-DD" of the last day every quest was completed, or null if never. */
  lastActivityDate: string | null;
}
