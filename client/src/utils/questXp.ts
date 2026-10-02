import type { QuestTier } from '../types/quest';

// Mirrors server/lib/questXp.js — hand-duplicated the same way xp.ts/xpService.js already
// are. Used client-side only for QuestFormModal's live XP preview; the actual awarded amount
// always comes from the server at completion time.
const BASE_XP_BY_TIER: Record<QuestTier, number> = { 1: 15, 2: 35, 3: 75, 4: 150, 5: 350 };

export type QuestDifficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_MODIFIER: Record<QuestDifficulty, number> = {
  easy: 0.8,
  normal: 1.0,
  hard: 1.2,
};

export function computeQuestXp(tier: QuestTier, difficulty: number = 1.0, streakDays: number = 0, diversityBonus: boolean = false): number {
  const base = BASE_XP_BY_TIER[tier] ?? BASE_XP_BY_TIER[1];
  const difficultyMod = Math.min(1.2, Math.max(0.8, difficulty));
  const streakBonus = Math.min(0.5, Math.max(0, streakDays) * 0.1);
  const diversityMod = diversityBonus ? 1.2 : 1;
  return Math.round(base * difficultyMod * (1 + streakBonus) * diversityMod);
}
