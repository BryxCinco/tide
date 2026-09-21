import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, useWindowDimensions, View } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../store/themeStore';
import { useActivityStore } from '../../store/activityStore';
import { useTaskStore } from '../../store/taskStore';
import type { Task, TaskPriority, TaskStatus } from '../../types/task';
import { cn } from '../../utils/cn';
import { confirmAsync } from '../../utils/confirm';
import { shadows } from '../../utils/theme';
import { Button, Icon, Input, Modal, Text } from '../ui';

export interface TaskFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Present when editing; absent when creating a new task. */
  task?: Task;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

function PillOption<T extends string>({
  value,
  label,
  selected,
  onPress,
}: {
  value: T;
  label: string;
  selected: boolean;
  onPress: (value: T) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(value)}
      className={cn('rounded-full border px-3 py-1.5', selected ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base')}
    >
      <Text variant="caption" color={selected ? 'accent' : 'secondary'} className="normal-case tracking-normal">
        {label}
      </Text>
    </Pressable>
  );
}

/** No native date picker or dropdown in this phase — due date is free text and activity
 * linking is a chip-select — to avoid pulling in a new cross-platform picker dependency. */
export function TaskFormModal({ visible, onClose, task }: TaskFormModalProps) {
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const allActivities = useActivityStore((s) => s.activities);
  const activities = useMemo(() => allActivities.filter((a) => !a.isArchived), [allActivities]);
  const { height } = useWindowDimensions();
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [linkedActivityId, setLinkedActivityId] = useState<string | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState('');
  const [isTagFocused, setIsTagFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(task);

  useEffect(() => {
    if (!visible) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setStatus(task?.status ?? 'todo');
    setPriority(task?.priority ?? 'medium');
    setDueDate(task?.dueDate ?? '');
    setLinkedActivityId(task?.linkedActivityId);
    setTags(task?.tags ?? []);
    setTagDraft('');
    setError(null);
  }, [visible, task]);

  const addTagFromDraft = () => {
    const trimmed = tagDraft.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagDraft('');
  };

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Give this task a title.');
      return;
    }

    const payload = {
      title: trimmedTitle,
      description: description.trim() || undefined,
      status,
      priority,
      dueDate: dueDate.trim() || undefined,
      linkedActivityId,
      tags,
    };

    if (task) {
      updateTask(task.id, payload);
    } else {
      addTask(payload);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (!task) return;
    const confirmed = await confirmAsync('Delete task?', `"${task.title}" will be removed. This can't be undone.`);
    if (!confirmed) return;
    deleteTask(task.id);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title={isEditing ? 'Edit Task' : 'New Task'} size="md">
      <ScrollView style={{ maxHeight: height * 0.65 }} showsVerticalScrollIndicator={false}>
        <View className="gap-5 pb-1">
          <Input
            label="Title"
            placeholder="e.g. Finish onboarding flow"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (error) setError(null);
            }}
            error={error ?? undefined}
          />

          <Input
            label="Description"
            placeholder="Add more detail..."
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <View className="gap-2">
            <Text variant="label" color="muted">
              Status
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <PillOption key={option.value} value={option.value} label={option.label} selected={status === option.value} onPress={setStatus} />
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text variant="label" color="muted">
              Priority
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((option) => (
                <PillOption key={option.value} value={option.value} label={option.label} selected={priority === option.value} onPress={setPriority} />
              ))}
            </View>
          </View>

          <Input label="Due date" placeholder="e.g. 2026-09-25" value={dueDate} onChangeText={setDueDate} />

          {activities.length > 0 && (
            <View className="gap-2">
              <Text variant="label" color="muted">
                Link to activity
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Pressable
                  onPress={() => setLinkedActivityId(undefined)}
                  className={cn('rounded-full border px-3 py-1.5', !linkedActivityId ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base')}
                >
                  <Text variant="caption" color={!linkedActivityId ? 'accent' : 'secondary'} className="normal-case tracking-normal">
                    None
                  </Text>
                </Pressable>
                {activities.map((activity) => (
                  <Pressable
                    key={activity.id}
                    onPress={() => setLinkedActivityId(activity.id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5',
                      linkedActivityId === activity.id ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base',
                    )}
                  >
                    <Text
                      variant="caption"
                      color={linkedActivityId === activity.id ? 'accent' : 'secondary'}
                      className="normal-case tracking-normal"
                    >
                      {activity.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View className="gap-2">
            <Text variant="label" color="muted">
              Tags
            </Text>
            {tags.length > 0 && (
              <View className="flex-row flex-wrap gap-2">
                {tags.map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    className="flex-row items-center gap-1 rounded-full border border-subtle bg-surface px-2.5 py-1"
                  >
                    <Text variant="caption" color="secondary" className="normal-case tracking-normal">
                      {tag}
                    </Text>
                    <Icon name="X" size={12} />
                  </Pressable>
                ))}
              </View>
            )}
            <View
              className={cn(
                'h-11 flex-row items-center gap-2 rounded-full border bg-elevated pl-4 pr-1.5',
                isTagFocused ? 'border-tide-teal' : 'border-subtle',
              )}
              style={isTagFocused ? (isDark ? shadows.focusRingDark : shadows.focusRing) : undefined}
            >
              <TextInput
                value={tagDraft}
                onChangeText={setTagDraft}
                onSubmitEditing={addTagFromDraft}
                onFocus={() => setIsTagFocused(true)}
                onBlur={() => setIsTagFocused(false)}
                returnKeyType="done"
                placeholder="Add a tag..."
                placeholderTextColor={themeColors.text.disabled}
                className="flex-1 font-sans text-body text-primary"
              />
              <Button title="Add" variant="ghost" size="sm" onPress={addTagFromDraft} />
            </View>
          </View>

          <Button title="Save" variant="primary" size="lg" fullWidth onPress={handleSave} />

          {isEditing && <Button title="Delete Task" variant="danger" size="md" fullWidth onPress={handleDelete} />}
        </View>
      </ScrollView>
    </Modal>
  );
}
