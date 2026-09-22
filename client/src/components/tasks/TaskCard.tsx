import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { Task, TaskPriority } from '../../types/task';
import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
import { Badge, Icon, Text, VisibleDeleteButton, type BadgeVariant } from '../ui';

const PRIORITY_BADGE: Record<TaskPriority, { label: string; variant: BadgeVariant }> = {
  low: { label: 'Low', variant: 'default' },
  medium: { label: 'Medium', variant: 'blue' },
  high: { label: 'High', variant: 'warning' },
  critical: { label: 'Critical', variant: 'error' },
};

export interface TaskCardProps {
  task: Task;
  /** Resolved name of the linked activity, if any — looked up by the caller. */
  activityName?: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskCard({ task, activityName, onToggle, onEdit, onDelete }: TaskCardProps) {
  const isDone = task.status === 'done';
  const priority = PRIORITY_BADGE[task.priority];

  return (
    <View className="flex-row items-start gap-3 rounded-xl border border-subtle bg-base p-3">
      <Pressable
        onPress={onToggle}
        hitSlop={6}
        className={cn(
          'mt-0.5 h-5 w-5 items-center justify-center rounded-full border',
          isDone ? 'border-tide-teal bg-tide-teal' : 'border-subtle bg-base',
        )}
      >
        {isDone && <Icon name="Check" size={12} color={colors.text.inverse} />}
      </Pressable>

      <Pressable onPress={onEdit} className="flex-1 gap-1.5">
        <Text variant="body" color={isDone ? 'muted' : 'primary'} className={cn('font-medium', isDone && 'line-through')}>
          {task.title}
        </Text>

        <View className="flex-row flex-wrap items-center gap-1.5">
          <Badge label={priority.label} variant={priority.variant} size="sm" />
          {task.dueDate && (
            <View className="flex-row items-center gap-1">
              <Icon name="Calendar" size={12} />
              <Text variant="caption" color="muted" className="normal-case tracking-normal">
                {task.dueDate}
              </Text>
            </View>
          )}
          {activityName && <Badge label={activityName} variant="teal" size="sm" />}
          {task.tags.map((tag) => (
            <Badge key={tag} label={tag} variant="default" size="sm" />
          ))}
        </View>
      </Pressable>

      <View className="flex-row items-center gap-1">
        <Pressable onPress={onEdit} hitSlop={6} className="h-8 w-8 items-center justify-center rounded-full hover:bg-elevated">
          <Icon name="Pencil" size={16} />
        </Pressable>
        <VisibleDeleteButton
          onConfirm={onDelete}
          confirmTitle="Delete task?"
          confirmMessage={`"${task.title}" will be removed. This can't be undone.`}
        />
      </View>
    </View>
  );
}
