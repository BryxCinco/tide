import type { TaskPriority } from '../types/task';

export const XP_REWARDS = {
  JOURNAL_ENTRY: 15,
  COMPLETE_QUEST: 25,
  WEEKLY_STREAK_BONUS: 100,
  PER_MINUTE_SESSION: 1,
} as const;

export const TASK_COMPLETE_XP: Record<TaskPriority, number> = {
  low: 10,
  medium: 20,
  high: 30,
  critical: 50,
};

/** Inverse of xpForLevel — level N starts at (N-1)^2 * 100 XP, so this just inverts that
 * quadratic. Mirrored exactly in server/lib/xpService.js (no shared package between the two
 * projects, so kept in lockstep by hand — see that file's comment). */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

/** XP required to REACH this level (i.e. the floor of its range). Level 1 starts at 0. */
export function xpForLevel(level: number): number {
  return (level - 1) ** 2 * 100;
}

/** 0-100 — how far through the current level's XP range `xp` sits. */
export function progressToNextLevel(xp: number): number {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  if (ceiling === floor) return 100;
  return Math.max(0, Math.min(100, Math.round(((xp - floor) / (ceiling - floor)) * 100)));
}
