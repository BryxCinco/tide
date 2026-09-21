export interface Session {
  id: string;
  activityId: string;
  activityLabel: string;
  /** Snapshotted from the Activity at completion time — stays correct even if the
   * source activity is later edited or deleted. */
  icon: string;
  color: string;
  /** Formatted for display, e.g. "9:00 AM" — not a sortable/parseable timestamp. */
  startTime: string;
  endTime: string;
  durationSeconds: number;
  tags: string[];
  notes?: string;
}
