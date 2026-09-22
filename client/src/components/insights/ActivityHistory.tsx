import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { ActivityBreakdownSlice } from '../../types/insights';
import { cn } from '../../utils/cn';
import { formatDateKeyShort } from '../../utils/formatDate';
import { formatDuration } from '../../utils/formatTime';
import { Icon, Text } from '../ui';

export interface ActivityHistoryProps {
  slices: ActivityBreakdownSlice[];
}

type SortKey = 'time' | 'name' | 'trend';

/** Deterministic (id-seeded, not Math.random) illustrative session breakdown for the
 * expanded row — same mock convention as the rest of mockInsights.ts. */
function mockSessionsFor(slice: ActivityBreakdownSlice): { date: string; seconds: number }[] {
  const seed = slice.id.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const fractions = [0.5, 0.3, 0.2];
  return fractions.map((fraction, i) => {
    const date = new Date(slice.lastSessionDate);
    date.setDate(date.getDate() - i * (1 + (seed % 3)));
    return { date: date.toISOString().slice(0, 10), seconds: Math.round(slice.seconds * fraction) };
  });
}

function SortButton({ label, active, direction, onPress }: { label: string; active: boolean; direction: 'asc' | 'desc'; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-1 py-1">
      <Text variant="caption" color={active ? 'accent' : 'muted'} className={cn('normal-case tracking-normal', active && 'font-semibold')}>
        {label}
      </Text>
      {active && <Icon name={direction === 'desc' ? 'ChevronDown' : 'ChevronUp'} size={12} color="#14B8A6" />}
    </Pressable>
  );
}

/**
 * Sortable table below ActivityDonut — same mock activityBreakdown data (illustrative,
 * like the rest of this Insights screen pending Phase 10's real backend), extended with
 * trend/lastSessionDate. Tapping a row expands a small deterministic session breakdown.
 */
export function ActivityHistory({ slices }: ActivityHistoryProps) {
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    const dir = sortDir === 'desc' ? -1 : 1;
    return [...slices].sort((a, b) => {
      if (sortKey === 'name') return dir * a.label.localeCompare(b.label);
      if (sortKey === 'trend') return dir * (a.trendPercent - b.trendPercent);
      return dir * (a.seconds - b.seconds);
    });
  }, [slices, sortKey, sortDir]);

  return (
    <View className="mt-5 gap-2 border-t border-subtle pt-4">
      <View className="flex-row items-center justify-between">
        <Text variant="label" color="muted">
          History
        </Text>
        <View className="flex-row gap-4">
          <SortButton label="Time" active={sortKey === 'time'} direction={sortDir} onPress={() => toggleSort('time')} />
          <SortButton label="Name" active={sortKey === 'name'} direction={sortDir} onPress={() => toggleSort('name')} />
          <SortButton label="Trend" active={sortKey === 'trend'} direction={sortDir} onPress={() => toggleSort('trend')} />
        </View>
      </View>

      <View className="gap-1">
        {sorted.map((slice) => {
          const isExpanded = expandedId === slice.id;
          return (
            <View key={slice.id}>
              <Pressable
                onPress={() => setExpandedId(isExpanded ? null : slice.id)}
                className="flex-row items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-elevated"
              >
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                <Text variant="body" color="primary" className="flex-1 font-medium" numberOfLines={1}>
                  {slice.label}
                </Text>
                <Text variant="caption" color="muted" className="w-20 text-right normal-case tracking-normal">
                  {formatDuration(slice.seconds)}
                </Text>
                <View className="w-14 flex-row items-center justify-end gap-0.5">
                  <Icon
                    name={slice.trendPercent > 0 ? 'ArrowUp' : slice.trendPercent < 0 ? 'ArrowDown' : 'Minus'}
                    size={12}
                    color={slice.trendPercent > 0 ? '#14B8A6' : slice.trendPercent < 0 ? '#EF4444' : '#9CA3AF'}
                  />
                  <Text
                    variant="caption"
                    className="normal-case tracking-normal"
                    style={{ color: slice.trendPercent > 0 ? '#14B8A6' : slice.trendPercent < 0 ? '#EF4444' : '#9CA3AF' }}
                  >
                    {Math.abs(slice.trendPercent)}%
                  </Text>
                </View>
                <Icon name="ChevronRight" size={14} color="#9CA3AF" style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }} />
              </Pressable>

              {isExpanded && (
                <View className="ml-5 gap-1 border-l border-subtle pb-2 pl-4">
                  {mockSessionsFor(slice).map((session, i) => (
                    <View key={i} className="flex-row items-center justify-between py-1">
                      <Text variant="caption" color="muted" className="normal-case tracking-normal">
                        {formatDateKeyShort(session.date)}
                      </Text>
                      <Text variant="caption" color="secondary" className="normal-case tracking-normal">
                        {formatDuration(session.seconds)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
