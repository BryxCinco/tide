import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useResponsive } from '../../hooks/useResponsive';
import type { TaskFilter, TaskSort } from '../../store/taskStore';
import { cn } from '../../utils/cn';
import { Icon, Text, type IconName } from '../ui';

const FILTERS: { value: TaskFilter; label: string; icon: IconName }[] = [
  { value: 'all', label: 'All', icon: 'LayoutList' },
  { value: 'today', label: 'Today', icon: 'Sun' },
  { value: 'overdue', label: 'Overdue', icon: 'AlertTriangle' },
  { value: 'done', label: 'Done', icon: 'CheckCheck' },
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

/** Segmented filter (with icons on wider screens) on the left, a compact sort switch on the right — wraps to
 * two lines on phone. */
export function TaskFilters({ filter, sort, onFilterChange, onSortChange }: TaskFiltersProps) {
  // Four icon+label segments don't fit a phone's width — labels only there.
  const { isPhone } = useResponsive();
  return (
    <View className="gap-3 md:flex-row md:items-center md:justify-between">
      <View className="flex-row rounded-2xl border border-subtle bg-base p-1">
        {FILTERS.map((option) => {
          const selected = filter === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onFilterChange(option.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              className={cn('flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-3 py-2 md:flex-none', selected && 'bg-surface')}
              style={
                selected
                  ? { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 1 }
                  : undefined
              }
            >
              {!isPhone && <Icon name={option.icon} size={14} color={selected ? '#14B8A6' : undefined} />}
              <Text variant="body" color={selected ? 'primary' : 'muted'} className={cn('text-[13px]', selected ? 'font-semibold' : 'font-medium')}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row items-center gap-1">
        <Icon name="ArrowUpDown" size={13} />
        <Text variant="body" color="muted" className="mr-1 text-[12px] font-medium">
          Sort
        </Text>
        {SORTS.map((option) => {
          const selected = sort === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSortChange(option.value)}
              className={cn('rounded-full px-2.5 py-1', selected && 'bg-tide-teal/10')}
            >
              <Text variant="body" className={cn('text-[12px]', selected ? 'font-semibold text-tide-teal' : 'font-medium text-muted')}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
