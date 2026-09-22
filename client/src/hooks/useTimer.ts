import { useEffect } from 'react';

import { useTimerStore } from '../store/timerStore';

/**
 * Owns the ticking interval — call this exactly ONCE, at the timer screen's root.
 * Mounting it more than once would run multiple intervals, each calling `tick()`,
 * making the clock count faster than real time. Child components should receive
 * the values they need as props from that single call site rather than calling
 * this hook themselves.
 */
export function useTimer() {
  const currentActivity = useTimerStore((s) => s.currentActivity);
  const selectedTags = useTimerStore((s) => s.selectedTags);
  const notes = useTimerStore((s) => s.notes);
  const seconds = useTimerStore((s) => s.seconds);
  const isRunning = useTimerStore((s) => s.isRunning);
  const isPaused = useTimerStore((s) => s.isPaused);
  const mode = useTimerStore((s) => s.mode);
  const countdownDurationSeconds = useTimerStore((s) => s.countdownDurationSeconds);
  const todaySessions = useTimerStore((s) => s.todaySessions);
  const activityTotals = useTimerStore((s) => s.activityTotals);

  const setActivity = useTimerStore((s) => s.setActivity);
  const clearActivity = useTimerStore((s) => s.clearActivity);
  const toggleTag = useTimerStore((s) => s.toggleTag);
  const setNotes = useTimerStore((s) => s.setNotes);
  const setMode = useTimerStore((s) => s.setMode);
  const setCountdownDuration = useTimerStore((s) => s.setCountdownDuration);
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const stop = useTimerStore((s) => s.stop);
  const reset = useTimerStore((s) => s.reset);
  const tick = useTimerStore((s) => s.tick);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, tick]);

  const secondsRemaining = mode === 'countdown' && countdownDurationSeconds != null ? Math.max(0, countdownDurationSeconds - seconds) : null;

  return {
    currentActivity,
    selectedTags,
    notes,
    seconds,
    isRunning,
    isPaused,
    mode,
    countdownDurationSeconds,
    secondsRemaining,
    todaySessions,
    activityTotals,
    setActivity,
    clearActivity,
    toggleTag,
    setNotes,
    setMode,
    setCountdownDuration,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
