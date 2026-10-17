import { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { DayTimeEntry } from '../../types/insights';
import { formatDuration } from '../../utils/formatTime';
import { Text } from '../ui';
import { niceTimeTicks, useChartTheme } from './chartTheme';

export interface TimeChartProps {
  data: DayTimeEntry[];
  height?: number;
}

const Y_AXIS_WIDTH = 30;
const MAX_BAR_WIDTH = 24;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Daily tracked time as columns: clean hour ticks with hairline gridlines, thin columns
 * (capped at 24px, 4px rounded tops, square at the baseline), today and the hovered/tapped
 * day in the full teal while the rest sit in a softer step of the same hue, and a hairline
 * average line labelled at the right edge. Plain Views (no chart library) so it reflows at
 * any width on web and native alike.
 */
export function TimeChart({ data, height = 168 }: TimeChartProps) {
  const theme = useChartTheme();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const maxSeconds = Math.max(...data.map((d) => d.seconds), 1);
  const { top, ticks } = niceTimeTicks(maxSeconds);
  const tracked = data.filter((d) => d.seconds > 0);
  const average = tracked.length > 0 ? tracked.reduce((sum, d) => sum + d.seconds, 0) / tracked.length : 0;
  const today = todayKey();

  // Thin the x labels as the window grows (a month of labels is an unreadable smear).
  const labelStep = Math.max(1, Math.ceil(data.length / 8));
  const gap = data.length > 20 ? 2 : data.length > 10 ? 4 : 8;
  const yFor = (seconds: number) => height - (seconds / top) * height;
  const active = activeIndex != null ? data[activeIndex] : null;

  return (
    <View className="gap-2">
      {/* Readout line — the hovered/tapped day, otherwise the window's average. */}
      <View className="h-6 flex-row items-center gap-2">
        {active ? (
          <>
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.accent }} />
            <Text variant="body" color="primary" className="text-[13px] font-semibold">
              {formatDuration(active.seconds)}
            </Text>
            <Text variant="body" color="muted" className="text-[12px]">
              {active.label} · {new Date(active.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </>
        ) : (
          <Text variant="body" color="muted" className="text-[12px]">
            Tap a day for its total · avg {formatDuration(Math.round(average))} on tracked days
          </Text>
        )}
      </View>

      <View className="flex-row">
        {/* Y axis */}
        <View style={{ width: Y_AXIS_WIDTH, height }}>
          {ticks.map((tick) => (
            <Text
              key={tick.value}
              variant="body"
              color="muted"
              style={{ position: 'absolute', top: yFor(tick.value) - 7, right: 6, fontSize: 10, fontVariant: ['tabular-nums'] }}
            >
              {tick.label}
            </Text>
          ))}
        </View>

        <View className="flex-1" style={{ height }}>
          {/* Gridlines */}
          {ticks.map((tick) => (
            <View
              key={tick.value}
              pointerEvents="none"
              style={{ position: 'absolute', left: 0, right: 0, top: yFor(tick.value), height: 1, backgroundColor: theme.grid }}
            />
          ))}

          {/* Columns */}
          <View className="flex-1 flex-row items-end" style={{ gap }}>
            {data.map((entry, index) => {
              const isActive = activeIndex === index;
              const isToday = entry.date === today;
              const barHeight = entry.seconds > 0 ? Math.max((entry.seconds / top) * height, 4) : 0;
              return (
                <Pressable
                  key={entry.date}
                  onHoverIn={() => setActiveIndex(index)}
                  onHoverOut={() => setActiveIndex(null)}
                  onPress={() => setActiveIndex((current) => (current === index ? null : index))}
                  accessibilityLabel={`${entry.label}: ${formatDuration(entry.seconds)}`}
                  className="flex-1 items-center justify-end"
                  style={{ height }}
                >
                  <View
                    style={{
                      width: '100%',
                      maxWidth: MAX_BAR_WIDTH,
                      height: barHeight,
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                      backgroundColor: isActive || isToday ? theme.accent : theme.accentSoft,
                    }}
                  />
                </Pressable>
              );
            })}
          </View>

          {/* Average reference line — solid hairline, labelled at its right end. */}
          {average > 0 && (
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: yFor(average) }}>
              <View style={{ height: 1, backgroundColor: theme.accent, opacity: 0.55 }} />
              <View className="absolute left-1 rounded-md px-1.5 py-0.5" style={{ top: -18, backgroundColor: theme.surface }}>
                <Text variant="body" color="muted" style={{ fontSize: 10 }}>
                  avg
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* X axis */}
      <View className="flex-row" style={{ marginLeft: Y_AXIS_WIDTH, gap }}>
        {data.map((entry, index) => (
          <View key={entry.date} className="flex-1 items-center">
            <Text
              variant="body"
              color={entry.date === today ? 'primary' : 'muted'}
              className={entry.date === today ? 'font-semibold' : undefined}
              style={{ fontSize: 11 }}
              numberOfLines={1}
            >
              {index % labelStep === 0 ? entry.label : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
