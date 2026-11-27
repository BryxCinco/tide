import { View } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { isTaskOverdue, useTaskStore } from '../../store/taskStore';
import type { Task, TaskStatus } from '../../types/task';
import { cn } from '../../utils/cn';
import { hexToRgba } from '../../utils/color';
import { formatDateKeyCompact } from '../../utils/formatDate';
import { BOARD_COLUMNS, canMoveTask } from '../../utils/taskBoard';
import { ocean } from '../../utils/theme';
import { Icon, Text, useGlassSurface } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { OptionList, Popover } from './Popover';
import { PRIORITY_META } from './TaskCard';

export const STATUS_OPTIONS = BOARD_COLUMNS.map((c) => ({ value: c.status, label: c.label, color: c.color }));

export function StatusChip({ task }: { task: Task }) {
  const moveTask = useTaskStore((s) => s.moveTask);
  const col = BOARD_COLUMNS.find((c) => c.status === task.status)!;
  const chip = (
    <View className="flex-row items-center gap-1 rounded-md px-1.5 py-0.5" style={{ backgroundColor: hexToRgba(col.color, 0.14) }}>
      <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: col.color }} />
      <Text variant="body" className="text-[11.5px] font-medium" style={{ color: col.color }}>
        {col.label}
      </Text>
      {canMoveTask(task) && <Icon name="ChevronDown" size={11} color={col.color} />}
    </View>
  );
  if (!canMoveTask(task)) return chip;
  return (
    <Popover trigger={chip} accessibilityLabel={`Status: ${col.label}. Change status`}>
      {(close) => (
        <OptionList<TaskStatus>
          options={STATUS_OPTIONS}
          value={task.status}
          onSelect={(status) => {
            moveTask(task.id, status);
            close();
          }}
        />
      )}
    </Popover>
  );
}

export interface BoardCardProps {
  task: Task;
  onOpen: () => void;
}

/** Compact Notion-style board card: check · title, then status, priority, due and tags. */
export function BoardCard({ task, onOpen }: BoardCardProps) {
  const theme = useThemeColors();
  const glass = useGlassSurface();
  const toggleTaskStatus = useTaskStore((s) => s.toggleTaskStatus);
  const isDone = task.status === 'done';
  const priority = PRIORITY_META[task.priority];
  const overdue = isTaskOverdue(task);

  return (
    <View className="gap-2 rounded-2xl border p-3" style={overdue ? { ...glass, borderColor: 'rgba(251, 146, 60, 0.45)' } : glass}>
      <View className="flex-row items-start gap-2.5">
        <Pressable
          onPress={() => toggleTaskStatus(task.id)}
          disabled={isDone}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isDone, disabled: isDone }}
          accessibilityLabel={isDone ? `"${task.title}" is completed` : `Mark "${task.title}" as done`}
          className={cn('mt-[1px] h-[18px] w-[18px] items-center justify-center rounded-full', !isDone && 'border-[1.5px] border-[rgba(100,116,139,0.55)]')}
          style={isDone ? { backgroundColor: ocean.lagoon } : undefined}
        >
          {isDone && <Icon name="Check" size={12} strokeWidth={3} color="#FFFFFF" />}
        </Pressable>
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Open ${task.title}`} className="flex-1" style={{ minWidth: 0 }}>
          <Text variant="body" color={isDone ? 'muted' : 'primary'} className={cn('text-[14px] font-medium leading-[19px]', isDone && 'line-through')} numberOfLines={3}>
            {task.title}
          </Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap items-center gap-1.5 pl-[28px]">
        <StatusChip task={task} />
        <View className="flex-row items-center gap-1">
          <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priority.color }} />
          <Text variant="body" color="muted" className="text-[11.5px]">
            {priority.label}
          </Text>
        </View>
        {task.dueDate && (
          <View className="flex-row items-center gap-1">
            <Icon name="Calendar" size={11} color={overdue ? ocean.coral : theme.text.muted} />
            <Text variant="body" className="text-[11.5px]" style={{ color: overdue ? ocean.coral : theme.text.muted }}>
              {formatDateKeyCompact(task.dueDate)}
            </Text>
          </View>
        )}
        {task.tags.slice(0, 2).map((tag) => (
          <Text key={tag} variant="body" color="muted" className="text-[11.5px]">
            #{tag}
          </Text>
        ))}
      </View>
    </View>
  );
}
