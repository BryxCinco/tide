import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Pressable } from '../ui/SoundPressable';

import { useActivityStore } from '../../store/activityStore';
import { useTaskStore } from '../../store/taskStore';
import type { CustomInsightsRange, InsightsRange, MonthYearRange } from '../../types/insights';
import type { TaskPriority } from '../../types/task';
import { cn } from '../../utils/cn';
import { toDateKey } from '../../utils/formatDate';
import { Icon, Text, type IconName } from '../ui';
import { useChartTheme } from './chartTheme';
import { hexToRgba } from '../../utils/color';

export interface TaskStatsProps {
  range: InsightsRange;
  customRange?: CustomInsightsRange;
  monthYearRange?: MonthYearRange;
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type StatusKey = 'done' | 'in-progress' | 'todo' | 'overdue';
const STATUS_KEYS: StatusKey[] = ['done', 'in-progress', 'todo', 'overdue'];
const STATUS_LABELS: Record<StatusKey, string> = { done: 'Done', 'in-progress': 'In progress', todo: 'To do', overdue: 'Overdue' };

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
    <View className="basis-[47%] grow gap-2.5 rounded-2xl border border-subtle bg-base p-3.5 md:basis-[30%]">
      <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: hexToRgba(tint, 0.12) }}>
        <Icon name={icon} size={15} color={tint} />
      </View>
      <View>
        <Text variant="h3" color="primary" numberOfLines={1}>
          {value}
        </Text>
        <Text variant="body" color="muted" className="text-[11px] leading-[15px]" numberOfLines={2}>
          {label}
        </Text>
      </View>
    </View>
  );
}

/** Task status as a slim ring with surface gaps between segments, plus a legend with each
 * status's count and share — the gray "To do" is a neutral and always labelled. */
function StatusDonut({ counts }: { counts: Record<StatusKey, number> }) {
  const theme = useChartTheme();
  const size = 112;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const entries = STATUS_KEYS.map((key) => ({ key, value: counts[key] }));
  const total = entries.reduce((sum, e) => sum + e.value, 0);
  const nonZero = entries.filter((e) => e.value > 0).length;

  let cumulative = 0;

  return (
    <View className="flex-row items-center gap-5">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.track} strokeWidth={strokeWidth} fill="none" />
          {total > 0 &&
            entries.map((entry) => {
              if (entry.value === 0) return null;
              const full = (entry.value / total) * circumference;
              const length = Math.max(full - (nonZero > 1 ? 3 : 0), 1);
              const dashOffset = -cumulative;
              cumulative += full;
              return (
                <Circle
                  key={entry.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={theme.status[entry.key]}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${length} ${circumference}`}
                  strokeDashoffset={dashOffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
            })}
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text variant="h2" color="primary">
            {total}
          </Text>
          <Text variant="body" color="muted" className="text-[11px]">
            tasks
          </Text>
        </View>
      </View>
      <View className="flex-1 gap-2">
        {entries.map((entry) => (
          <View key={entry.key} className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: theme.status[entry.key] }} />
            <Text variant="body" color="secondary" className="flex-1 text-[13px]">
              {STATUS_LABELS[entry.key]}
            </Text>
            <Text variant="body" color="primary" className="text-[13px] font-semibold" style={{ fontVariant: ['tabular-nums'] }}>
              {entry.value}
            </Text>
            <Text variant="body" color="muted" className="w-9 text-right text-[11px]" style={{ fontVariant: ['tabular-nums'] }}>
              {total > 0 ? `${Math.round((entry.value / total) * 100)}%` : '–'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Completed-per-day columns for the last 7 days: thin teal columns from one baseline, the
 * count above any non-zero day, today's label emphasized. */
function CompletedBarChart({ counts }: { counts: { label: string; count: number; isToday: boolean }[] }) {
  const theme = useChartTheme();
  const height = 96;
  const max = Math.max(...counts.map((c) => c.count), 1);
  return (
    <View>
      <View className="flex-row items-end gap-3" style={{ height: height + 18 }}>
        {counts.map((day) => (
          <View key={day.label} className="flex-1 items-center justify-end gap-1" style={{ height: height + 18 }}>
            {day.count > 0 && (
              <Text variant="body" color="primary" className="text-[11px] font-semibold">
                {day.count}
              </Text>
            )}
            <View
              style={{
                width: '100%',
                maxWidth: 24,
                height: day.count > 0 ? Math.max((day.count / max) * height, 4) : 0,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                backgroundColor: day.isToday ? theme.accent : theme.accentSoft,
              }}
            />
          </View>
        ))}
      </View>
      <View style={{ height: 1, backgroundColor: theme.grid }} />
      <View className="mt-1.5 flex-row gap-3">
        {counts.map((day) => (
          <View key={day.label} className="flex-1 items-center">
            <Text variant="body" color={day.isToday ? 'primary' : 'muted'} className={day.isToday ? 'font-semibold' : undefined} style={{ fontSize: 11 }}>
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
      return { label: WEEKDAY_SHORT[date.getDay()], count, isToday: i === 6 };
    });
  }, [allTasks]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusKey, number> = { done: 0, 'in-progress': 0, todo: 0, overdue: 0 };
    filteredTasks.forEach((task) => {
      if (task.dueDate && task.dueDate < todayKey && task.status !== 'done') counts.overdue += 1;
      else counts[task.status] += 1;
    });
    return counts;
  }, [filteredTasks, todayKey]);

  return (
    <View className="gap-5">
      {/* Filters scroll sideways on narrow screens instead of wrapping into a wall of chips. */}
      <View className="gap-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
          <FilterChip label="All activities" active={activityFilter === null} onPress={() => setActivityFilter(null)} />
          {activities.slice(0, 6).map((activity) => (
            <FilterChip
              key={activity.id}
              label={activity.name}
              color={activity.color}
              active={activityFilter === activity.id}
              onPress={() => setActivityFilter(activity.id)}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
          <FilterChip label="All priorities" active={priorityFilter === null} onPress={() => setPriorityFilter(null)} />
          {(['low', 'medium', 'high', 'critical'] as const).map((p) => (
            <FilterChip key={p} label={p} active={priorityFilter === p} onPress={() => setPriorityFilter(p)} />
          ))}
        </ScrollView>
      </View>

      <View className="flex-row flex-wrap gap-2.5">
        <StatCard icon="CheckCircle2" label="Completed" value={String(completed.length)} tint="#14B8A6" />
        <StatCard icon="AlertTriangle" label="Overdue" value={String(overdue.length)} tint="#EF4444" />
        <StatCard icon="TrendingUp" label="Completion rate" value={`${Math.round(completionRate)}%`} tint="#0EA5E9" />
        <StatCard
          icon="Timer"
          label="Avg. time to complete"
          value={avgCompletionHours == null ? '—' : avgCompletionHours < 24 ? `${avgCompletionHours.toFixed(1)}h` : `${(avgCompletionHours / 24).toFixed(1)}d`}
          tint="#8B5CF6"
        />
        <StatCard icon="CalendarCheck" label="Most productive day" value={mostProductiveDay ?? '—'} tint="#F59E0B" />
        <StatCard icon="Trash2" label="Withdrawn (all time)" value={String(withdrawnCount)} tint="#94A3B8" />
      </View>

      <View className="gap-6">
        <View className="gap-3">
          <Text variant="label" color="muted" style={{ letterSpacing: 1.2 }}>
            Completed per day · last 7 days
          </Text>
          <CompletedBarChart counts={last7Days} />
        </View>
        <View className="gap-3">
          <Text variant="label" color="muted" style={{ letterSpacing: 1.2 }}>
            Tasks by status
          </Text>
          <StatusDonut counts={statusCounts} />
        </View>
      </View>
    </View>
  );
}

function FilterChip({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      className={cn('flex-row items-center gap-1.5 rounded-full border px-3 py-1.5', active ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base')}
    >
      {color && <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />}
      <Text variant="body" color={active ? 'accent' : 'secondary'} className="text-[12px] font-medium capitalize">
        {label}
      </Text>
    </Pressable>
  );
}
