import { create } from 'zustand';

import { mockTodaySessions } from '../mocks/mockTimer';
import type { Activity } from '../types/activity';
import type { Session } from '../types/timer';
import { formatClockTime } from '../utils/formatTime';

interface TimerState {
  currentActivity: Activity | null;
  selectedTags: string[];
  notes: string;
  seconds: number;
  isRunning: boolean;
  isPaused: boolean;
  startTime: string | null;

  todaySessions: Session[];
  activityTotals: Record<string, number>;

  setActivity: (activity: Activity) => void;
  toggleTag: (tag: string) => void;
  setNotes: (notes: string) => void;
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

  todaySessions: mockTodaySessions,
  activityTotals: computeActivityTotals(mockTodaySessions),

  setActivity: (activity) => {
    // Locked once a session has begun — mirrors ActivityPicker's own disabled state
    // as a safety net in case something calls this directly.
    if (get().isRunning || get().isPaused) return;
    set({ currentActivity: activity });
  },

  toggleTag: (tag) => {
    set((state) => ({
      selectedTags: state.selectedTags.includes(tag)
        ? state.selectedTags.filter((t) => t !== tag)
        : [...state.selectedTags, tag],
    }));
  },

  setNotes: (notes) => set({ notes }),

  start: () => {
    if (!get().currentActivity) return;
    set({ isRunning: true, isPaused: false, seconds: 0, startTime: new Date().toISOString() });
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
