import type { ActivityBreakdownSlice, DayTimeEntry, HeatmapDay, MoodTrendPoint, ProductivityScoreBreakdown, QuestInsights, WeeklySummaryItem } from '../types/insights';
import { api } from './api';

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
    const { data } = await api.get<InsightsSummary>('/api/insights/summary', { params: { days, end } });
    return data;
  },

  async getRange(days: number, end: string): Promise<InsightsRangeData> {
    const { data } = await api.get<InsightsRangeData>('/api/insights/range', { params: { days, end } });
    return data;
  },

  async getHeatmap(days: number, end: string): Promise<HeatmapDay[]> {
    const { data } = await api.get<{ heatmap: HeatmapDay[] }>('/api/insights/heatmap', { params: { days, end } });
    return data.heatmap;
  },

  async getActivityBreakdown(days: number, end: string): Promise<ActivityBreakdownSlice[]> {
    const { data } = await api.get<{ activityBreakdown: ActivityBreakdownSlice[] }>('/api/insights/activity-breakdown', { params: { days, end } });
    return data.activityBreakdown;
  },

  async getQuests(days: number, end: string): Promise<QuestInsights> {
    const { data } = await api.get<{ quests: QuestInsights }>('/api/insights/quests', { params: { days, end } });
    return data.quests;
  },
};
