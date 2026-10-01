export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Local "YYYY-MM-DD" — the task's due date. */
  dueDate?: string;
  linkedActivityId?: string;
  tags: string[];
  createdAt: string;
  completedAt?: string;
}
