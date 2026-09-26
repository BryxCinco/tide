import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Pressable } from '../ui/SoundPressable';

import { useActivityStore } from '../../store/activityStore';
import { useTaskStore } from '../../store/taskStore';
import type { CustomInsightsRange, InsightsRange, MonthYearRange } from '../../types/insights';
import type { TaskPriority } from '../../types/task';
import { cn } from '../../utils/cn';
import { toDateKey } from '../../utils/formatDate';
import { Card, Icon, Text, type IconName } from '../ui';

export interface TaskStatsProps {
  range: InsightsRange;
  customRange?: CustomInsightsRange;
  monthYearRange?: MonthYearRange;
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_COLORS = { done: '#14B8A6', 'in-progress': '#0EA5E9', todo: '#9CA3AF', overdue: '#EF4444' } as const;

function monthYearEndKey(monthYearRange: MonthYearRange): string {
  const today = new Date();
  const isCurrentMonth = monthYearRange.month === today.getMonth() + 1 && monthYearRange.year === today.getFullYear();
  if (isCurrentMonth) return toDateKey(today);
  const lastDay = new Date(monthYearRange.year, monthYearRange.month, 0).getDate();
  return toDateKey(new Date(monthYearRange.year, monthYearRange.month - 1, lastDay));
}

function rangeStartKey(range: InsightsRange, customRange?: CustomInsightsRange, monthYearRange?: MonthYearRange): string | null {
  const today = new Date();
  const back = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return toDateKey(d);
  };
  switch (range) {
    case 'today':
      return toDateKey(today);
    case 'week':
      return back(6);
    case 'month':
      return back(29);
    case 'monthYear':
      return monthYearRange ? toDateKey(new Date(monthYearRange.year, monthYearRange.month - 1, 1)) : null;
    case 'custom':
      return customRange?.start ?? null;
    default:
      return null;
  }
}

function rangeEndKey(range: InsightsRange, customRange?: CustomInsightsRange, monthYearRange?: MonthYearRange): string {
  if (range === 'custom' && customRange) return customRange.end;
  if (range === 'monthYear' && monthYearRange) return monthYearEndKey(monthYearRange);
  return toDateKey(new Date());
}

function StatCard({ icon, label, value, tint }: { icon: IconName; label: string; value: string; tint: string }) {
  return (
    <Card variant="default" padding="md" className="min-w-[150px] flex-1 gap-2">
      <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${tint}1F` }}>
        <Icon name={icon} size={17} color={tint} />
      </View>
      <Text variant="h2" color="primary">
        {value}
      </Text>
      <Text variant="caption" color="muted" className="normal-case tracking-normal">
        {label}
      </Text>
    </Card>
  );
}

/** Small status donut, built the same stacked-stroke way as ActivityDonut.tsx — a
 * separate, simpler version rather than reusing that component directly, since
 * ActivityDonut's center label and legend are hard-coded to `formatDuration(seconds)` and
 * this chart's slices are task counts, not tracked time. */
function StatusDonut({ counts }: { counts: Record<keyof typeof STATUS_COLORS, number> }) {
  const size = 120;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const entries = (Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[]).map((key) => ({ key, value: counts[key] }));
  const total = Math.max(entries.reduce((sum, e) => sum + e.value, 0), 1);

  let cumulative = 0;

  return (
    <View className="flex-row items-center gap-4">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {entries.map((entry) => {
            if (entry.value === 0) return null;
            const sliceLength = (entry.value / total) * circumference;
            const dashOffset = -cumulative;
            cumulative += sliceLength;
            return (
              <Circle
                key={entry.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={STATUS_COLORS[entry.key]}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${sliceLength} ${circumference}`}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })}
        </Svg>
      </View>
      <View className="flex-1 gap-1.5">
        {entries.map((entry) => (
          <View key={entry.key} className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.key] }} />
              <Text variant="caption" color="secondary" className="capitalize tracking-normal">
                {entry.key}
              </Text>
            </View>
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              {entry.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CompletedBarChart({ counts }: { counts: { label: string; count: number }[] }) {
  const max = Math.max(...counts.map((c) => c.count), 1);
  return (
    <View>
      <View className="flex-row items-end gap-2" style={{ height: 80 }}>
        {counts.map((day) => (
          <View key={day.label} className="flex-1 items-center justify-end" style={{ height: 80 }}>
            <View
              className="w-full rounded-md bg-tide-teal"
              style={{ height: Math.max((day.count / max) * 80, day.count > 0 ? 6 : 2) }}
            />
          </View>
        ))}
      </View>
      <View className="mt-1.5 flex-row gap-2">
        {counts.map((day) => (
          <View key={day.label} className="flex-1 items-center">
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              {day.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Real taskStore data throughout — no mock numbers. Trend arrows (spec's "% change vs.
 * previous period") are deliberately left out: computing one honestly needs the SAME stat
 * for the period immediately before the selected range, and this app has no historical
 * snapshot to diff against — fabricating a plausible-looking percentage would be worse than
 * not showing one.
 */
export function TaskStats({ range, customRange, monthYearRange }: TaskStatsProps) {
  const allTasks = useTaskStore((s) => s.tasks);
  const withdrawnCount = useTaskStore((s) => s.withdrawnCount);
  const activities = useActivityStore((s) => s.activities);

  const [activityFilter, setActivityFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | null>(null);

  const startKey = rangeStartKey(range, customRange, monthYearRange);
  const endKey = rangeEndKey(range, customRange, monthYearRange);
  const todayKey = toDateKey(new Date());

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const createdKey = toDateKey(new Date(task.createdAt));
      if (startKey && createdKey < startKey) return false;
      if (createdKey > endKey) return false;
      if (activityFilter && task.linkedActivityId !== activityFilter) return false;
      if (priorityFilter && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [allTasks, startKey, endKey, activityFilter, priorityFilter]);

  const completed = filteredTasks.filter((t) => t.status === 'done');
  const overdue = filteredTasks.filter((t) => t.dueDate && t.dueDate < todayKey && t.status !== 'done');
  const completionRate = filteredTasks.length > 0 ? (completed.length / filteredTasks.length) * 100 : 0;

  const avgCompletionHours = useMemo(() => {
    const durations = completed
      .filter((t) => t.completedAt)
      .map((t) => (new Date(t.completedAt as string).getTime() - new Date(t.createdAt).getTime()) / 3600000)
      .filter((h) => h >= 0);
    if (durations.length === 0) return null;
    return durations.reduce((sum, h) => sum + h, 0) / durations.length;
  }, [completed]);

  const mostProductiveDay = useMemo(() => {
    const byWeekday = new Array(7).fill(0);
    completed.forEach((t) => {
      if (t.completedAt) byWeekday[new Date(t.completedAt).getDay()] += 1;
    });
    const max = Math.max(...byWeekday);
    if (max === 0) return null;
    return WEEKDAY_NAMES[byWeekday.indexOf(max)];
  }, [completed]);

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const key = toDateKey(date);
      const count = allTasks.filter((t) => t.completedAt && toDateKey(new Date(t.completedAt)) === key).length;
      return { label: WEEKDAY_SHORT[date.getDay()], count };
    });
  }, [allTasks]);

  const statusCounts = useMemo(() => {
    const counts: Record<keyof typeof STATUS_COLORS, number> = { done: 0, 'in-progress': 0, todo: 0, overdue: 0 };
    filteredTasks.forEach((task) => {
      if (task.dueDate && task.dueDate < todayKey && task.status !== 'done') counts.overdue += 1;
      else counts[task.status] += 1;
    });
    return counts;
  }, [filteredTasks, todayKey]);

  return (
    <View className="gap-5">
      <View className="flex-row flex-wrap gap-2">
        <FilterChip label="All Activities" active={activityFilter === null} onPress={() => setActivityFilter(null)} />
        {activities.slice(0, 6).map((activity) => (
          <FilterChip
            key={activity.id}
            label={activity.name}
            active={activityFilter === activity.id}
            onPress={() => setActivityFilter(activity.id)}
          />
        ))}
      </View>
      <View className="flex-row flex-wrap gap-2">
        <FilterChip label="All Priorities" active={priorityFilter === null} onPress={() => setPriorityFilter(null)} />
        {(['low', 'medium', 'high', 'critical'] as const).map((p) => (
          <FilterChip key={p} label={p} active={priorityFilter === p} onPress={() => setPriorityFilter(p)} />
        ))}
      </View>

      <View className="flex-row flex-wrap gap-3">
        <StatCard icon="CheckCircle2" label={`Completed (${Math.round(completionRate)}% of total)`} value={String(completed.length)} tint="#14B8A6" />
        <StatCard icon="AlertTriangle" label="Failed (overdue)" value={String(overdue.length)} tint="#EF4444" />
        <StatCard icon="Trash2" label="Withdrawn (all time)" value={String(withdrawnCount)} tint="#9CA3AF" />
        <StatCard icon="TrendingUp" label="Completion Rate" value={`${Math.round(completionRate)}%`} tint="#0EA5E9" />
        <StatCard
          icon="Timer"
          label="Avg. Time to Complete"
          value={avgCompletionHours == null ? '—' : avgCompletionHours < 24 ? `${avgCompletionHours.toFixed(1)}h` : `${(avgCompletionHours / 24).toFixed(1)}d`}
          tint="#8B5CF6"
        />
        <StatCard icon="CalendarCheck" label="Most Productive Day" value={mostProductiveDay ?? '—'} tint="#F59E0B" />
      </View>

      <View className="gap-2">
        <Text variant="label" color="muted">
          Completed per day (last 7 days)
        </Text>
        <CompletedBarChart counts={last7Days} />
      </View>

      <View className="gap-2">
        <Text variant="label" color="muted">
          Tasks by Status
        </Text>
        <StatusDonut counts={statusCounts} />
      </View>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={cn('rounded-full border px-3 py-1.5', active ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base')}>
      <Text variant="caption" color={active ? 'accent' : 'secondary'} className="capitalize tracking-normal">
        {label}
      </Text>
    </Pressable>
  );
}
