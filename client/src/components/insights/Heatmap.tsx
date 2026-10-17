import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { HeatmapDay } from '../../types/insights';
import { hexToRgba } from '../../utils/color';
import { formatDuration } from '../../utils/formatTime';
import { Icon, Modal, Text } from '../ui';

export interface HeatmapProps {
  days: HeatmapDay[];
}

const CELL_SIZE = 12;
const CELL_GAP = 4;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Monday-first row indices to label (every other row) — printing all 7 crowded the gutter
 * for no benefit, since the grid only needs enough of them to anchor a glance. */
const WEEKDAY_LABELS: Record<number, string> = { 0: 'Mon', 2: 'Wed', 4: 'Fri' };

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
 * rather than squeezing ~26 weeks into a phone-width card.
 *
 * No hover/tap popup — a floating stat that appears and disappears over the grid read as
 * noisy and was easy to miss on touch devices anyway (hover doesn't fire on a phone tap).
 * Instead there's one fixed summary line that never changes, and a magnifying-glass button
 * that opens the full day-by-day breakdown in a modal on demand. */
export function Heatmap({ days }: HeatmapProps) {
  const themeColors = useThemeColors();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const levelOpacity: Record<HeatmapDay['level'], number> = { 0: 0, 1: 0.25, 2: 0.5, 3: 0.75, 4: 1 };

  const columns = useMemo(() => buildWeekColumns(days), [days]);
  const activeDays = useMemo(() => days.filter((d) => d.seconds > 0), [days]);
  const totalSeconds = useMemo(() => activeDays.reduce((sum, d) => sum + d.seconds, 0), [activeDays]);
  const sortedActiveDays = useMemo(() => [...activeDays].sort((a, b) => (a.date < b.date ? 1 : -1)), [activeDays]);

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between gap-3">
        <Text variant="caption" color="muted" className="flex-1 normal-case tracking-normal">
          {activeDays.length} active {activeDays.length === 1 ? 'day' : 'days'} · {formatDuration(totalSeconds)} tracked
        </Text>
        <Pressable
          onPress={() => setDetailsOpen(true)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="View day-by-day details"
          className="h-8 w-8 items-center justify-center rounded-full border border-subtle bg-base"
        >
          <Icon name="Search" size={14} color={themeColors.text.secondary} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row">
          {/* Weekday gutter — lines up under the month-label row above via the same
              top margin, so "Mon/Wed/Fri" anchor the grid's rows at a glance. */}
          <View className="mr-2" style={{ gap: CELL_GAP, marginTop: 16 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((row) => (
              <View key={row} style={{ height: CELL_SIZE, justifyContent: 'center' }}>
                {WEEKDAY_LABELS[row] && (
                  <Text variant="caption" color="muted" style={{ fontSize: 9.5 }} className="normal-case tracking-normal">
                    {WEEKDAY_LABELS[row]}
                  </Text>
                )}
              </View>
            ))}
          </View>

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
                  {col.cells.map((day, rowIndex) => (
                    <View
                      key={rowIndex}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        borderRadius: 3,
                        backgroundColor: !day
                          ? 'transparent'
                          : day.level === 0
                            ? themeColors.background.hover
                            : hexToRgba(themeColors.brand.tideTeal, levelOpacity[day.level]),
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="mt-3 flex-row items-center gap-1.5 self-end">
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

      <Modal
        visible={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Tracked Days"
        subtitle={`${activeDays.length} of the last ${days.length} days`}
        icon="CalendarDays"
      >
        <View className="gap-1 py-2">
          {sortedActiveDays.length === 0 ? (
            <Text variant="body" color="muted" className="py-6 text-center normal-case tracking-normal">
              No tracked time in this window yet.
            </Text>
          ) : (
            sortedActiveDays.map((day) => (
              <View key={day.date} className="flex-row items-center justify-between border-b border-subtle py-2.5">
                <Text variant="body" color="primary">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <Text variant="body" color="muted">
                  {formatDuration(day.seconds)}
                </Text>
              </View>
            ))
          )}
        </View>
      </Modal>
    </View>
  );
}
