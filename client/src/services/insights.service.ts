import type { WaveDay } from '../types/insights';
import type { ActivityBreakdownSlice, DayTimeEntry, HeatmapDay, MoodTrendPoint, ProductivityScoreBreakdown, QuestInsights, WeeklySummaryItem } from '../types/insights';
import { api } from './api';

/** Minutes east of UTC (480 in the Philippines). The server buckets every insight by the
 * user's local day with this — without it, anything done 00:00–08:00 landed on yesterday. */
export const tzOffsetMinutes = (): number => -new Date().getTimezoneOffset();

export interface InsightsSummary {
  productivityScore: ProductivityScoreBreakdown;
  weeklySummary: WeeklySummaryItem[];
  totalSeconds: number;
  totalTimeTrend: string;
}

export interface InsightsRangeData {
  time: DayTimeEntry[];
  mood: MoodTrendPoint[];
}

export const insightsService = {
  async getSummary(days: number, end: string): Promise<InsightsSummary> {
    const { data } = await api.get<InsightsSummary>('/api/insights/summary', { params: { days, end, tz: tzOffsetMinutes() } });
    return data;
  },

  async getRange(days: number, end: string): Promise<InsightsRangeData> {
    const { data } = await api.get<InsightsRangeData>('/api/insights/range', { params: { days, end, tz: tzOffsetMinutes() } });
    return data;
  },

  async getHeatmap(days: number, end: string): Promise<HeatmapDay[]> {
    const { data } = await api.get<{ heatmap: HeatmapDay[] }>('/api/insights/heatmap', { params: { days, end, tz: tzOffsetMinutes() } });
    return data.heatmap;
  },

  async getActivityBreakdown(days: number, end: string): Promise<ActivityBreakdownSlice[]> {
    const { data } = await api.get<{ activityBreakdown: ActivityBreakdownSlice[] }>('/api/insights/activity-breakdown', { params: { days, end, tz: tzOffsetMinutes() } });
    return data.activityBreakdown;
  },

  async getQuests(days: number, end: string): Promise<QuestInsights> {
    const { data } = await api.get<{ quests: QuestInsights }>('/api/insights/quests', { params: { days, end, tz: tzOffsetMinutes() } });
    return data.quests;
  },

  async getWaves(days: number, end: string): Promise<WaveDay[]> {
    const { data } = await api.get<{ waves: WaveDay[] }>('/api/insights/waves', { params: { days, end, tz: tzOffsetMinutes() } });
    return data.waves;
  },
};
