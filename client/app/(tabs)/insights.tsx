import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActivityDonut,
  BentoCard,
  Heatmap,
  MoodTrend,
  ProductivityScore,
  SummaryCard,
  TimeChart,
} from '@/components/insights';
import { BackButton, ResponsiveContainer, Text } from '@/components/ui';
import { mockInsightsData } from '@/mocks/mockInsights';
import type { InsightsRange } from '@/types/insights';
import { cn } from '@/utils/cn';
import { formatDuration } from '@/utils/formatTime';

const RANGES: { value: InsightsRange; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

function RangeToggle({ value, onChange }: { value: InsightsRange; onChange: (r: InsightsRange) => void }) {
  return (
    <View className="flex-row rounded-full border border-subtle bg-elevated p-1">
      {RANGES.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          className={cn('rounded-full px-4 py-1.5', value === option.value && 'bg-tide-teal')}
        >
          <Text
            variant="caption"
            color={value === option.value ? 'inverse' : 'secondary'}
            className={cn('normal-case tracking-normal', value === option.value && 'font-semibold')}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
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
  const isWeek = range === 'week';

  const timeData = isWeek ? mockInsightsData.weeklyTime : mockInsightsData.monthlyTime;
  const moodData = isWeek ? mockInsightsData.moodTrendWeek : mockInsightsData.moodTrendMonth;
  const totalSeconds = timeData.reduce((sum, entry) => sum + entry.seconds, 0);

  return (
    <SafeAreaView className="flex-1 bg-base">
      <ScrollView className="flex-1" contentContainerClassName="pb-24">
        <ResponsiveContainer className="gap-6 pt-4 md:pt-6 lg:pt-8">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-row items-center gap-3">
              <BackButton onPress={() => router.push('/')} />
              <View>
                <Text variant="h2" color="primary">
                  Insights
                </Text>
                <Text variant="caption" color="muted" className="normal-case tracking-normal">
                  Your productivity patterns
                </Text>
              </View>
            </View>
            <RangeToggle value={range} onChange={setRange} />
          </View>

          {/* Bento grid — real CSS grid on web (react-native-web compiles Tailwind's grid
              utilities directly), plain single-column stacking below `md` on every
              platform. See BentoCard.tsx for the native-grid caveat. */}
          <View className="gap-4 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-4">
            <BentoCard size="hero" title="Productivity Score" icon="Target">
              <ProductivityScore score={mockInsightsData.productivityScore} />
            </BentoCard>

            <BentoCard size="sm" title={isWeek ? 'This Week' : 'This Month'} icon="Clock">
              <TotalHoursCard
                label={isWeek ? 'Week' : 'Month'}
                seconds={totalSeconds}
                trend={mockInsightsData.totalTimeTrend}
              />
            </BentoCard>

            <BentoCard size="sm" title="Mood Trend" icon="Smile">
              <MoodTrend data={moodData} />
            </BentoCard>

            <BentoCard size="wide" title={isWeek ? 'Weekly Time' : 'Monthly Time'} icon="BarChart3">
              <TimeChart data={timeData} />
            </BentoCard>

            <BentoCard size="wide" title="Activity Breakdown" icon="PieChart">
              <ActivityDonut slices={mockInsightsData.activityBreakdown} />
            </BentoCard>

            <BentoCard size="lg" title="Last 30 Days" icon="CalendarDays">
              <Heatmap days={mockInsightsData.heatmap} />
            </BentoCard>

            <BentoCard size="lg" title="Weekly Summary" icon="ListChecks">
              <SummaryCard items={mockInsightsData.weeklySummary} />
            </BentoCard>
          </View>
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}
