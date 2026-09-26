import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { TaskFilter, TaskSort } from '../../store/taskStore';
import { cn } from '../../utils/cn';
import { Text } from '../ui';

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'done', label: 'Done' },
];

const SORTS: { value: TaskSort; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'created', label: 'Created' },
];

export interface TaskFiltersProps {
  filter: TaskFilter;
  sort: TaskSort;
  onFilterChange: (filter: TaskFilter) => void;
  onSortChange: (sort: TaskSort) => void;
}

export function TaskFilters({ filter, sort, onFilterChange, onSortChange }: TaskFiltersProps) {
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
            <Text
              variant="caption"
              color={filter === option.value ? 'accent' : 'secondary'}
              className="normal-case tracking-normal"
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="flex-row flex-wrap items-center gap-3">
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          Sort by
        </Text>
        {SORTS.map((option) => (
          <Pressable key={option.value} onPress={() => onSortChange(option.value)}>
            <Text
              variant="caption"
              color={sort === option.value ? 'accent' : 'muted'}
              className={cn('normal-case tracking-normal', sort === option.value && 'font-medium')}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
