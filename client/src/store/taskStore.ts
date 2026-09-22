import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Task, TaskPriority, TaskStatus } from '../types/task';
import { storage } from '../utils/storage';

export type TaskFilter = 'all' | 'today' | 'done';
export type TaskSort = 'priority' | 'dueDate' | 'created';

interface TaskState {
  tasks: Task[];
  filter: TaskFilter;
  sort: TaskSort;
  /**
   * Count only, not a per-task `withdrawn` flag on Task itself — `deleteTask` really
   * removes the row (Fix 1's visible delete button relies on that: tap trash, it's gone,
   * everywhere, immediately), so there's no live Task record left to carry a flag on.
   * This increments right before that removal, whenever the task being deleted wasn't
   * already done — enough for Insights' "Tasks Withdrawn" stat without turning delete into
   * a soft-delete/undelete system.
   */
  withdrawnCount: number;

  addTask: (input: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
    linkedActivityId?: string;
    tags: string[];
  }) => Task;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  deleteTask: (id: string) => void;
  /** Binary done/not-done toggle for the checkbox — the 3-way status (incl. "in-progress")
   * is only settable deliberately, via updateTask from the edit modal's status selector. */
  toggleTaskStatus: (id: string) => void;
  setFilter: (filter: TaskFilter) => void;
  setSort: (sort: TaskSort) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
      tasks: [],
      filter: 'all',
      sort: 'priority',
      withdrawnCount: 0,

      addTask: (input) => {
        const task: Task = {
          id: `task_${Date.now()}`,
          createdAt: new Date().toISOString(),
          ...input,
        };
        set((state) => ({ tasks: [task, ...state.tasks] }));
        return task;
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
      },

      deleteTask: (id) => {
        set((state) => {
          const task = state.tasks.find((t) => t.id === id);
          const wasWithdrawn = task != null && task.status !== 'done';
          return {
            tasks: state.tasks.filter((t) => t.id !== id),
            withdrawnCount: wasWithdrawn ? state.withdrawnCount + 1 : state.withdrawnCount,
          };
        });
      },

      toggleTaskStatus: (id) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;
            const done = t.status === 'done';
            return { ...t, status: done ? 'todo' : 'done', completedAt: done ? undefined : new Date().toISOString() };
          }),
        }));
      },

      setFilter: (filter) => set({ filter }),
      setSort: (sort) => set({ sort }),
    }),
    {
      name: 'tide_tasks',
      storage: createJSONStorage(() => storage),
      // Filter/sort are view state, not data — persisting them would make the screen
      // "remember" a stale view instead of defaulting to All/Priority each session.
      partialize: (state) => ({ tasks: state.tasks, withdrawnCount: state.withdrawnCount }),
    },
  ),
);

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function isToday(dateIso: string): boolean {
  const d = new Date(dateIso);
  const now = new Date();
  return (
    !Number.isNaN(d.getTime()) &&
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Shared by app/tasks.tsx and the Dashboard's Today's Tasks widget. */
export function getVisibleTasks(tasks: Task[], filter: TaskFilter, sort: TaskSort): Task[] {
  const filtered = tasks.filter((task) => {
    if (filter === 'done') return task.status === 'done';
    if (filter === 'today') return isToday(task.createdAt) || (task.dueDate ? isToday(task.dueDate) : false);
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (sort === 'priority') return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (sort === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    }
    return b.createdAt.localeCompare(a.createdAt);
  });
}
