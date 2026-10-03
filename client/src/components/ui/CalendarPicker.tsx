import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useThemeColors } from '../../hooks/useThemeColors';
import { cn } from '../../utils/cn';
import { fromDateKey, toDateKey } from '../../utils/formatDate';
import { Icon } from './Icon';
import { Pressable } from './SoundPressable';
import { Text } from './Text';

export interface CalendarPickerProps {
  /** Selected date as a local "YYYY-MM-DD" key, or undefined for none selected. */
  value?: string;
  onChange: (dateKey: string) => void;
  /** Earliest selectable date (inclusive), as a "YYYY-MM-DD" key. */
  minDate?: string;
  /** Latest selectable date (inclusive), as a "YYYY-MM-DD" key. */
  maxDate?: string;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

/** Monday-first day-of-week index (0-6) for a Sunday-first JS `Date#getDay()`. */
function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

interface CalendarCell {
  dateKey: string;
  day: number;
  inCurrentMonth: boolean;
}

function buildMonthGrid(monthAnchor: Date): CalendarCell[] {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = mondayIndex(firstOfMonth.getDay());

  const cells: CalendarCell[] = [];

  // Trailing days of the previous month, so the grid always starts on a Monday.
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  for (let i = leadingBlanks - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = new Date(year, month - 1, day);
    cells.push({ dateKey: toDateKey(date), day, inCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ dateKey: toDateKey(new Date(year, month, day)), day, inCurrentMonth: true });
  }

  // Trailing days of the next month, padded out to a full 6-row (42-cell) grid so the
  // grid's height never changes between months — that's what makes the month transition
  // animation read as a clean crossfade instead of the whole card resizing under it.
  let nextDay = 1;
  while (cells.length < 42) {
    const date = new Date(year, month + 1, nextDay);
    cells.push({ dateKey: toDateKey(date), day: nextDay, inCurrentMonth: false });
    nextDay += 1;
  }

  return cells;
}

/**
 * Custom month-grid date picker — Linear/Notion-style, not the OS native picker. Pure and
 * controlled: the caller owns the selected value and renders this inside its own Modal (see
 * TaskFormModal.tsx's Due Date field), rather than this component managing its own visibility.
 */
export function CalendarPicker({ value, onChange, minDate, maxDate }: CalendarPickerProps) {
  const themeColors = useThemeColors();
  const [monthAnchor, setMonthAnchor] = useState(() => (value ? fromDateKey(value) : new Date()));

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const monthKey = `${monthAnchor.getFullYear()}-${monthAnchor.getMonth()}`;
  const cells = useMemo(() => buildMonthGrid(monthAnchor), [monthKey]);

  const goToMonth = (offset: number) => {
    setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  // The already-selected value is never disabled, even if it falls outside [minDate,
  // maxDate] — this is what lets a task keep its existing past due date selectable while
  // editing (TaskFormModal always passes minDate=today), without every other past date
  // opening back up too.
  const isDisabled = (dateKey: string) =>
    dateKey !== value && Boolean((minDate && dateKey < minDate) || (maxDate && dateKey > maxDate));

  return (
    <View style={{ width: '100%', maxWidth: 296 }}>
      <View className="mb-3 flex-row items-center justify-between">
        <Pressable
          onPress={() => goToMonth(-1)}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full hover:bg-elevated"
        >
          <Icon name="ChevronLeft" size={18} color={themeColors.text.secondary} />
        </Pressable>
        <Text variant="body" color="primary" className="font-semibold">
          {MONTH_FORMATTER.format(monthAnchor)}
        </Text>
        <Pressable
          onPress={() => goToMonth(1)}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full hover:bg-elevated"
        >
          <Icon name="ChevronRight" size={18} color={themeColors.text.secondary} />
        </Pressable>
      </View>

      <View className="flex-row">
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={{ width: `${100 / 7}%` }} className="items-center py-1.5">
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Keyed on the month so a month change crossfades the whole grid rather than each
          cell repositioning individually. */}
      <Animated.View key={monthKey} entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} className="flex-row flex-wrap">
        {cells.map((cell) => {
          // Adjacent-month padding cells render as empty placeholders (not dimmed digits)
          // so there's nothing tappable that could be mistaken for a current-month date.
          if (!cell.inCurrentMonth) {
            return <View key={cell.dateKey} style={{ width: `${100 / 7}%` }} className="h-9 py-0.5" />;
          }

          const selected = value === cell.dateKey;
          const isToday = cell.dateKey === todayKey;
          const disabled = isDisabled(cell.dateKey);
          const textColor = selected ? 'inverse' : disabled ? 'muted' : 'primary';

          return (
            <View key={cell.dateKey} style={{ width: `${100 / 7}%` }} className="items-center py-0.5">
              <Pressable
                onPress={disabled ? undefined : () => onChange(cell.dateKey)}
                disabled={disabled}
                className={cn('h-9 w-9 items-center justify-center rounded-full', selected && 'bg-tide-teal')}
              >
                <Text variant="body" color={textColor} className="normal-case tracking-normal">
                  {cell.day}
                </Text>
                {isToday && !selected && (
                  <View className="absolute bottom-1 h-1 w-1 rounded-full bg-tide-teal" pointerEvents="none" />
                )}
              </Pressable>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}
