import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActivityDonut,
  ActivityHistory,
  AiSuggestions,
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
import { BackButton, ErrorState, ResponsiveContainer, SkeletonChart, Text } from '@/components/ui';
import { buildInsightsForRange, mockInsightsData } from '@/mocks/mockInsights';
import { useQuestStore } from '@/store/questStore';
import { useStreakStore } from '@/store/streakStore';
import { useTaskStore } from '@/store/taskStore';
import { useTimerStore } from '@/store/timerStore';
import type { CustomInsightsRange, InsightsRange, MonthYearRange } from '@/types/insights';
import { formatDuration } from '@/utils/formatTime';
import { formatMonthYear, fromDateKey } from '@/utils/formatDate';

/** Heatmap always shows the most recent 30 days regardless of the selected range — a true
 * year-long contribution graph needs GitHub's own layout (53 columns x 7 rows), which is a
 * different component design than the current 10-column grid, not a range-filter change. */
const HEATMAP_DAYS = 30;
const MAX_CUSTOM_RANGE_DAYS = 62;

/**
 * Every window this returns tops out around a month's worth of days — "This Year"/"All
 * Time" used to return 365 here, which is what broke TimeChart/MoodTrend (see
 * TimeFilter.tsx's comment): 365 flex-1 bars and 365 stacked labels have no real screen
 * width to render into. `endDate` matters for 'monthYear' specifically, since that's the
 * one range that isn't always "N days ending today" — picking a past month needs the
 * window to end on that month's last day, not today.
 */
function rangeToWindow(range: InsightsRange, customRange?: CustomInsightsRange, monthYearRange?: MonthYearRange): { days: number; endDate: Date } {
  const today = new Date();
  switch (range) {
    case 'today':
      return { days: 1, endDate: today };
    case 'week':
      return { days: 7, endDate: today };
    case 'month':
      return { days: 30, endDate: today };
    case 'monthYear': {
      if (!monthYearRange) return { days: 30, endDate: today };
      const { month, year } = monthYearRange;
      const daysInMonth = new Date(year, month, 0).getDate();
      const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();
      return isCurrentMonth
        ? { days: today.getDate(), endDate: today }
        : { days: daysInMonth, endDate: new Date(year, month - 1, daysInMonth) };
    }
    case 'custom': {
      if (!customRange) return { days: 7, endDate: today };
      // customRange.start/.end are local-calendar "YYYY-MM-DD" date-key strings (see
      // toDateKey's own comment on why those exist) — `new Date(dateKeyString)` parses as
      // UTC midnight, not local midnight, which silently shifts the whole window back a day
      // for anyone west of UTC. fromDateKey is the matching local-midnight parser.
      const start = fromDateKey(customRange.start).getTime();
      const end = fromDateKey(customRange.end).getTime();
      const requestedDays = Math.max(1, Math.round((end - start) / 86400000) + 1);
      // Same reasoning as dropping 'year'/'all': TimeChart/MoodTrend can't usefully render
      // hundreds of bars/labels. A custom range can still request that many days (the
      // picker doesn't limit span), so clamp to the most recent MAX_CUSTOM_RANGE_DAYS days
      // of whatever was picked rather than rendering the same broken wall of labels.
      return { days: Math.min(requestedDays, MAX_CUSTOM_RANGE_DAYS), endDate: fromDateKey(customRange.end) };
    }
  }
}

function TotalHoursCard({ seconds, trend }: { seconds: number; trend: string }) {
  return (
    <View className="flex-1 justify-between gap-1">
      <View className="gap-1">
        <Text variant="display" color="primary">
          {formatDuration(seconds)}
        </Text>
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          Total Tracked
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text variant="caption" color="accent" className="normal-case tracking-normal">
          {trend}
        </Text>
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          vs previous period
        </Text>
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  const [range, setRange] = useState<InsightsRange>('week');
  const [customRange, setCustomRange] = useState<CustomInsightsRange | undefined>(undefined);
  const [monthYearRange, setMonthYearRange] = useState<MonthYearRange>(() => {
    const today = new Date();
    return { month: today.getMonth() + 1, year: today.getFullYear() };
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchTodaySessions = useTimerStore((s) => s.fetchTodaySessions);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const fetchTodayQuests = useQuestStore((s) => s.fetchTodayQuests);
  const fetchStreak = useStreakStore((s) => s.fetchStreak);
  const tasksLoading = useTaskStore((s) => s.isLoading);
  const tasksError = useTaskStore((s) => s.error);
  const clearTasksError = useTaskStore((s) => s.clearError);

  const refetchAll = () =>
    Promise.all([fetchTodaySessions(), fetchTasks(), fetchTodayQuests(), fetchStreak()]);

  useEffect(() => {
    refetchAll();
    // Fetches all four on mount only — TaskStats/ProductivityScore below read straight
    // from their stores rather than re-fetching themselves, unlike DailyQuestCard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  };

  const { days, endDate } = rangeToWindow(range, customRange, monthYearRange);
  // endDate's getTime() (not the Date object itself) as the memo key — a new Date instance
  // with the same value is created on every render, which would otherwise defeat useMemo.
  const rangeData = useMemo(() => buildInsightsForRange(days, endDate), [days, endDate.getTime()]);
  const heatmapData = useMemo(() => buildInsightsForRange(HEATMAP_DAYS).heatmap, []);
  const totalSeconds = rangeData.time.reduce((sum, entry) => sum + entry.seconds, 0);

  const rangeLabel =
    range === 'custom' && customRange
      ? `${customRange.start} to ${customRange.end}`
      : range === 'monthYear'
        ? formatMonthYear(monthYearRange.month, monthYearRange.year)
        : range === 'today'
          ? 'today'
          : `this ${range}`;

  const handleRangeChange = (nextRange: InsightsRange, nextCustom?: CustomInsightsRange) => {
    setRange(nextRange);
    if (nextRange === 'custom' && nextCustom) setCustomRange(nextCustom);
  };

  return (
    <SafeAreaView className="flex-1 bg-base">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-24"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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
            <TimeFilter
              value={range}
              customRange={customRange}
              monthYearRange={monthYearRange}
              onChange={handleRangeChange}
              onMonthYearChange={setMonthYearRange}
            />
          </View>

          {/* Bento grid — real CSS grid on web (react-native-web compiles Tailwind's grid
              utilities directly), plain single-column stacking below `md` on every
              platform. See BentoCard.tsx for the native-grid caveat. */}
          <View className="gap-4 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-4">
            <BentoCard size="hero" title="Productivity Score" icon="Target">
              {tasksLoading ? <SkeletonChart /> : <ProductivityScore score={mockInsightsData.productivityScore} />}
            </BentoCard>

            <BentoCard size="sm" title="Tracked Time" icon="Clock">
              <TotalHoursCard seconds={totalSeconds} trend={mockInsightsData.totalTimeTrend} />
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

            <BentoCard size="wide" title="AI Suggestions" icon="Sparkles">
              <AiSuggestions />
            </BentoCard>

            <BentoCard size="lg" title="Last 30 Days" icon="CalendarDays">
              <Heatmap days={heatmapData} />
            </BentoCard>

            <BentoCard size="lg" title="Task Stats" icon="ListChecks">
              {tasksError ? (
                <ErrorState
                  message={tasksError}
                  onRetry={() => {
                    clearTasksError();
                    fetchTasks();
                  }}
                />
              ) : tasksLoading ? (
                <SkeletonChart />
              ) : (
                <TaskStats range={range} customRange={customRange} monthYearRange={monthYearRange} />
              )}
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
