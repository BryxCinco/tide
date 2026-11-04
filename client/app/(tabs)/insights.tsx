import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActivityDonut,
  ActivityHistory,
  AiSuggestions,
  Heatmap,
  HexagonStats,
  HistoryView,
  MoodTrend,
  ProductivityScore,
  QuestStats,
  SummaryCard,
  TaskStats,
  TimeChart,
  TimeFilter,
} from '@/components/insights';
import { BENTO_INK_TEXT, BentoHeader, BentoTile, ErrorState, Icon, ResponsiveContainer, SkeletonChart, Text } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { getApiErrorMessage } from '@/services/api';
import { insightsService, type InsightsRangeData, type InsightsSummary } from '@/services/insights.service';
import { useLevelStore } from '@/store/levelStore';
import { useQuestStore } from '@/store/questStore';
import { useStreakStore } from '@/store/streakStore';
import { useTaskStore } from '@/store/taskStore';
import { useTimerStore } from '@/store/timerStore';
import type { ActivityBreakdownSlice, CustomInsightsRange, DayTimeEntry, HeatmapDay, InsightsRange, MonthYearRange, QuestInsights } from '@/types/insights';
import { formatDuration } from '@/utils/formatTime';
import { formatMonthYear, fromDateKey, toDateKey } from '@/utils/formatDate';
import { ocean } from '@/utils/theme';

/** Heatmap always shows a fixed trailing window regardless of the selected range filter —
 * a full year (53 weeks) of GitHub-style, calendar-aligned week columns (see Heatmap.tsx). */
const HEATMAP_DAYS = 365;
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

/**
 * The hero: total tracked time for the window on a dark tile, the change vs the previous
 * period as a chip, and a mini column sparkline of the same days (today in full teal).
 */
function TrackedTimeHero({ seconds, trend, series, rangeLabel }: { seconds: number; trend: string; series: DayTimeEntry[]; rangeLabel: string }) {
  const max = Math.max(...series.map((d) => d.seconds), 1);
  const isUp = trend.trim().startsWith('+');
  const isDown = trend.trim().startsWith('-');
  const today = new Date().toISOString().slice(0, 10);

  return (
    <View className="flex-1 justify-between gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Icon name="Waves" size={13} color={ocean.seafoam} strokeWidth={2.2} />
          <Text variant="label" className="text-[10.5px]" style={{ color: BENTO_INK_TEXT.muted, letterSpacing: 0.8 }}>
            Tracked {rangeLabel}
          </Text>
        </View>
        {trend ? (
          <View
            className="flex-row items-center rounded-full px-2 py-0.5"
            style={{ backgroundColor: isDown ? 'rgba(239,68,68,0.18)' : 'rgba(94,234,212,0.14)' }}
          >
            <Text variant="body" className="text-[10.5px] font-semibold" style={{ color: isDown ? '#FCA5A5' : ocean.seafoam }}>
              {isUp ? '▲ ' : isDown ? '▼ ' : ''}
              {trend.replace(/^[+-]/, '')} vs previous
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={{ color: BENTO_INK_TEXT.primary, fontSize: 40, lineHeight: 46, fontFamily: 'Inter_700Bold', letterSpacing: -1.2, fontVariant: ['tabular-nums'] }}>
        {formatDuration(seconds)}
      </Text>

      {series.length > 1 && (
        <View className="h-12 flex-row items-end" style={{ gap: series.length > 14 ? 2 : 4 }}>
          {series.map((d) => (
            <View
              key={d.date}
              className="flex-1"
              style={{
                height: d.seconds > 0 ? Math.max((d.seconds / max) * 48, 3) : 2,
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
                backgroundColor: d.date === today ? ocean.seafoam : 'rgba(255,255,255,0.14)',
              }}
            />
          ))}
        </View>
      )}
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
  const { isPhone } = useResponsive();

  const fetchTodaySessions = useTimerStore((s) => s.fetchTodaySessions);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const fetchTodayQuests = useQuestStore((s) => s.fetchTodayQuests);
  const fetchStreak = useStreakStore((s) => s.fetchStreak);
  const fetchLevel = useLevelStore((s) => s.fetchLevel);
  const tasksLoading = useTaskStore((s) => s.isLoading);
  const tasksError = useTaskStore((s) => s.error);
  const clearTasksError = useTaskStore((s) => s.clearError);

  const refetchAll = () =>
    Promise.all([fetchTodaySessions(), fetchTasks(), fetchTodayQuests(), fetchStreak(), fetchLevel()]);

  useEffect(() => {
    refetchAll();
    // Fetches all four on mount only — TaskStats/ProductivityScore below read straight
    // from their stores rather than re-fetching themselves, unlike QuestCard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { days, endDate } = rangeToWindow(range, customRange, monthYearRange);
  const endKey = toDateKey(endDate);

  // Summary (Productivity Score/Weekly Summary/Tracked Time), the time+mood series, and the
  // activity breakdown all follow the selected range, so they're fetched together. The
  // heatmap is a fixed trailing 30-day window regardless of range (see HEATMAP_DAYS), fetched
  // once on mount — same split the mock builder it replaces used.
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [rangeData, setRangeData] = useState<InsightsRangeData>({ time: [], mood: [] });
  const [activityBreakdown, setActivityBreakdown] = useState<ActivityBreakdownSlice[]>([]);
  const [questInsights, setQuestInsights] = useState<QuestInsights | null>(null);
  const [rangeLoading, setRangeLoading] = useState(true);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const [heatmapData, setHeatmapData] = useState<HeatmapDay[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(true);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);

  const fetchRangeData = async () => {
    setRangeLoading(true);
    setRangeError(null);
    try {
      const [summaryRes, rangeRes, activityRes, questsRes] = await Promise.all([
        insightsService.getSummary(days, endKey),
        insightsService.getRange(days, endKey),
        insightsService.getActivityBreakdown(days, endKey),
        insightsService.getQuests(days, endKey),
      ]);
      setSummary(summaryRes);
      setRangeData(rangeRes);
      setActivityBreakdown(activityRes);
      setQuestInsights(questsRes);
    } catch (err) {
      setRangeError(getApiErrorMessage(err));
    } finally {
      setRangeLoading(false);
    }
  };

  const fetchHeatmap = async () => {
    setHeatmapLoading(true);
    setHeatmapError(null);
    try {
      setHeatmapData(await insightsService.getHeatmap(HEATMAP_DAYS, toDateKey(new Date())));
    } catch (err) {
      setHeatmapError(getApiErrorMessage(err));
    } finally {
      setHeatmapLoading(false);
    }
  };

  useEffect(() => {
    fetchRangeData();
    // Re-fetches whenever the selected window changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, endKey]);

  useEffect(() => {
    fetchHeatmap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchAll(), fetchRangeData(), fetchHeatmap()]);
    setRefreshing(false);
  };

  const totalSeconds = summary?.totalSeconds ?? 0;

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
    <SafeAreaView className="flex-1 bg-transparent">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-24"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ResponsiveContainer className="gap-2.5 pt-3 md:gap-3 md:pt-5">
          <View className="gap-2.5">
            {/* Left padding on phone clears AppLayout's floating menu button. */}
            <View className="pl-12 md:pl-0">
              <Text variant="label" color="muted" className="text-[10.5px]" style={{ letterSpacing: 1.2 }}>
                Insights
              </Text>
              <Text variant="h2" color="primary" className={isPhone ? 'text-[19px]' : 'text-[22px]'} numberOfLines={1}>
                Your patterns, {rangeLabel}
              </Text>
            </View>
            <TimeFilter
              value={range}
              customRange={customRange}
              monthYearRange={monthYearRange}
              onChange={handleRangeChange}
              onMonthYearChange={setMonthYearRange}
            />
          </View>

          {/* Row 1 — the hero number and the score that summarizes it. */}
          <View className="gap-2.5 md:flex-row md:gap-3">
            <BentoTile tone="deep" dense index={0} className="md:flex-[1.3]">
              {rangeLoading || !summary ? (
                <SkeletonChart />
              ) : (
                <TrackedTimeHero seconds={totalSeconds} trend={summary.totalTimeTrend} series={rangeData.time} rangeLabel={rangeLabel} />
              )}
            </BentoTile>
            <BentoTile tone="glass" dense index={1} className="md:flex-1">
              <View className="flex-1 gap-3">
                <BentoHeader dense title="Productivity score" icon="Target" />
                {rangeError ? (
                  <ErrorState message={rangeError} onRetry={fetchRangeData} />
                ) : rangeLoading || !summary ? (
                  <SkeletonChart />
                ) : (
                  <ProductivityScore score={summary.productivityScore} />
                )}
              </View>
            </BentoTile>
          </View>

          {/* Row 2 — time per day and mood over the same days. */}
          <View className="gap-2.5 lg:flex-row lg:gap-3">
            <BentoTile tone="glass" dense index={2} className="lg:flex-[1.5]">
              <View className="gap-3">
                <BentoHeader dense title="Time tracked" icon="BarChart3" />
                {rangeLoading ? <SkeletonChart /> : <TimeChart data={rangeData.time} />}
              </View>
            </BentoTile>
            <BentoTile tone="glass" dense index={3} className="lg:flex-1">
              <View className="gap-3">
                <BentoHeader dense title="Mood trend" icon="Smile" color={ocean.sand} />
                {rangeLoading ? <SkeletonChart /> : <MoodTrend data={rangeData.mood} />}
              </View>
            </BentoTile>
          </View>

          {/* Row 3 — where the time went, and the all-round stat wheel. */}
          <View className="gap-2.5 lg:flex-row lg:gap-3">
            <BentoTile tone="glass" dense index={4} className="lg:flex-[1.5]">
              <View className="gap-3">
                <BentoHeader dense title="Activity breakdown" icon="PieChart" color={ocean.lavender} />
                {rangeLoading ? (
                  <SkeletonChart />
                ) : (
                  <>
                    <ActivityDonut slices={activityBreakdown} />
                    {activityBreakdown.length > 0 && <ActivityHistory slices={activityBreakdown} />}
                  </>
                )}
              </View>
            </BentoTile>
            <BentoTile tone="glass" dense index={5} className="lg:flex-1">
              <View className="flex-1 gap-3">
                <BentoHeader dense title="Your stats" icon="Hexagon" color={ocean.lagoon} />
                <View className="flex-1 justify-center">
                  <HexagonStats productivityScore={summary?.productivityScore.overall} />
                </View>
              </View>
            </BentoTile>
          </View>

          <BentoTile tone="glass" dense index={6}>
            <View className="gap-3">
              <BentoHeader dense title="Last 12 months" icon="CalendarDays" />
              {heatmapError ? (
                <ErrorState message={heatmapError} onRetry={fetchHeatmap} />
              ) : heatmapLoading ? (
                <SkeletonChart />
              ) : (
                <Heatmap days={heatmapData} />
              )}
            </View>
          </BentoTile>

          <BentoTile tone="glass" dense index={7}>
            <View className="gap-3">
              <BentoHeader dense title="Period summary" icon="ListChecks" color={ocean.surf} />
              {rangeLoading || !summary ? <SkeletonChart /> : <SummaryCard items={summary.weeklySummary} />}
            </View>
          </BentoTile>

          <BentoTile tone="glass" dense index={8}>
            <View className="gap-3">
              <BentoHeader dense title="Tide's Quests" icon="Swords" color={ocean.lavender} />
              {rangeLoading || !questInsights ? <SkeletonChart /> : <QuestStats data={questInsights} />}
            </View>
          </BentoTile>

          <View className="gap-3 lg:flex-row lg:items-start lg:gap-4">
            <BentoTile tone="glass" dense index={9} className="lg:flex-[1.5]">
              <View className="gap-3">
                <BentoHeader dense title="Task stats" icon="CheckSquare" color={ocean.lagoon} />
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
              </View>
            </BentoTile>
            <BentoTile tone="glass" dense index={10} className="lg:flex-1">
              <View className="gap-3">
                <BentoHeader dense title="AI suggestions" icon="Sparkles" color={ocean.lavender} />
                <AiSuggestions />
              </View>
            </BentoTile>
          </View>

          <BentoTile tone="glass" dense index={11}>
            <View className="gap-3">
              <BentoHeader dense title="History" icon="History" color="#64748B" />
              <HistoryView />
            </View>
          </BentoTile>
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}
