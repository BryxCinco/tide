/** Shape of the `xp` field a mutation response carries whenever it triggered an XP award
 * (task completed, session logged, journal entry added, quest completed, streak milestone)
 * — mirrors server/lib/xpService.js's awardXp() return value exactly. */
export interface XpResult {
  totalXp: number;
  level: number;
  leveledUp: boolean;
  xpGained: number;
}
