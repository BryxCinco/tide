import type {
  ActivityBreakdownSlice,
  DayTimeEntry,
  HeatmapDay,
  InsightsData,
  MoodTrendPoint,
  ProductivityScoreBreakdown,
  WeeklySummaryItem,
} from '../types/insights';
import type { Mood } from '../types/journal';

/** Fixed chart palette — donut/heatmap colors are NOT the same as per-activity custom
 * colors (activityStore), since a user's custom activities could clash or repeat; a
 * small fixed palette keeps the legend readable regardless of how many activities exist. */
const CHART_COLORS = {
  teal: '#14B8A6',
  oceanBlue: '#0EA5E9',
  purple: '#8B5CF6',
  orange: '#F59E0B',
  pink: '#EC4899',
  gray: '#9CA3AF',
} as const;

const MOOD_SCORE: Record<Mood, number> = { terrible: 1, bad: 2, okay: 3, good: 4, great: 5 };
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Monday-first index for a JS Date (which is Sunday-first, 0-6). */
function mondayFirstIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

// Deterministic (not Math.random — stable across reloads/hot-refresh) but still varied,
// via a simple repeating pattern seeded by day offset. Good enough for mock data; a real
// backend (Phase 10) replaces this wholesale.
const WEEK_HOURS_PATTERN = [3.2, 4.4, 2.8, 4.2, 3.6, 1.4, 0.8]; // Mon..Sun, most-recent-first below
const MOOD_PATTERN: Mood[] = ['good', 'great', 'okay', 'good', 'good', 'bad', 'okay'];

/**
 * Generalized replacement for the old separate buildWeeklyTime()/buildMonthlyTime() — Fix
 * 4 needs arbitrary-length ranges (today/week/month/year/all/custom), not just those two
 * fixed windows, so this takes a day count instead. `days <= 7` keeps the old weekday-label
 * behavior (bars read left-to-right ending on "today"); longer ranges label by day-of-month,
 * same as the old monthly builder.
 */
function buildTimeSeries(days: number): DayTimeEntry[] {
  return Array.from({ length: days }, (_, i) => {
    const date = daysAgo(days - 1 - i);
    const weekdayFactor = WEEK_HOURS_PATTERN[mondayFirstIndex(date)];
    // Gentle wave on top of the weekday pattern so longer ranges aren't flat-repeating,
    // still deterministic (not Math.random) so it's stable across reloads/hot-refresh.
    const wave = days <= 7 ? 1 : 1 + 0.15 * Math.sin(i / 3);
    return {
      label: days <= 7 ? WEEKDAY_LABELS[mondayFirstIndex(date)] : String(date.getDate()),
      date: isoDate(date),
      seconds: Math.round(weekdayFactor * wave * 3600),
    };
  });
}

function buildMoodTrend(days: number): MoodTrendPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const date = daysAgo(days - 1 - i);
    // Not every day has a journal entry — every 4th day (deterministically) has none,
    // so the line legitimately gaps rather than always being fully populated.
    const hasEntry = i % 4 !== 3;
    const mood = hasEntry ? MOOD_PATTERN[i % MOOD_PATTERN.length] : null;
    return {
      label: days === 7 ? WEEKDAY_LABELS[mondayFirstIndex(date)] : String(date.getDate()),
      date: isoDate(date),
      score: mood ? MOOD_SCORE[mood] : null,
      mood,
    };
  });
}

const activityBreakdown: ActivityBreakdownSlice[] = [
  { id: 'deep-work', label: 'Deep Work', seconds: 8 * 3600 + 20 * 60, color: CHART_COLORS.teal, trendPercent: 14, lastSessionDate: isoDate(daysAgo(0)) },
  { id: 'meetings', label: 'Meetings', seconds: 3 * 3600 + 10 * 60, color: CHART_COLORS.oceanBlue, trendPercent: -6, lastSessionDate: isoDate(daysAgo(1)) },
  { id: 'learning', label: 'Learning', seconds: 2 * 3600 + 40 * 60, color: CHART_COLORS.purple, trendPercent: 22, lastSessionDate: isoDate(daysAgo(0)) },
  { id: 'exercise', label: 'Exercise', seconds: 1 * 3600 + 50 * 60, color: CHART_COLORS.orange, trendPercent: 5, lastSessionDate: isoDate(daysAgo(2)) },
  { id: 'journaling', label: 'Journaling', seconds: 45 * 60, color: CHART_COLORS.pink, trendPercent: -18, lastSessionDate: isoDate(daysAgo(3)) },
  { id: 'other', label: 'Other', seconds: 1 * 3600 + 15 * 60, color: CHART_COLORS.gray, trendPercent: 0, lastSessionDate: isoDate(daysAgo(4)) },
];

const productivityScore: ProductivityScoreBreakdown = {
  overall: 78,
  consistency: 82,
  focusTime: 74,
  taskCompletion: 80,
};

const weeklySummary: WeeklySummaryItem[] = [
  { id: 'total-hours', label: 'Total Tracked', value: '20h 24m', icon: 'Clock', tint: 'teal' },
  { id: 'best-day', label: 'Most Productive Day', value: 'Tuesday', icon: 'TrendingUp', tint: 'blue' },
  { id: 'common-mood', label: 'Most Common Mood', value: 'Good', icon: 'Smile', tint: 'purple' },
  { id: 'top-activity', label: 'Top Activity', value: 'Deep Work', icon: 'Brain', tint: 'teal' },
  { id: 'task-rate', label: 'Task Completion', value: '73%', icon: 'CheckSquare', tint: 'muted' },
];

function buildHeatmap(days: number): HeatmapDay[] {
  return buildTimeSeries(days).map(({ date, seconds }) => {
    const hours = seconds / 3600;
    const level: HeatmapDay['level'] = hours >= 5 ? 4 : hours >= 3.5 ? 3 : hours >= 2 ? 2 : hours > 0 ? 1 : 0;
    return { date, level, seconds };
  });
}

export const mockInsightsData: InsightsData = {
  weeklyTime: buildTimeSeries(7),
  monthlyTime: buildTimeSeries(30),
  activityBreakdown,
  moodTrendWeek: buildMoodTrend(7),
  moodTrendMonth: buildMoodTrend(30),
  productivityScore,
  weeklySummary,
  heatmap: buildHeatmap(30),
  totalTimeTrend: '+12%',
};

/**
 * Fix 4's range filter (TimeFilter.tsx) needs arbitrary day counts (Today=1 through
 * All Time), not just the two fixed 7/30-day windows above — this generates all of a
 * range's chart data from the same deterministic patterns, so every chart on the Insights
 * screen (time chart, mood trend, heatmap) recomputes consistently for whatever range is
 * selected instead of only Week/Month having real data.
 */
export function buildInsightsForRange(days: number): { time: DayTimeEntry[]; mood: MoodTrendPoint[]; heatmap: HeatmapDay[] } {
  const clampedDays = Math.max(1, days);
  return {
    time: buildTimeSeries(clampedDays),
    mood: buildMoodTrend(clampedDays),
    heatmap: buildHeatmap(clampedDays),
  };
}

export { CHART_COLORS };
