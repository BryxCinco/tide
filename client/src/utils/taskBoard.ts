import type { Task, TaskPriority, TaskStatus } from '../types/task';

/**
 * Pure helpers behind the Tasks Board/Table views (unit-tested with `node --test`, so no
 * theme imports — the two ocean hex values are copied from utils/theme.ts).
 */
export const BOARD_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo', label: 'To do', color: '#94A3B8' },
  { status: 'in-progress', label: 'In progress', color: '#A78BFA' }, // ocean.lavender
  { status: 'done', label: 'Done', color: '#14B8A6' }, // ocean.lagoon
];

export function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = { todo: [], 'in-progress': [], done: [] };
  for (const task of tasks) groups[task.status].push(task);
  return groups;
}

/** Done tasks are locked in taskStore (no un-checking, no edits) — only delete is allowed. */
export function canMoveTask(task: Task): boolean {
  return task.status !== 'done';
}

export type TableSortKey = 'title' | 'status' | 'priority' | 'dueDate';

const PRIORITY_RANK: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_RANK: Record<TaskStatus, number> = { todo: 0, 'in-progress': 1, done: 2 };

/** Returns a new array. Tasks without a due date always sort last. */
export function sortTasks(tasks: Task[], key: TableSortKey, dir: 'asc' | 'desc'): Task[] {
  const sign = dir === 'asc' ? 1 : -1;
  return tasks.slice().sort((a, b) => {
    if (key === 'dueDate') {
      if (!a.dueDate || !b.dueDate) return (a.dueDate ? 0 : 1) - (b.dueDate ? 0 : 1);
      return sign * a.dueDate.localeCompare(b.dueDate);
    }
    if (key === 'priority') return sign * (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    if (key === 'status') return sign * (STATUS_RANK[a.status] - STATUS_RANK[b.status]);
    return sign * a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  });
}
