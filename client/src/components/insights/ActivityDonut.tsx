import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import type { ActivityBreakdownSlice } from '../../types/insights';
import { formatDuration } from '../../utils/formatTime';
import { EmptyState, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { useChartTheme } from './chartTheme';

export interface ActivityDonutProps {
  slices: ActivityBreakdownSlice[];
  size?: number;
}

/** Visible gap between neighboring segments, in px along the ring. */
const SEGMENT_GAP = 3;
/** Past this many activities the tail folds into "Other" so the ring stays readable. */
const MAX_SEGMENTS = 5;

/**
 * Part-to-whole of tracked time: a slim ring (each activity in its own color, separated by
 * a small surface gap rather than outlines) with the total — or the hovered activity's
 * share — in the middle, next to a ranked legend whose rows carry the share as a thin bar.
 * Text stays in text colors; the colored dot and bar carry identity.
 */
export function ActivityDonut({ slices, size = 156 }: ActivityDonutProps) {
  const theme = useChartTheme();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sorted = [...slices].sort((a, b) => b.seconds - a.seconds);
  const head = sorted.slice(0, MAX_SEGMENTS);
  const tail = sorted.slice(MAX_SEGMENTS);
  const shown: ActivityBreakdownSlice[] =
    tail.length > 0
      ? [
          ...head,
          {
            id: '__other',
            label: `Other (${tail.length})`,
            seconds: tail.reduce((sum, s) => sum + s.seconds, 0),
            color: '#94A3B8',
            trendPercent: 0,
            lastSessionDate: '',
          },
        ]
      : head;

  const total = shown.reduce((sum, s) => sum + s.seconds, 0);
  if (total === 0) {
    return <EmptyState icon="PieChart" title="Nothing tracked yet" description="Run a timer session to see where your time goes." />;
  }

  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const active = shown.find((s) => s.id === activeId);
  let cumulative = 0;

  return (
    <View className="gap-5 md:flex-row md:items-center">
      <View className="items-center">
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.track} strokeWidth={strokeWidth} fill="none" />
            {shown.map((slice) => {
              const full = (slice.seconds / total) * circumference;
              const length = Math.max(full - (shown.length > 1 ? SEGMENT_GAP : 0), 1);
              const offset = -cumulative;
              cumulative += full;
              const dimmed = activeId != null && activeId !== slice.id;
              return (
                <Circle
                  key={slice.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={slice.color}
                  strokeOpacity={dimmed ? 0.3 : 1}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${length} ${circumference}`}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
            })}
          </Svg>
          <View className="absolute inset-0 items-center justify-center px-6">
            <Text variant="h2" color="primary" numberOfLines={1}>
              {active ? `${Math.round((active.seconds / total) * 100)}%` : formatDuration(total)}
            </Text>
            <Text variant="body" color="muted" className="text-center text-[11px]" numberOfLines={1}>
              {active ? active.label : 'total tracked'}
            </Text>
          </View>
        </View>
      </View>

      <View className="gap-1 md:flex-1">
        {shown.map((slice) => {
          const pct = Math.round((slice.seconds / total) * 100);
          return (
            <Pressable
              key={slice.id}
              onHoverIn={() => setActiveId(slice.id)}
              onHoverOut={() => setActiveId(null)}
              onPress={() => setActiveId((c) => (c === slice.id ? null : slice.id))}
              className="gap-1.5 rounded-xl px-2 py-1.5 hover:bg-elevated"
            >
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                <Text variant="body" color="primary" className="flex-1 text-[13px] font-medium" numberOfLines={1}>
                  {slice.label}
                </Text>
                <Text variant="body" color="muted" className="text-[12px]" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatDuration(slice.seconds)}
                </Text>
                <Text variant="body" color="primary" className="w-10 text-right text-[12px] font-semibold" style={{ fontVariant: ['tabular-nums'] }}>
                  {pct}%
                </Text>
              </View>
              <View className="ml-[18px] h-1 overflow-hidden rounded-full" style={{ backgroundColor: theme.track }}>
                <View style={{ width: `${pct}%`, height: '100%', borderRadius: 999, backgroundColor: slice.color }} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
