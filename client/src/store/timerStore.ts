import { create } from 'zustand';

import { DEFAULT_FOCUS_ACTIVITY } from '../mocks/mockActivities';
import { getApiErrorMessage } from '../services/api';
import { mapApiSession, sessionService } from '../services/session.service';
import { hasAuthToken, isGuestMode } from '../utils/authFlags';
import { useActivityStore } from './activityStore';
import { useLevelStore } from './levelStore';
import { showToast } from './toastStore';
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
  isLoading: boolean;
  error: string | null;

  /** GET /api/sessions scoped to today — replaces todaySessions/activityTotals with the
   * server's copy, enriching each row with icon/color from activityStore (time_logs has no
   * icon/color columns of its own; see session.service.ts's mapApiSession). */
  fetchTodaySessions: () => Promise<void>;
  clearError: () => void;
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
  /** Resets the live in-progress timer (elapsed seconds/activity/running state) — NOT
   * todaySessions history. See resetAccountData for that. */
  reset: () => void;
  tick: () => void;
  /** Wipes todaySessions/activityTotals — this store isn't zustand-persisted, but its
   * in-memory state can still leak across accounts within the same tab session (logout
   * then a different login, no page reload in between). Named distinctly from reset()
   * above since that resets the *live* timer, a different concept entirely. */
  resetAccountData: () => void;
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

  todaySessions: [],
  activityTotals: {},
  isLoading: false,
  error: null,

  fetchTodaySessions: async () => {
    // Guests have no backend account/JWT — todaySessions isn't persisted at all (see this
    // store's own doc comment), so there's genuinely nothing to fetch; whatever's already
    // in memory from this tab session is all there is.
    if (isGuestMode()) return;
    // No token yet — skip rather than 401 for a reason unrelated to the token itself. See
    // taskStore.ts's fetchTasks for the full rationale.
    if (!hasAuthToken()) return;

    set({ isLoading: true, error: null });
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const rows = await sessionService.list({ from, to });

      const activities = useActivityStore.getState().activities;
      const todaySessions: Session[] = rows.map((row) => {
        const partial = mapApiSession(row);
        const activity = activities.find((a) => a.id === partial.activityId);
        return { ...partial, icon: activity?.icon ?? 'Circle', color: activity?.color ?? '#14B8A6' };
      });

      set({ todaySessions, activityTotals: computeActivityTotals(todaySessions), isLoading: false });
    } catch (err) {
      set({ error: getApiErrorMessage(err), isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

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

    // Guests have no backend account/JWT — todaySessions above is the entire record for
    // them (in-memory only, cleared on reload), so there's nothing to sync and no point
    // attempting a request that would just 401.
    if (isGuestMode()) return;

    // Fire-and-forget persist (the spec's "saveSession"): the session is already shown
    // above from local state, so a slow/failed request doesn't block or undo the UI the
    // user just saw — it only surfaces as a toast, since the tracked time is real either way
    // even if this particular sync attempt didn't land.
    sessionService
      .create({
        activityId: session.activityId,
        activityName: session.activityLabel,
        durationSeconds: session.durationSeconds,
        notes: session.notes,
        tags: session.tags,
        startedAt: startDate.toISOString(),
        endedAt: endDate.toISOString(),
      })
      .then(({ xp }) => useLevelStore.getState().applyXpResult(xp))
      .catch((err) => {
        showToast(`Session tracked locally, but didn't sync: ${getApiErrorMessage(err)}`, 'error');
      });
  },

  reset: () => set({ ...initialSessionState }),

  tick: () => set((state) => (state.isRunning ? { seconds: state.seconds + 1 } : state)),

  resetAccountData: () =>
    set({ ...initialSessionState, todaySessions: [], activityTotals: {}, isLoading: false, error: null }),
}));
