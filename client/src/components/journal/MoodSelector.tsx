import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { MOOD_ORDER, type Mood } from '../../types/journal';
import { cn } from '../../utils/cn';
import { hexToRgba } from '../../utils/color';
import { Icon, Text } from '../ui';
import { MOOD_ICON_MAP } from './MoodIcon';

export interface MoodSelectorProps {
  value: Mood | null;
  /** Tapping the already-selected mood clears it (passes `null`). */
  onChange: (mood: Mood | null) => void;
  className?: string;
}

/** Horizontal row of 5 mood icon buttons — tinted bg + colored ring + scale on selection. */
export function MoodSelector({ value, onChange, className }: MoodSelectorProps) {
  const selectedConfig = value ? MOOD_ICON_MAP[value] : undefined;

  return (
    <View className={cn('gap-2', className)}>
      <View className="flex-row justify-between">
        {MOOD_ORDER.map((mood) => {
          const config = MOOD_ICON_MAP[mood];
          const isSelected = mood === value;
          return (
            <Pressable
              key={mood}
              onPress={() => onChange(isSelected ? null : mood)}
              hitSlop={4}
              className={cn('h-12 w-12 items-center justify-center rounded-full border-2', isSelected && 'scale-105')}
              style={{
                borderColor: isSelected ? config.color : 'transparent',
                backgroundColor: isSelected ? hexToRgba(config.color, 0.1) : 'transparent',
              }}
            >
              <Icon name={config.icon} size={22} color={isSelected ? config.color : '#9CA3AF'} />
            </Pressable>
          );
        })}
      </View>
      <Text
        variant="caption"
        color={selectedConfig ? 'accent' : 'muted'}
        className="text-center normal-case tracking-normal"
        style={selectedConfig ? { color: selectedConfig.color } : undefined}
      >
        {selectedConfig ? `Feeling ${selectedConfig.label.toLowerCase()}` : 'How are you feeling?'}
      </Text>
    </View>
  );
}
