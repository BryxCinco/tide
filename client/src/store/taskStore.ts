import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getApiErrorMessage } from '../services/api';
import { taskService, type UpdateTaskPayload } from '../services/task.service';
import type { Task, TaskPriority, TaskStatus } from '../types/task';
import { hasAuthToken, isGuestMode } from '../utils/authFlags';
import { toDateKey } from '../utils/formatDate';
import { storage } from '../utils/storage';
import { useLevelStore } from './levelStore';
import { showToast } from './toastStore';

export type TaskFilter = 'all' | 'today' | 'done' | 'overdue';
export type TaskSort = 'priority' | 'dueDate' | 'created';

interface TaskState {
  tasks: Task[];
  filter: TaskFilter;
  sort: TaskSort;
  isLoading: boolean;
  error: string | null;
  /**
   * Count only, not a per-task `withdrawn` flag on Task itself — `deleteTask` really
   * removes the row (Fix 1's visible delete button relies on that: tap trash, it's gone,
   * everywhere, immediately), so there's no live Task record left to carry a flag on.
   * This increments right before that removal, whenever the task being deleted wasn't
   * already done — enough for Insights' "Tasks Withdrawn" stat without turning delete into
   * a soft-delete/undelete system. Local-only stat, not synced to the backend's
   * (currently unused) `is_withdrawn` column.
   */
  withdrawnCount: number;

  fetchTasks: () => Promise<void>;
  addTask: (input: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
    linkedActivityId?: string;
    tags: string[];
  }) => Task;
  // UpdateTaskPayload (not a plain Partial<Task>) so callers can pass `null` for
  // completedAt to explicitly clear it server-side — see task.service.ts's comment on why
  // `undefined` alone can't do that.
  updateTask: (id: string, updates: UpdateTaskPayload) => void;
  deleteTask: (id: string) => void;
  /** Binary done/not-done toggle for the checkbox — the 3-way status (incl. "in-progress")
   * is only settable deliberately, via updateTask from the edit modal's status selector. */
  toggleTaskStatus: (id: string) => void;
  setFilter: (filter: TaskFilter) => void;
  setSort: (sort: TaskSort) => void;
  clearError: () => void;
  /** Wipes local state back to empty — called from authStore on logout and before a fresh
   * login/register, since this store persists to a single, non-user-scoped storage key
   * ('tide_tasks'). Without this, switching accounts on the same browser/device would
   * silently inherit whatever the previous session left behind. */
  reset: () => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      filter: 'all',
      sort: 'priority',
      isLoading: false,
      error: null,
      withdrawnCount: 0,

      fetchTasks: async () => {
        // Guests have no backend account/JWT — this store persists to
        // localStorage/SecureStore regardless of account type, so whatever's already
        // loaded there is already correct; there's nothing to fetch.
        if (isGuestMode()) return;
        // No token yet (e.g. this fetch fired from a mount effect a tick ahead of sign-in
        // actually completing) — skip rather than 401 for a reason that has nothing to do
        // with the token itself being invalid. Whatever triggers a re-render once the token
        // shows up (auth-gated screens only mount post-isAuthenticated) re-fires this.
        if (!hasAuthToken()) return;

        set({ isLoading: true, error: null });
        try {
          const tasks = await taskService.list();
          set({ tasks, isLoading: false });
        } catch (err) {
          set({ error: getApiErrorMessage(err), isLoading: false });
        }
      },

      // Optimistic: the new task renders instantly under a temp id while the POST is still
      // in flight, then gets swapped in-place for the server's real row on success. Nothing
      // downstream captures the return value synchronously (unlike activityStore.addActivity),
      // so a brief temp id is safe here.
      addTask: (input) => {
        const tempId = `task_${Date.now()}`;
        const task: Task = { id: tempId, createdAt: new Date().toISOString(), ...input };
        set((state) => ({ tasks: [task, ...state.tasks] }));

        if (isGuestMode()) return task;

        taskService.create(input).then(
          (created) => set((state) => ({ tasks: state.tasks.map((t) => (t.id === tempId ? created : t)) })),
          (err) => {
            set((state) => ({ tasks: state.tasks.filter((t) => t.id !== tempId) }));
            showToast(getApiErrorMessage(err), 'error');
          },
        );

        return task;
      },

      updateTask: (id, updates) => {
        const previous = get().tasks;
        // `updates` may carry explicit `null` (to clear completedAt server-side — see
        // UpdateTaskPayload's comment), but Task's own fields are `string | undefined`, never
        // `null` — normalize before merging into local state.
        const { completedAt, ...rest } = updates;
        const localPatch = {
          ...rest,
          ...(completedAt !== undefined ? { completedAt: completedAt ?? undefined } : {}),
        };
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...localPatch } : t)),
        }));
        if (isGuestMode()) return;
        taskService
          .update(id, updates)
          .then(({ xp }) => useLevelStore.getState().applyXpResult(xp))
          .catch((err) => {
            set({ tasks: previous });
            showToast(getApiErrorMessage(err), 'error');
          });
      },

      deleteTask: (id) => {
        const previous = get().tasks;
        const task = previous.find((t) => t.id === id);
        const wasWithdrawn = task != null && task.status !== 'done';

        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          withdrawnCount: wasWithdrawn ? state.withdrawnCount + 1 : state.withdrawnCount,
        }));
        if (isGuestMode()) return;
        taskService.remove(id).catch((err) => {
          set((state) => ({ tasks: previous, withdrawnCount: wasWithdrawn ? state.withdrawnCount - 1 : state.withdrawnCount }));
          showToast(getApiErrorMessage(err), 'error');
        });
      },

      toggleTaskStatus: (id) => {
        const previous = get().tasks;
        const task = previous.find((t) => t.id === id);
        if (!task) return;

        const done = task.status === 'done';
        const nextStatus: TaskStatus = done ? 'todo' : 'done';
        const completedAt = done ? undefined : new Date().toISOString();

        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, status: nextStatus, completedAt } : t)),
        }));
        if (isGuestMode()) return;
        taskService
          .update(id, { status: nextStatus, completedAt: completedAt ?? null })
          .then(({ xp }) => useLevelStore.getState().applyXpResult(xp))
          .catch((err) => {
            set({ tasks: previous });
            showToast(getApiErrorMessage(err), 'error');
          });
      },

      setFilter: (filter) => set({ filter }),
      setSort: (sort) => set({ sort }),
      clearError: () => set({ error: null }),
      reset: () => set({ tasks: [], withdrawnCount: 0, filter: 'all', sort: 'priority', isLoading: false, error: null }),
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

/** Past-due and not yet done — drives TaskCard's red "Overdue" badge/border, the Overdue
 * filter, and the header/dashboard counts. Compares local date keys, not timestamps, so a
 * task due "today" is never overdue purely from time-of-day. */
export function isTaskOverdue(task: Task): boolean {
  if (task.status === 'done' || !task.dueDate) return false;
  return task.dueDate < toDateKey(new Date());
}

/** Due today and not yet done — the amber "Due today" badge. Mutually exclusive with
 * isTaskOverdue by construction (today is never < today). */
export function isTaskDueToday(task: Task): boolean {
  if (task.status === 'done' || !task.dueDate) return false;
  return task.dueDate === toDateKey(new Date());
}

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
    if (filter === 'overdue') return isTaskOverdue(task);
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
