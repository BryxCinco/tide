import type { Task, TaskPriority, TaskStatus } from '../types/task';
import { api } from './api';

export interface ApiTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  activity_type: string | null;
  due_date: string | null;
  due_date_start: string | null;
  due_date_end: string | null;
  completed_at: string | null;
  is_withdrawn: boolean;
  tags: string[] | null;
  created_at: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  dueDateStart?: string;
  dueDateEnd?: string;
  linkedActivityId?: string;
  tags: string[];
}

export type UpdateTaskPayload = Partial<Omit<Task, 'id' | 'createdAt' | 'completedAt' | 'dueDateStart' | 'dueDateEnd'>> & {
  /** `null` explicitly clears completed_at server-side (e.g. un-completing a task) — plain
   * `undefined` leaves it alone so the server's own status-based auto-set logic applies. */
  completedAt?: string | null;
  /** Same `null`-clears/`undefined`-leaves-alone distinction as completedAt — needed when
   * TaskFormModal switches a task from "Date Range" back to "Single Date" and has to
   * actually clear the two range columns server-side, not just stop sending them (a plain
   * `undefined` field is dropped by JSON.stringify, so the old range would silently survive
   * the PATCH untouched). */
  dueDateStart?: string | null;
  dueDateEnd?: string | null;
};

/**
 * The `tasks` table only has an `activity_type TEXT` column, not a foreign key to
 * `activities` — but the client's Activity Type selector (TaskFormModal) picks a real
 * Activity and stores its id as `linkedActivityId`. Rather than a schema migration for this
 * pass, that id is stored straight into `activity_type` as-is; the client already resolves
 * the display name locally via `activities.find(a => a.id === task.linkedActivityId)`
 * (see app/tasks.tsx), so round-tripping the id through that column works without changes
 * on the server.
 */
function mapApiTask(row: ApiTask): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    // due_date comes back as a full TIMESTAMPTZ ("2026-09-25T00:00:00+00:00"); the client
    // only ever stores/displays the plain "YYYY-MM-DD" key (see TaskCard's raw
    // `{task.dueDate}` render), so just take the date portion.
    dueDate: row.due_date ? row.due_date.slice(0, 10) : undefined,
    dueDateStart: row.due_date_start ? row.due_date_start.slice(0, 10) : undefined,
    dueDateEnd: row.due_date_end ? row.due_date_end.slice(0, 10) : undefined,
    linkedActivityId: row.activity_type ?? undefined,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
  };
}

export const taskService = {
  async list(): Promise<Task[]> {
    const { data } = await api.get<{ tasks: ApiTask[] }>('/api/tasks');
    return data.tasks.map(mapApiTask);
  },

  async create(payload: CreateTaskPayload): Promise<Task> {
    const { data } = await api.post<{ task: ApiTask }>('/api/tasks', {
      title: payload.title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority,
      activity_type: payload.linkedActivityId,
      due_date: payload.dueDate,
      due_date_start: payload.dueDateStart,
      due_date_end: payload.dueDateEnd,
      tags: payload.tags,
    });
    return mapApiTask(data.task);
  },

  async update(id: string, payload: UpdateTaskPayload): Promise<Task> {
    const { data } = await api.patch<{ task: ApiTask }>(`/api/tasks/${id}`, {
      title: payload.title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority,
      activity_type: payload.linkedActivityId,
      due_date: payload.dueDate,
      due_date_start: payload.dueDateStart,
      due_date_end: payload.dueDateEnd,
      tags: payload.tags,
      completed_at: payload.completedAt,
    });
    return mapApiTask(data.task);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/tasks/${id}`);
  },
};
