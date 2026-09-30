import { View } from 'react-native';

import type { Task, TaskPriority } from '../../types/task';
import { confirmAsync } from '../../utils/confirm';
import { formatDateKeyShort, formatEntryDate } from '../../utils/formatDate';
import { Badge, Button, Icon, Modal, Text, type BadgeVariant, type IconName } from '../ui';

export interface TaskInfoModalProps {
  visible: boolean;
  onClose: () => void;
  /** Present whenever `visible` is true — optional only so the modal can stay mounted (and
   * animate its close) for one tick after the caller clears the selected task. */
  task?: Task;
  activityName?: string;
  onToggle: (id: string) => void;
  /** Opens the edit form for this task — the ONLY path to editing from here; this modal
   * itself never mutates the task directly. */
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_BADGE: Record<TaskPriority, { label: string; variant: BadgeVariant }> = {
  low: { label: 'Low', variant: 'default' },
  medium: { label: 'Medium', variant: 'blue' },
  high: { label: 'High', variant: 'warning' },
  critical: { label: 'Critical', variant: 'error' },
};

const STATUS_LABEL: Record<Task['status'], string> = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  done: 'Done',
};

function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <Icon name={icon} size={15} />
        <Text variant="body" color="secondary" className="normal-case tracking-normal">
          {label}
        </Text>
      </View>
      <Text variant="body" color="primary" className="font-medium normal-case tracking-normal">
        {value}
      </Text>
    </View>
  );
}

/**
 * View-only task detail — what tapping a task card opens now, instead of jumping straight
 * into edit mode (mirrors ActivityInfoModal.tsx's split for activities: body tap = info,
 * pencil icon = edit, both wired from the same TaskCard).
 */
export function TaskInfoModal({ visible, onClose, task, activityName, onToggle, onEdit, onDelete }: TaskInfoModalProps) {
  if (!task) return null;

  const isDone = task.status === 'done';
  const priority = PRIORITY_BADGE[task.priority];
  const dateLabel =
    task.dueDateStart && task.dueDateEnd
      ? `${formatDateKeyShort(task.dueDateStart)} - ${formatDateKeyShort(task.dueDateEnd)}`
      : task.dueDate
        ? formatDateKeyShort(task.dueDate)
        : null;

  const handleDelete = async () => {
    const confirmed = await confirmAsync('Delete task?', `"${task.title}" will be removed. This can't be undone.`);
    if (!confirmed) return;
    onDelete(task.id);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title={task.title} icon="CheckSquare" size="sm">
      <View className="gap-5">
        <View className="items-center gap-3 py-1">
          <View className="flex-row flex-wrap items-center justify-center gap-2">
            <Badge label={priority.label} variant={priority.variant} size="sm" />
            <Badge label={STATUS_LABEL[task.status]} variant={isDone ? 'success' : 'default'} size="sm" />
            {activityName && <Badge label={activityName} variant="teal" size="sm" />}
          </View>
          {task.description ? (
            <Text variant="body" color="secondary" className="text-center normal-case tracking-normal">
              {task.description}
            </Text>
          ) : null}
          {task.tags.length > 0 && (
            <View className="flex-row flex-wrap justify-center gap-1.5">
              {task.tags.map((tag) => (
                <Badge key={tag} label={tag} variant="default" size="sm" />
              ))}
            </View>
          )}
        </View>

        <View className="gap-3 rounded-xl border border-subtle bg-base p-4">
          {dateLabel && <InfoRow icon="Calendar" label={task.dueDateStart ? 'Date range' : 'Due date'} value={dateLabel} />}
          <InfoRow icon="CalendarPlus" label="Created" value={formatEntryDate(task.createdAt)} />
          {task.completedAt && <InfoRow icon="CheckCircle2" label="Completed" value={formatEntryDate(task.completedAt)} />}
        </View>

        <View className="gap-2">
          <Button
            title={isDone ? 'Mark as Not Done' : 'Mark as Done'}
            variant="primary"
            size="lg"
            fullWidth
            icon={isDone ? 'RotateCcw' : 'Check'}
            onPress={() => onToggle(task.id)}
          />
          <Button title="Edit" variant="secondary" size="md" fullWidth icon="Pencil" onPress={() => onEdit(task)} />
          <View className="items-center pt-1">
            <Button title="Delete Task" variant="ghost" size="sm" icon="Trash2" onPress={handleDelete} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
