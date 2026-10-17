import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { HeatmapDay } from '../../types/insights';
import { hexToRgba } from '../../utils/color';
import { formatDuration } from '../../utils/formatTime';
import { Text } from '../ui';

export interface HeatmapProps {
  days: HeatmapDay[];
}

const CELL_SIZE = 11;
const CELL_GAP = 3;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Monday-first day-of-week index (0-6) for a Sunday-first JS `Date#getDay()` — matches
 * CalendarPicker.tsx's own convention elsewhere in the app. */
function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

interface GridColumn {
  /** One of this column's 7 cells, Monday first — undefined for a leading/trailing slot
   * the real data doesn't reach (the first partial week at the start of the window, or
   * today's not-yet-complete week at the end). */
  cells: (HeatmapDay | undefined)[];
  /** Set when this column is the first one a new calendar month's days land in — drives
   * the small month label printed above it. */
  monthLabel: string | null;
}

/** Buckets a flat, chronological list of days into GitHub-style calendar-aligned week
 * columns (Monday-first), padding the first/last column with `undefined` slots so every
 * column is a real Mon-Sun week rather than an arbitrary run of 7 array entries — that's
 * what makes the grid's rows read as actual days-of-week instead of a meaningless offset. */
function buildWeekColumns(days: HeatmapDay[]): GridColumn[] {
  if (days.length === 0) return [];

  const first = new Date(days[0].date);
  const leadingBlanks = mondayIndex(first.getDay());

  const columns: GridColumn[] = [];
  let seenMonths = new Set<number>();

  const pushDay = (day: HeatmapDay | undefined, dateForRow: Date) => {
    const row = mondayIndex(dateForRow.getDay());
    if (row === 0 || columns.length === 0) {
      const monthIndex = dateForRow.getMonth();
      const isNewMonth = !seenMonths.has(monthIndex);
      if (isNewMonth) seenMonths = new Set([monthIndex]);
      columns.push({ cells: new Array(7).fill(undefined), monthLabel: isNewMonth ? MONTH_LABELS[monthIndex] : null });
    }
    columns[columns.length - 1].cells[row] = day;
  };

  // Leading blanks — the partial week before the data actually starts, so column 0 still
  // represents a real Monday-Sunday week.
  for (let i = 0; i < leadingBlanks; i++) {
    const placeholderDate = new Date(first);
    placeholderDate.setDate(first.getDate() - (leadingBlanks - i));
    pushDay(undefined, placeholderDate);
  }

  for (const day of days) {
    pushDay(day, new Date(day.date));
  }

  return columns;
}

/** GitHub-style contribution grid spanning roughly the last 6 months — calendar-aligned
 * week columns (Monday-first rows), opacity-scaled teal per level (0-4), small enough
 * cells that the whole window fits without dominating the card. Horizontally scrollable
 * (not flex-shrunk to fit) so cells stay a legible, tappable size on any screen width
 * rather than squeezing ~26 weeks into a phone-width card. */
export function Heatmap({ days }: HeatmapProps) {
  const themeColors = useThemeColors();
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const hoveredDay = days.find((d) => d.date === hoveredDate);

  const levelOpacity: Record<HeatmapDay['level'], number> = { 0: 0, 1: 0.25, 2: 0.5, 3: 0.75, 4: 1 };

  const columns = useMemo(() => buildWeekColumns(days), [days]);

  return (
    <View>
      <View className="mb-2 h-5 flex-row items-center">
        <Text variant="caption" color="primary" className="normal-case tracking-normal">
          {hoveredDay
            ? `${new Date(hoveredDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${
                hoveredDay.seconds > 0 ? formatDuration(hoveredDay.seconds) : 'No tracked time'
              }`
            : ''}
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View className="mb-1 flex-row" style={{ gap: CELL_GAP }}>
            {columns.map((col, i) => (
              <View key={i} style={{ width: CELL_SIZE }}>
                {col.monthLabel && (
                  <Text variant="caption" color="muted" style={{ fontSize: 10 }} className="normal-case tracking-normal">
                    {col.monthLabel}
                  </Text>
                )}
              </View>
            ))}
          </View>

          <View className="flex-row" style={{ gap: CELL_GAP }}>
            {columns.map((col, colIndex) => (
              <View key={colIndex} style={{ gap: CELL_GAP }}>
                {col.cells.map((day, rowIndex) => {
                  if (!day) {
                    return <View key={rowIndex} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
                  }
                  const isHovered = hoveredDate === day.date;
                  return (
                    <Pressable
                      key={rowIndex}
                      onHoverIn={() => setHoveredDate(day.date)}
                      onHoverOut={() => setHoveredDate(null)}
                      onPress={() => setHoveredDate((current) => (current === day.date ? null : day.date))}
                      hitSlop={2}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        borderRadius: 2.5,
                        backgroundColor:
                          day.level === 0 ? themeColors.background.hover : hexToRgba(themeColors.brand.tideTeal, levelOpacity[day.level]),
                        borderWidth: isHovered ? 1.5 : 0,
                        borderColor: themeColors.text.primary,
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="mt-2 flex-row items-center gap-1.5 self-end">
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          Less
        </Text>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <View
            key={level}
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              backgroundColor:
                level === 0 ? themeColors.background.hover : hexToRgba(themeColors.brand.tideTeal, levelOpacity[level]),
            }}
          />
        ))}
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          More
        </Text>
      </View>
    </View>
  );
}
