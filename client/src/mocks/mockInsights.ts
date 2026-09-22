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

function buildWeeklyTime(): DayTimeEntry[] {
  // Index 0 = 6 days ago (Monday-of-this-window) .. index 6 = today, so bars read
  // left-to-right chronologically ending on "today" regardless of what day it actually is.
  return Array.from({ length: 7 }, (_, i) => {
    const date = daysAgo(6 - i);
    return {
      label: WEEKDAY_LABELS[mondayFirstIndex(date)],
      date: isoDate(date),
      seconds: Math.round(WEEK_HOURS_PATTERN[i] * 3600),
    };
  });
}

function buildMonthlyTime(): DayTimeEntry[] {
  return Array.from({ length: 30 }, (_, i) => {
    const date = daysAgo(29 - i);
    // Gentle wave + weekday pattern so the chart isn't flat, still deterministic.
    const weekdayFactor = WEEK_HOURS_PATTERN[mondayFirstIndex(date)];
    const wave = 1 + 0.15 * Math.sin(i / 3);
    return {
      label: String(date.getDate()),
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
  { id: 'deep-work', label: 'Deep Work', seconds: 8 * 3600 + 20 * 60, color: CHART_COLORS.teal },
  { id: 'meetings', label: 'Meetings', seconds: 3 * 3600 + 10 * 60, color: CHART_COLORS.oceanBlue },
  { id: 'learning', label: 'Learning', seconds: 2 * 3600 + 40 * 60, color: CHART_COLORS.purple },
  { id: 'exercise', label: 'Exercise', seconds: 1 * 3600 + 50 * 60, color: CHART_COLORS.orange },
  { id: 'journaling', label: 'Journaling', seconds: 45 * 60, color: CHART_COLORS.pink },
  { id: 'other', label: 'Other', seconds: 1 * 3600 + 15 * 60, color: CHART_COLORS.gray },
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

function buildHeatmap(): HeatmapDay[] {
  return buildMonthlyTime().map(({ date, seconds }) => {
    const hours = seconds / 3600;
    const level: HeatmapDay['level'] = hours >= 5 ? 4 : hours >= 3.5 ? 3 : hours >= 2 ? 2 : hours > 0 ? 1 : 0;
    return { date, level, seconds };
  });
}

export const mockInsightsData: InsightsData = {
  weeklyTime: buildWeeklyTime(),
  monthlyTime: buildMonthlyTime(),
  activityBreakdown,
  moodTrendWeek: buildMoodTrend(7),
  moodTrendMonth: buildMoodTrend(30),
  productivityScore,
  weeklySummary,
  heatmap: buildHeatmap(),
  totalTimeTrend: '+12%',
};

export { CHART_COLORS };
