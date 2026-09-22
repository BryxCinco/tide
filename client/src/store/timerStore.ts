import { create } from 'zustand';

import { DEFAULT_FOCUS_ACTIVITY } from '../mocks/mockActivities';
import { mockTodaySessions } from '../mocks/mockTimer';
import type { Activity } from '../types/activity';
import type { Session } from '../types/timer';
import { formatClockTime } from '../utils/formatTime';

export type TimerMode = 'stopwatch' | 'countdown';

interface TimerState {
  currentActivity: Activity | null;
  selectedTags: string[];
  notes: string;
  seconds: number;
  isRunning: boolean;
  isPaused: boolean;
  startTime: string | null;

  /** Persists across start/stop (NOT reset by stop()/reset()) — it's a chosen mode/
   * duration preference, not per-session state. That's what lets the post-countdown
   * "Take a 5-minute break?" flow just call setCountdownDuration(300) + start() and get a
   * real second countdown, rather than the mode reverting to stopwatch after every session. */
  mode: TimerMode;
  /** Target duration in countdown mode, seconds. Null until the user picks one (see
   * DurationPicker.tsx) — `start()` refuses to start countdown mode without it. */
  countdownDurationSeconds: number | null;

  todaySessions: Session[];
  activityTotals: Record<string, number>;

  setActivity: (activity: Activity) => void;
  /** Idle-only — deselects back to no activity picked. Mid-session there's always a
   * logged-against activity (setActivity re-tags it instead; see its own comment). */
  clearActivity: () => void;
  toggleTag: (tag: string) => void;
  setNotes: (notes: string) => void;
  setMode: (mode: TimerMode) => void;
  setCountdownDuration: (seconds: number) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  /** Saves the current session (called after the confirmation modal, not on the raw Stop press). */
  stop: () => void;
  reset: () => void;
  tick: () => void;
}

function computeActivityTotals(sessions: Session[]): Record<string, number> {
  return sessions.reduce<Record<string, number>>((totals, session) => {
    totals[session.activityId] = (totals[session.activityId] ?? 0) + session.durationSeconds;
    return totals;
  }, {});
}

const initialSessionState = {
  currentActivity: null as Activity | null,
  selectedTags: [] as string[],
  notes: '',
  seconds: 0,
  isRunning: false,
  isPaused: false,
  startTime: null as string | null,
};

export const useTimerStore = create<TimerState>()((set, get) => ({
  ...initialSessionState,
  mode: 'stopwatch',
  countdownDurationSeconds: null,

  todaySessions: mockTodaySessions,
  activityTotals: computeActivityTotals(mockTodaySessions),

  setActivity: (activity) => {
    // Allowed mid-session too (Fix 3: "change activity after starting") — the confirmation
    // warning that this re-tags already-logged time lives at the UI layer (timer.tsx),
    // since the store has no concept of "ask the user first".
    set({ currentActivity: activity });
  },

  clearActivity: () => {
    if (get().isRunning || get().isPaused) return;
    set({ currentActivity: null });
  },

  toggleTag: (tag) => {
    set((state) => ({
      selectedTags: state.selectedTags.includes(tag)
        ? state.selectedTags.filter((t) => t !== tag)
        : [...state.selectedTags, tag],
    }));
  },

  setNotes: (notes) => set({ notes }),

  setMode: (mode) => {
    if (get().isRunning || get().isPaused) return;
    set({ mode });
  },

  setCountdownDuration: (seconds) => set({ countdownDurationSeconds: seconds }),

  start: () => {
    // Countdown mode needs a target duration picked first (DurationPicker.tsx) — refusing
    // silently here mirrors the old "no activity, no start" guard this replaced in Fix 3,
    // just for the one precondition that's still genuinely required.
    if (get().mode === 'countdown' && !get().countdownDurationSeconds) return;
    // No activity picked yet -> defaults to the generic Focus Session rather than
    // refusing to start (Fix 3). It's a real Activity, so everything downstream (Today's
    // Sessions, Activity Breakdown, Insights) treats it exactly like any other.
    const activity = get().currentActivity ?? DEFAULT_FOCUS_ACTIVITY;
    set({ currentActivity: activity, isRunning: true, isPaused: false, seconds: 0, startTime: new Date().toISOString() });
  },

  pause: () => {
    if (!get().isRunning) return;
    set({ isRunning: false, isPaused: true });
  },

  resume: () => {
    // Deliberately does not touch `startTime` or `seconds` — startTime stays pinned to
    // the session's true beginning (used for the saved log's displayed time range), and
    // seconds keeps accumulating from where it left off rather than restarting.
    if (!get().isPaused) return;
    set({ isRunning: true, isPaused: false });
  },

  stop: () => {
    const { currentActivity, seconds, startTime, selectedTags, notes, todaySessions, activityTotals } = get();
    if (!currentActivity) return;

    const endDate = new Date();
    const startDate = startTime ? new Date(startTime) : endDate;

    const session: Session = {
      id: `session_${Date.now()}`,
      activityId: currentActivity.id,
      activityLabel: currentActivity.name,
      icon: currentActivity.icon,
      color: currentActivity.color,
      startTime: formatClockTime(startDate),
      endTime: formatClockTime(endDate),
      durationSeconds: seconds,
      tags: selectedTags,
      notes: notes.trim() || undefined,
    };

    set({
      todaySessions: [session, ...todaySessions],
      activityTotals: {
        ...activityTotals,
        [session.activityId]: (activityTotals[session.activityId] ?? 0) + seconds,
      },
      ...initialSessionState,
    });
  },

  reset: () => set({ ...initialSessionState }),

  tick: () => set((state) => (state.isRunning ? { seconds: state.seconds + 1 } : state)),
}));
