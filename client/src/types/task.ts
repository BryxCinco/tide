export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Local "YYYY-MM-DD" — the single due date, or (for a range task) an alias of
   * dueDateStart kept in sync so existing date-based sort/filter logic that only knows this
   * one field still works (see taskStore.getVisibleTasks). */
  dueDate?: string;
  /** Range start/end, both local "YYYY-MM-DD" — present together, or not at all. When set,
   * TaskCard/TaskFormModal show a range ("Oct 21 - Oct 27") instead of a single due date. */
  dueDateStart?: string;
  dueDateEnd?: string;
  linkedActivityId?: string;
  tags: string[];
  createdAt: string;
  completedAt?: string;
}
