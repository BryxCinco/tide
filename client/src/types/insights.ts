import type { IconName } from '@/components/ui';

import type { AccentTone } from './dashboard';
import type { Mood } from './journal';

export type InsightsRange = 'today' | 'week' | 'month' | 'monthYear' | 'custom';

/** Local "YYYY-MM-DD" keys (see utils/formatDate.ts's toDateKey), inclusive on both ends. */
export interface CustomInsightsRange {
  start: string;
  end: string;
}

/** A specific calendar month, e.g. { month: 1, year: 2026 } for "Jan 2026" — `month` is
 * 1-12, not JS's native 0-11, since every call site formats/labels it rather than feeding
 * it straight to `new Date(...)`. Replaces the old 'year'/'all' ranges, which pushed 365
 * data points through charts built for a week/month's worth (see TimeFilter.tsx). */
export interface MonthYearRange {
  month: number;
  year: number;
}

/** One bar in the time-tracked chart. */
export interface DayTimeEntry {
  /** "Mon" / "Tue" / ... for week view, "1"-"31" (day-of-month) for month view. */
  label: string;
  /** ISO date — lets the chart map a bar back to a real day (tooltips, "today" highlight). */
  date: string;
  seconds: number;
}

/** One slice of the activity-breakdown donut. */
export interface ActivityBreakdownSlice {
  id: string;
  label: string;
  seconds: number;
  /** Hex — donut slices use fixed chart colors (see mockInsights.ts), not per-activity
   * custom colors, so the legend stays readable regardless of how many custom activities
   * the user has created. */
  color: string;
  /** % change vs. the previous equal-length period — same illustrative-mock convention as
   * `InsightsData.totalTimeTrend`, since this whole slice list is already mock data (see
   * ActivityHistory.tsx). Positive = up. */
  trendPercent: number;
  /** ISO date of the most recent session logged under this activity. */
  lastSessionDate: string;
  /** Up to 5 real sessions for this activity within the window, newest first — backs
   * ActivityHistory's expandable row. Optional since mock data (WeeklyProgressWidget,
   * pending its own real-data pass) doesn't set it. */
  recentSessions?: { date: string; seconds: number }[];
}

/** One point on the mood-trend line. `score` is null for a day with no journal entry —
 * the line breaks/gaps there rather than interpolating a mood that was never recorded. */
export interface MoodTrendPoint {
  label: string;
  date: string;
  score: number | null;
  mood: Mood | null;
}

export interface ProductivityScoreBreakdown {
  overall: number;
  consistency: number;
  focusTime: number;
  taskCompletion: number;
}

export interface WeeklySummaryItem {
  id: string;
  label: string;
  value: string;
  icon: IconName;
  tint: AccentTone;
}

/** One cell in the 30-day heatmap. `level` 0-4 mirrors GitHub's contribution-graph scale
 * (0 = no tracked time, 4 = heaviest day in the window). */
export interface HeatmapDay {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
  seconds: number;
}

export interface InsightsData {
  weeklyTime: DayTimeEntry[];
  monthlyTime: DayTimeEntry[];
  activityBreakdown: ActivityBreakdownSlice[];
  moodTrendWeek: MoodTrendPoint[];
  moodTrendMonth: MoodTrendPoint[];
  productivityScore: ProductivityScoreBreakdown;
  weeklySummary: WeeklySummaryItem[];
  heatmap: HeatmapDay[];
  /** Illustrative, not computed — same convention as mockDashboard's StatItem.trend strings. */
  totalTimeTrend: string;
}
