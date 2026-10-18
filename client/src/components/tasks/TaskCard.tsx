import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import { isTaskDueToday, isTaskOverdue } from '../../store/taskStore';
import type { Task, TaskPriority } from '../../types/task';
import { cn } from '../../utils/cn';
import { hexToRgba } from '../../utils/color';
import { formatDateKeyCompact } from '../../utils/formatDate';
import { gradientDirections, gradients } from '../../utils/gradients';
import { Icon, Text, VisibleDeleteButton } from '../ui';

export const PRIORITY_META: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: '#94A3B8' },
  medium: { label: 'Medium', color: '#0EA5E9' },
  high: { label: 'High', color: '#F59E0B' },
  critical: { label: 'Critical', color: '#EF4444' },
};

export interface TaskCardProps {
  task: Task;
  /** Resolved name of the linked activity, if any — looked up by the caller. */
  activityName?: string;
  onToggle: () => void;
  /** Tapping the card's main body opens the view-only info modal — Edit stays an explicit,
   * separate action (the pencil icon), never triggered by this. */
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function Chip({ icon, label, color }: { icon?: Parameters<typeof Icon>[0]['name']; label: string; color: string }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: hexToRgba(color, 0.12) }}>
      {icon && <Icon name={icon} size={11} color={color} />}
      <Text variant="body" className="text-[11px] font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

/** One task as a bento tile: priority-colored rail, a round check that fills with the aurora
 * gradient when done, the title, and a row of small status chips. */
export function TaskCard({ task, activityName, onToggle, onView, onEdit, onDelete }: TaskCardProps) {
  const themeColors = useThemeColors();
  const isDone = task.status === 'done';
  const priority = PRIORITY_META[task.priority];
  const overdue = isTaskOverdue(task);
  const dueToday = !overdue && isTaskDueToday(task);

  return (
    <View
      className={cn('flex-1 flex-row overflow-hidden rounded-[20px] border bg-surface', overdue ? 'border-error/30' : 'border-subtle')}
    >
      <View className="w-1.5 self-stretch" style={{ backgroundColor: isDone ? themeColors.border.default : priority.color }} />

      <View className="flex-1 flex-row items-start gap-3 py-3.5 pl-3.5 pr-2">
        <Pressable
          onPress={onToggle}
          disabled={isDone}
          hitSlop={10}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isDone, disabled: isDone }}
          accessibilityLabel={isDone ? `"${task.title}" is completed` : `Mark "${task.title}" as done`}
          className={cn('mt-0.5 h-6 w-6 items-center justify-center overflow-hidden rounded-full', !isDone && 'border-2 border-default')}
        >
          {isDone && (
            <LinearGradient
              colors={[...gradients.aurora]}
              {...gradientDirections.diagonal}
              style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
            />
          )}
          {isDone && (
            <View>
              <Icon name="Check" size={14} strokeWidth={3} color="#FFFFFF" />
            </View>
          )}
        </Pressable>

        <Pressable onPress={onView} className="flex-1 gap-2" style={{ minWidth: 0 }}>
          <Text
            variant="body"
            color={isDone ? 'muted' : 'primary'}
            className={cn('text-[15px] font-semibold leading-[21px]', isDone && 'line-through')}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          {task.description ? (
            <Text variant="body" color="muted" className="text-[13px]" numberOfLines={1}>
              {task.description}
            </Text>
          ) : null}

          <View className="flex-row flex-wrap items-center gap-1.5">
            <Chip label={priority.label} color={priority.color} />
            {overdue && <Chip icon="AlertTriangle" label="Overdue" color="#EF4444" />}
            {dueToday && <Chip icon="Clock" label="Due today" color="#F59E0B" />}
            {task.dueDate && !dueToday && (
              <Chip icon="Calendar" label={formatDateKeyCompact(task.dueDate)} color={themeColors.text.muted} />
            )}
            {activityName && <Chip icon="Layers" label={activityName} color="#14B8A6" />}
            {task.tags.slice(0, 3).map((tag) => (
              <Text key={tag} variant="body" color="muted" className="text-[11px] font-medium">
                #{tag}
              </Text>
            ))}
          </View>
        </Pressable>

        {isDone ? (
          // Completed tasks are locked — no un-check, edit or delete (the server enforces it too).
          <View className="h-8 w-8 items-center justify-center" accessibilityLabel="Completed — locked">
            <Icon name="Lock" size={14} color={themeColors.text.disabled} />
          </View>
        ) : (
          <View className="flex-row items-center">
            <Pressable
              onPress={onEdit}
              hitSlop={6}
              accessibilityLabel="Edit task"
              className="h-8 w-8 items-center justify-center rounded-full hover:bg-elevated"
            >
              <Icon name="Pencil" size={15} />
            </Pressable>
            <VisibleDeleteButton
              onConfirm={onDelete}
              confirmTitle="Delete task?"
              confirmMessage={`"${task.title}" will be removed. This can't be undone.`}
            />
          </View>
        )}
      </View>
    </View>
  );
}
