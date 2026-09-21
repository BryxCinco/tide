import { Pressable, View } from 'react-native';

import type { JournalFilter } from '../../store/journalStore';
import { MOOD_ORDER, type Mood } from '../../types/journal';
import { cn } from '../../utils/cn';
import { Icon, Text } from '../ui';
import { MOOD_ICON_MAP } from './MoodIcon';

const FILTERS: { value: JournalFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'favorites', label: 'Favorites' },
];

export interface JournalFiltersProps {
  filter: JournalFilter;
  moodFilter: Mood | null;
  onFilterChange: (filter: JournalFilter) => void;
  onMoodFilterChange: (mood: Mood | null) => void;
}

export function JournalFilters({ filter, moodFilter, onFilterChange, onMoodFilterChange }: JournalFiltersProps) {
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {FILTERS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onFilterChange(option.value)}
            className={cn(
              'rounded-full border px-3 py-1.5',
              filter === option.value ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base',
            )}
          >
            <Text variant="caption" color={filter === option.value ? 'accent' : 'secondary'} className="normal-case tracking-normal">
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="flex-row flex-wrap gap-2">
        {MOOD_ORDER.map((mood) => {
          const config = MOOD_ICON_MAP[mood];
          const isSelected = moodFilter === mood;
          return (
            <Pressable
              key={mood}
              onPress={() => onMoodFilterChange(isSelected ? null : mood)}
              className={cn(
                'flex-row items-center gap-1.5 rounded-full border px-2.5 py-1',
                isSelected ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base',
              )}
            >
              <Icon name={config.icon} size={13} color={isSelected ? config.color : '#9CA3AF'} />
              <Text
                variant="caption"
                color={isSelected ? 'accent' : 'secondary'}
                className="normal-case tracking-normal"
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
