import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActivityDonut,
  ActivityHistory,
  BentoCard,
  Heatmap,
  HistoryView,
  MoodTrend,
  ProductivityScore,
  SummaryCard,
  TaskStats,
  TimeChart,
  TimeFilter,
} from '@/components/insights';
import { BackButton, ResponsiveContainer, Text } from '@/components/ui';
import { buildInsightsForRange, mockInsightsData } from '@/mocks/mockInsights';
import type { CustomInsightsRange, InsightsRange } from '@/types/insights';
import { formatDuration } from '@/utils/formatTime';

/** Heatmap always shows the most recent 30 days regardless of the selected range — a true
 * year-long contribution graph needs GitHub's own layout (53 columns x 7 rows), which is a
 * different component design than the current 10-column grid, not a range-filter change. */
const HEATMAP_DAYS = 30;

function rangeToDayCount(range: InsightsRange, customRange?: CustomInsightsRange): number {
  switch (range) {
    case 'today':
      return 1;
    case 'week':
      return 7;
    case 'month':
      return 30;
    case 'year':
      return 365;
    case 'all':
      return 365;
    case 'custom': {
      if (!customRange) return 7;
      const start = new Date(customRange.start).getTime();
      const end = new Date(customRange.end).getTime();
      return Math.max(1, Math.round((end - start) / 86400000) + 1);
    }
  }
}

function TotalHoursCard({ label, seconds, trend }: { label: string; seconds: number; trend: string }) {
  return (
    <View className="flex-1 justify-center gap-1">
      <Text variant="display" color="primary">
        {formatDuration(seconds)}
      </Text>
      <View className="flex-row items-center gap-1">
        <Text variant="caption" color="accent" className="normal-case tracking-normal">
          {trend}
        </Text>
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          vs last {label.toLowerCase()}
        </Text>
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const [range, setRange] = useState<InsightsRange>('week');
  const [customRange, setCustomRange] = useState<CustomInsightsRange | undefined>(undefined);

  const days = rangeToDayCount(range, customRange);
  const rangeData = useMemo(() => buildInsightsForRange(days), [days]);
  const heatmapData = useMemo(() => buildInsightsForRange(HEATMAP_DAYS).heatmap, []);
  const totalSeconds = rangeData.time.reduce((sum, entry) => sum + entry.seconds, 0);

  const rangeLabel =
    range === 'custom' && customRange
      ? `${customRange.start} to ${customRange.end}`
      : range === 'today'
        ? 'today'
        : range === 'all'
          ? 'all time'
          : `this ${range}`;

  const handleRangeChange = (nextRange: InsightsRange, nextCustom?: CustomInsightsRange) => {
    setRange(nextRange);
    if (nextRange === 'custom' && nextCustom) setCustomRange(nextCustom);
  };

  return (
    <SafeAreaView className="flex-1 bg-base">
      <ScrollView className="flex-1" contentContainerClassName="pb-24">
        <ResponsiveContainer className="gap-6 pt-4 md:pt-6 lg:pt-8">
          <View className="gap-3">
            <View className="flex-row items-center gap-3">
              <BackButton onPress={() => router.push('/')} />
              <View>
                <Text variant="h2" color="primary">
                  Insights
                </Text>
                <Text variant="caption" color="muted" className="normal-case tracking-normal">
                  Your productivity patterns, {rangeLabel}
                </Text>
              </View>
            </View>
            <TimeFilter value={range} customRange={customRange} onChange={handleRangeChange} />
          </View>

          {/* Bento grid — real CSS grid on web (react-native-web compiles Tailwind's grid
              utilities directly), plain single-column stacking below `md` on every
              platform. See BentoCard.tsx for the native-grid caveat. */}
          <View className="gap-4 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-4">
            <BentoCard size="hero" title="Productivity Score" icon="Target">
              <ProductivityScore score={mockInsightsData.productivityScore} />
            </BentoCard>

            <BentoCard size="sm" title="Tracked Time" icon="Clock">
              <TotalHoursCard label={range} seconds={totalSeconds} trend={mockInsightsData.totalTimeTrend} />
            </BentoCard>

            <BentoCard size="sm" title="Mood Trend" icon="Smile">
              <MoodTrend data={rangeData.mood} />
            </BentoCard>

            <BentoCard size="wide" title="Time Tracked" icon="BarChart3">
              <TimeChart data={rangeData.time} />
            </BentoCard>

            <BentoCard size="wide" title="Activity Breakdown" icon="PieChart">
              <ActivityDonut slices={mockInsightsData.activityBreakdown} />
              <ActivityHistory slices={mockInsightsData.activityBreakdown} />
            </BentoCard>

            <BentoCard size="lg" title="Last 30 Days" icon="CalendarDays">
              <Heatmap days={heatmapData} />
            </BentoCard>

            <BentoCard size="lg" title="Task Stats" icon="ListChecks">
              <TaskStats range={range} customRange={customRange} />
            </BentoCard>

            <BentoCard size="lg" title="Weekly Summary" icon="ListChecks">
              <SummaryCard items={mockInsightsData.weeklySummary} />
            </BentoCard>

            <BentoCard size="lg" title="History" icon="History">
              <HistoryView />
            </BentoCard>
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}
