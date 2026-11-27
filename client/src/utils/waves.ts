/** Client mirror of server/lib/waves.js's level thresholds (pure; unit-tested). */
export type WaveLevelName = 'low' | 'mid' | 'high' | 'tsunami';

export function waveLevel(score: number): WaveLevelName {
  if (score >= 80) return 'tsunami';
  if (score >= 50) return 'high';
  if (score >= 25) return 'mid';
  return 'low';
}

/** The week's overall tide: the mean score, rounded, and its level. */
export function averageLevel(days: { score: number }[]): { score: number; level: WaveLevelName } {
  if (days.length === 0) return { score: 0, level: 'low' };
  const score = Math.round(days.reduce((sum, d) => sum + d.score, 0) / days.length);
  return { score, level: waveLevel(score) };
}
