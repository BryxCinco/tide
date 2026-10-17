export interface Streak {
  currentStreak: number;
  longestStreak: number;
  /** Local "YYYY-MM-DD" of the last day every quest was completed, or null if never. */
  lastActivityDate: string | null;
  /** Separate from the quest streak above — advances on completing at least one Task
   * (regular to-do, not Tide's Quest) per day. Reads as 0 once a day is skipped, rather
   * than freezing at its last value (see server/routes/streaks.js). */
  taskCurrentStreak: number;
  taskLongestStreak: number;
  taskLastCompletedDate: string | null;
}
