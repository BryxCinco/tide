import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { CustomInsightsRange, InsightsRange, MonthYearRange } from '../../types/insights';
import { cn } from '../../utils/cn';
import { formatDateKeyShort, formatMonthYear, toDateKey } from '../../utils/formatDate';
import { Button, CalendarPicker, Icon, Modal, Text } from '../ui';

export interface TimeFilterProps {
  value: InsightsRange;
  customRange?: CustomInsightsRange;
  monthYearRange: MonthYearRange;
  onChange: (range: InsightsRange, customRange?: CustomInsightsRange) => void;
  onMonthYearChange: (monthYear: MonthYearRange) => void;
}

const RANGE_OPTIONS: { value: InsightsRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'monthYear', label: 'Pick a Month' },
  { value: 'custom', label: 'Custom' },
];

const thisMonth = new Date().getMonth() + 1;
const thisYear = new Date().getFullYear();

function isCurrentOrFutureMonth(month: number, year: number): boolean {
  return year > thisYear || (year === thisYear && month >= thisMonth);
}

/**
 * Horizontally-scrolling chip row rather than a fixed-width segmented control — the option
 * count (plus "Pick a Month"'s variable-width selected label) doesn't reliably fit a
 * phone's width as equal-size segments. "This Year"/"All Time" are deliberately gone —
 * they fed 365 data points through TimeChart/MoodTrend, which were only ever built for a
 * week/month's worth (each bar/label needs real screen width). "Pick a Month" replaces
 * both: any single calendar month is at most 31 days, the same order of magnitude "This
 * Month" already renders fine.
 */
export function TimeFilter({ value, customRange, monthYearRange, onChange, onMonthYearChange }: TimeFilterProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  // Draft state so picking "From" then "To" doesn't apply a half-finished range on every tap.
  const [draftStart, setDraftStart] = useState<string | undefined>(customRange?.start);
  const [draftEnd, setDraftEnd] = useState<string | undefined>(customRange?.end);
  const [pickingField, setPickingField] = useState<'start' | 'end'>('start');
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  const openCustomPicker = () => {
    setDraftStart(customRange?.start ?? toDateKey(new Date()));
    setDraftEnd(customRange?.end ?? toDateKey(new Date()));
    setPickingField('start');
    setPickerVisible(true);
  };

  const applyCustomRange = () => {
    if (!draftStart || !draftEnd) return;
    const [start, end] = draftStart <= draftEnd ? [draftStart, draftEnd] : [draftEnd, draftStart];
    onChange('custom', { start, end });
    setPickerVisible(false);
  };

  const stepMonth = (direction: -1 | 1) => {
    let { month, year } = monthYearRange;
    month += direction;
    if (month > 12) {
      month = 1;
      year += 1;
    } else if (month < 1) {
      month = 12;
      year -= 1;
    }
    if (isCurrentOrFutureMonth(month, year) && !(month === thisMonth && year === thisYear)) return;
    onMonthYearChange({ month, year });
  };

  const customLabel =
    value === 'custom' && customRange ? `${formatDateKeyShort(customRange.start)} - ${formatDateKeyShort(customRange.end)}` : 'Custom';
  const monthYearLabel = value === 'monthYear' ? formatMonthYear(monthYearRange.month, monthYearRange.year) : 'Pick a Month';

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
        {RANGE_OPTIONS.map((option) => {
          const selected = value === option.value;
          const handlePress = () => {
            if (option.value === 'custom') return openCustomPicker();
            if (option.value === 'monthYear') return setMonthPickerVisible(true);
            onChange(option.value);
          };
          return (
            <Pressable
              key={option.value}
              onPress={handlePress}
              className={cn(
                'flex-row items-center gap-1.5 rounded-full border px-3.5 py-1.5',
                selected ? 'border-tide-teal bg-tide-teal' : 'border-subtle bg-elevated hover:border-default',
              )}
            >
              {option.value === 'custom' && <Icon name="CalendarRange" size={13} color={selected ? '#FFFFFF' : undefined} />}
              {option.value === 'monthYear' && <Icon name="Calendar" size={13} color={selected ? '#FFFFFF' : undefined} />}
              <Text
                variant="caption"
                color={selected ? 'inverse' : 'secondary'}
                className={cn('normal-case tracking-normal', selected && 'font-semibold')}
              >
                {option.value === 'custom' ? customLabel : option.value === 'monthYear' ? monthYearLabel : option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal visible={pickerVisible} onClose={() => setPickerVisible(false)} title="Custom Range" icon="CalendarRange" size="sm">
        <View className="gap-4">
          <View className="flex-row rounded-full border border-subtle bg-elevated p-1">
            {(['start', 'end'] as const).map((field) => (
              <Pressable
                key={field}
                onPress={() => setPickingField(field)}
                className={cn('flex-1 items-center rounded-full py-2', pickingField === field && 'bg-tide-teal')}
              >
                <Text variant="caption" color={pickingField === field ? 'inverse' : 'secondary'} className="normal-case tracking-normal">
                  {field === 'start' ? 'From' : 'To'} · {field === 'start' ? (draftStart ? formatDateKeyShort(draftStart) : '—') : draftEnd ? formatDateKeyShort(draftEnd) : '—'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="items-center">
            <CalendarPicker
              value={pickingField === 'start' ? draftStart : draftEnd}
              onChange={(key) => {
                if (pickingField === 'start') {
                  setDraftStart(key);
                  setPickingField('end');
                } else {
                  setDraftEnd(key);
                }
              }}
            />
          </View>

          <Button title="Apply Range" variant="primary" size="lg" fullWidth onPress={applyCustomRange} disabled={!draftStart || !draftEnd} />
        </View>
      </Modal>

      <Modal visible={monthPickerVisible} onClose={() => setMonthPickerVisible(false)} title="Pick a Month" icon="Calendar" size="sm">
        <View className="items-center gap-6 py-2">
          <View className="flex-row items-center gap-6">
            <Pressable onPress={() => stepMonth(-1)} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full border border-subtle">
              <Icon name="ChevronLeft" size={18} />
            </Pressable>
            <Text variant="h2" color="primary" style={{ minWidth: 140, textAlign: 'center' }}>
              {formatMonthYear(monthYearRange.month, monthYearRange.year)}
            </Text>
            <Pressable
              onPress={() => stepMonth(1)}
              disabled={isCurrentOrFutureMonth(monthYearRange.month, monthYearRange.year)}
              hitSlop={8}
              className={cn(
                'h-10 w-10 items-center justify-center rounded-full border border-subtle',
                isCurrentOrFutureMonth(monthYearRange.month, monthYearRange.year) && 'opacity-30',
              )}
            >
              <Icon name="ChevronRight" size={18} />
            </Pressable>
          </View>

          <Button
            title="View This Month"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => {
              onChange('monthYear');
              setMonthPickerVisible(false);
            }}
          />
        </View>
      </Modal>
    </>
  );
}
