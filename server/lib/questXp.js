// Mirrors client/src/utils/questXp.ts — hand-duplicated the same way xp.ts/xpService.js
// already are (no shared package between the two projects). This copy is the authoritative
// one: the actual XP awarded on completion always comes from here, never from whatever the
// client displayed as a preview.
const BASE_XP_BY_TIER = { 1: 15, 2: 35, 3: 75, 4: 150, 5: 350 };

const QUEST_TIER_META = {
  1: { name: 'Common', color: '#9CA3AF', xpRange: '10-25' },
  2: { name: 'Uncommon', color: '#10B981', xpRange: '25-50' },
  3: { name: 'Rare', color: '#0EA5E9', xpRange: '50-100' },
  4: { name: 'Epic', color: '#8B5CF6', xpRange: '100-200' },
  5: { name: 'Legendary', color: '#F97316', xpRange: '200-500' },
};

/**
 * `difficulty` 0.8-1.2 (clamped), `streakDays` the user's CURRENT quest streak at the moment
 * of completion (not the quest's own data) — both only meaningful at completion time, which
 * is why this isn't baked into the quest row once and forgotten. `diversityBonus` is `true`
 * when completing this quest brings today's distinct quest categories to 3+.
 */
function computeQuestXp(tier, difficulty = 1.0, streakDays = 0, diversityBonus = false) {
  const base = BASE_XP_BY_TIER[tier] || BASE_XP_BY_TIER[1];
  const difficultyMod = Math.min(1.2, Math.max(0.8, difficulty));
  const streakBonus = Math.min(0.5, Math.max(0, streakDays) * 0.1);
  const diversityMod = diversityBonus ? 1.2 : 1;
  return Math.round(base * difficultyMod * (1 + streakBonus) * diversityMod);
}

function questTierMeta(tier) {
  return QUEST_TIER_META[tier] || QUEST_TIER_META[1];
}

/**
 * Applied at completion time on top of a quest's already-stored `xp` (which already baked
 * in tier + difficulty at creation time via computeQuestXp) — streakDays/diversityBonus are
 * only known once, at the moment the quest is actually completed, so they can't be baked in
 * any earlier than this.
 */
function applyCompletionBonus(baseXp, streakDays = 0, diversityBonus = false) {
  const streakBonus = Math.min(0.5, Math.max(0, streakDays) * 0.1);
  const diversityMod = diversityBonus ? 1.2 : 1;
  return Math.round(baseXp * (1 + streakBonus) * diversityMod);
}

module.exports = { computeQuestXp, applyCompletionBonus, questTierMeta, BASE_XP_BY_TIER, QUEST_TIER_META };
