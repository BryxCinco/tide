import { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { cn } from '../../utils/cn';
import { Button, Icon, Text } from '../ui';

export interface DurationPickerProps {
  /** Currently selected duration, seconds — highlights the matching preset chip. */
  value: number | null;
  onSelect: (seconds: number) => void;
}

const PRESETS_MIN = [5, 15, 25, 45, 60];

/** Preset chips (5/15/25/45/60 min, 25 labeled "Pomodoro") + a custom hours/minutes
 * stepper for anything else — covers the spec's two duration-entry paths in one component
 * rather than a separate modal for "Custom". */
export function DurationPicker({ value, onSelect }: DurationPickerProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(10);

  const isPresetSelected = (minutes: number) => value === minutes * 60;

  const applyCustom = () => {
    const total = customHours * 3600 + customMinutes * 60;
    if (total > 0) onSelect(total);
  };

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {PRESETS_MIN.map((minutes) => (
          <Pressable
            key={minutes}
            onPress={() => {
              setCustomOpen(false);
              onSelect(minutes * 60);
            }}
            className={cn(
              'rounded-full border-2 px-4 py-2.5',
              isPresetSelected(minutes) ? 'border-deep-purple bg-deep-purple/10' : 'border-subtle bg-base hover:border-default',
            )}
          >
            <Text variant="body" color={isPresetSelected(minutes) ? 'primary' : 'secondary'} className={cn('normal-case tracking-normal', isPresetSelected(minutes) && 'font-semibold')}>
              {minutes} min{minutes === 25 ? ' · Pomodoro' : ''}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setCustomOpen((v) => !v)}
          className={cn('rounded-full border-2 px-4 py-2.5', customOpen ? 'border-deep-purple bg-deep-purple/10' : 'border-subtle bg-base hover:border-default')}
        >
          <Text variant="body" color={customOpen ? 'primary' : 'secondary'} className={cn('normal-case tracking-normal', customOpen && 'font-semibold')}>
            Custom
          </Text>
        </Pressable>
      </View>

      {customOpen && (
        <View className="flex-row flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-xl border border-subtle bg-base p-4">
          <View className="flex-row items-center gap-4">
            <Stepper label="hours" value={customHours} onChange={setCustomHours} max={12} />
            <Text variant="h2" color="muted">
              :
            </Text>
            <Stepper label="min" value={customMinutes} onChange={setCustomMinutes} max={59} step={5} />
          </View>
          <Button title="Set" variant="primary" size="sm" onPress={applyCustom} />
        </View>
      )}
    </View>
  );
}

function Stepper({ label, value, onChange, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; max: number; step?: number }) {
  return (
    <View className="items-center gap-1">
      <View className="flex-row items-center gap-2">
        <Pressable onPress={() => onChange(Math.max(0, value - step))} hitSlop={6} className="h-7 w-7 items-center justify-center rounded-full bg-elevated">
          <Icon name="Minus" size={14} />
        </Pressable>
        <Text variant="h3" color="primary" style={{ minWidth: 32, textAlign: 'center' }}>
          {value}
        </Text>
        <Pressable onPress={() => onChange(Math.min(max, value + step))} hitSlop={6} className="h-7 w-7 items-center justify-center rounded-full bg-elevated">
          <Icon name="Plus" size={14} />
        </Pressable>
      </View>
      <Text variant="caption" color="muted" className="normal-case tracking-normal">
        {label}
      </Text>
    </View>
  );
}
