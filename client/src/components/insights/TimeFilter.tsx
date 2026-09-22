import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { CustomInsightsRange, InsightsRange } from '../../types/insights';
import { cn } from '../../utils/cn';
import { formatDateKeyShort, toDateKey } from '../../utils/formatDate';
import { Button, CalendarPicker, Icon, Modal, Text } from '../ui';

export interface TimeFilterProps {
  value: InsightsRange;
  customRange?: CustomInsightsRange;
  onChange: (range: InsightsRange, customRange?: CustomInsightsRange) => void;
}

const RANGE_OPTIONS: { value: InsightsRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

/**
 * Horizontally-scrolling chip row rather than a fixed-width segmented control — 6 options
 * (including a variable-width "Custom" once a range is picked) don't reliably fit a phone's
 * width as equal-size segments the way the old 2-option Week/Month toggle did.
 */
export function TimeFilter({ value, customRange, onChange }: TimeFilterProps) {
  const [pickerVisible, setPickerVisible] = useState(false);
  // Draft state so picking "From" then "To" doesn't apply a half-finished range on every tap.
  const [draftStart, setDraftStart] = useState<string | undefined>(customRange?.start);
  const [draftEnd, setDraftEnd] = useState<string | undefined>(customRange?.end);
  const [pickingField, setPickingField] = useState<'start' | 'end'>('start');

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

  const customLabel =
    value === 'custom' && customRange ? `${formatDateKeyShort(customRange.start)} - ${formatDateKeyShort(customRange.end)}` : 'Custom';

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
        {RANGE_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => (option.value === 'custom' ? openCustomPicker() : onChange(option.value))}
              className={cn(
                'flex-row items-center gap-1.5 rounded-full border px-3.5 py-1.5',
                selected ? 'border-tide-teal bg-tide-teal' : 'border-subtle bg-elevated hover:border-default',
              )}
            >
              {option.value === 'custom' && <Icon name="CalendarRange" size={13} color={selected ? '#FFFFFF' : undefined} />}
              <Text
                variant="caption"
                color={selected ? 'inverse' : 'secondary'}
                className={cn('normal-case tracking-normal', selected && 'font-semibold')}
              >
                {option.value === 'custom' ? customLabel : option.label}
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
    </>
  );
}
