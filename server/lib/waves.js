// Wave Stats: how big a day's "wave" was, from everything the user did that day.
// Weights (out of 100): focus 40 (full at 120 min), tasks 20 (full at 5), quests 20 (full at
// 3), journal 10 (full at 1 entry), distinct activities 10 (full at 3). Mirrored on the
// client in client/src/utils/waves.ts (WAVE thresholds only).

const WEIGHTS = [
  { key: 'focusSeconds', weight: 40, full: 120 * 60 },
  { key: 'tasks', weight: 20, full: 5 },
  { key: 'quests', weight: 20, full: 3 },
  { key: 'journal', weight: 10, full: 1 },
  { key: 'activities', weight: 10, full: 3 },
];

function scoreDay(day) {
  const raw = WEIGHTS.reduce((sum, { key, weight, full }) => sum + weight * Math.min(1, Math.max(0, day[key] || 0) / full), 0);
  return Math.round(raw);
}

/** low 0–24 · mid 25–49 · high 50–79 · tsunami 80–100 */
function waveLevel(score) {
  if (score >= 80) return 'tsunami';
  if (score >= 50) return 'high';
  if (score >= 25) return 'mid';
  return 'low';
}

module.exports = { scoreDay, waveLevel, WEIGHTS };
