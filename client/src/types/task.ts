export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  /** Free-text date, e.g. "2026-09-25" — no native date picker in this phase (see taskStore notes). */
  dueDate?: string;
  linkedActivityId?: string;
  tags: string[];
  createdAt: string;
  completedAt?: string;
}
