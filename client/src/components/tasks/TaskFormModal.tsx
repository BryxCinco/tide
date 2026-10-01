import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text as RNText, useWindowDimensions, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';
import { TextInput } from '../ui/SoundTextInput';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../store/themeStore';
import { useActivityStore } from '../../store/activityStore';
import { useTaskStore } from '../../store/taskStore';
import type { Task, TaskPriority, TaskStatus } from '../../types/task';
import { cn } from '../../utils/cn';
import { confirmAsync } from '../../utils/confirm';
import { formatDateKeyShort, toDateKey } from '../../utils/formatDate';
import { shadows } from '../../utils/theme';
import { Button, CalendarPicker, ConfirmationModal, Icon, Input, Modal, Text, type IconName } from '../ui';

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
      className={cn(
        'rounded-full border-2 px-4 py-2.5 transition-transform duration-150 hover:scale-[1.03]',
        selected ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base hover:border-default',
      )}
      style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}
    >
      <Text variant="body" color={selected ? 'accent' : 'secondary'} className={cn('normal-case tracking-normal', selected && 'font-semibold')}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Activity Type is the existing Activity system (predefined + user's custom activities),
 * not a separate parallel enum — Insights/analytics already group everything by
 * `linkedActivityId`, so a disconnected "Work/Personal/Learning/..." string field would
 * fragment analytics into two incompatible taxonomies instead of feeding the one that
 * already exists. Required, like Title: no default is pre-selected, so picking one is a
 * deliberate choice rather than something to silently default past.
 */
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
  const [activityError, setActivityError] = useState<string | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [createdTask, setCreatedTask] = useState<Task | null>(null);
  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const isEditing = Boolean(task);

  const resetForm = () => {
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setStatus(task?.status ?? 'todo');
    setPriority(task?.priority ?? 'medium');
    setDueDate(task?.dueDate ?? '');
    setLinkedActivityId(task?.linkedActivityId);
    setTags(task?.tags ?? []);
    setTagDraft('');
    setError(null);
    setActivityError(null);
    setCalendarVisible(false);
  };

  useEffect(() => {
    if (!visible) return;
    resetForm();
    setCreatedTask(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    let hasError = false;

    if (!linkedActivityId) {
      setActivityError('Pick an activity type.');
      hasError = true;
    }
    if (!trimmedTitle) {
      setError('Give this task a title.');
      hasError = true;
    }
    if (hasError) return;

    const base = {
      title: trimmedTitle,
      description: description.trim() || undefined,
      status,
      priority,
      dueDate: dueDate.trim() || undefined,
      linkedActivityId,
      tags,
    };

    if (task) {
      updateTask(task.id, base);
      onClose();
    } else {
      setCreatedTask(addTask(base));
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    const confirmed = await confirmAsync('Delete task?', `"${task.title}" will be removed. This can't be undone.`);
    if (!confirmed) return;
    deleteTask(task.id);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title={isEditing ? 'Edit Task' : 'New Task'} icon="CheckSquare" size="md">
      <ScrollView style={{ maxHeight: height * 0.65 }} showsVerticalScrollIndicator={false}>
        <View className="gap-6 pb-1">
          <View className="gap-2">
            <Text variant="label" color="muted">
              Activity Type
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {activities.map((activity) => {
                const selected = linkedActivityId === activity.id;
                return (
                  <Pressable
                    key={activity.id}
                    onPress={() => {
                      setLinkedActivityId(activity.id);
                      if (activityError) setActivityError(null);
                    }}
                    className={cn(
                      'flex-row items-center gap-2 rounded-full border-2 py-2 pl-2.5 pr-4 transition-transform duration-150 hover:scale-[1.03]',
                      selected ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base hover:border-default',
                    )}
                  >
                    <View
                      className="h-6 w-6 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${activity.color}26` }}
                    >
                      <Icon name={activity.icon as IconName} size={13} color={activity.color} />
                    </View>
                    <Text variant="body" color={selected ? 'accent' : 'secondary'} className={cn('normal-case tracking-normal', selected && 'font-semibold')}>
                      {activity.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {activityError && <RNText className="text-caption text-error">{activityError}</RNText>}
          </View>

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

          <View className="gap-2">
            <Text variant="label" color="muted">
              Due Date
            </Text>
            <Pressable
              onPress={() => setCalendarVisible(true)}
              className="h-11 flex-row items-center gap-2.5 rounded-xl border border-subtle bg-base px-3.5 hover:border-default"
            >
              <Icon name="Calendar" size={16} color={dueDate ? themeColors.brand.tideTeal : themeColors.text.disabled} />
              <Text variant="body" color={dueDate ? 'primary' : 'muted'} className="flex-1 normal-case tracking-normal">
                {dueDate ? formatDateKeyShort(dueDate) : 'Select a date'}
              </Text>
              {dueDate && (
                <Pressable onPress={() => setDueDate('')} hitSlop={8} className="h-6 w-6 items-center justify-center rounded-full hover:bg-elevated">
                  <Icon name="X" size={14} color={themeColors.text.muted} />
                </Pressable>
              )}
            </Pressable>
          </View>

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

      {/* Nested modal — RNModal portals independently, so stacking this on top of the
          already-open task form modal is safe (last-mounted renders on top). Past dates are
          disabled (minDate=today) EXCEPT the field's own already-set value, so editing a task
          that already has a past date keeps that exact date pickable without reopening every
          other past date too — see CalendarPicker.tsx's isDisabled. */}
      <Modal visible={calendarVisible} onClose={() => setCalendarVisible(false)} title="Due Date" icon="Calendar" size="sm">
        <View className="items-center gap-4">
          <CalendarPicker
            value={dueDate || undefined}
            minDate={todayKey}
            onChange={(key) => {
              setDueDate(key);
              setCalendarVisible(false);
            }}
          />
          {dueDate && (
            <Button
              title="Clear date"
              variant="ghost"
              size="sm"
              onPress={() => {
                setDueDate('');
                setCalendarVisible(false);
              }}
            />
          )}
        </View>
      </Modal>

      {/* Nested like the CalendarPicker modal above — the outer form modal deliberately
          stays open underneath so "Create Another" can reset straight back into it without
          a close/reopen flicker. */}
      <ConfirmationModal
        visible={Boolean(createdTask)}
        onClose={onClose}
        variant="success"
        icon="CheckCircle"
        title="Task Created!"
        message={`"${createdTask?.title}" has been added to your list.`}
        autoDismissMs={3000}
        primaryAction={{
          label: 'View Task',
          onPress: () => {
            router.push('/tasks');
            onClose();
          },
        }}
        secondaryAction={{
          label: 'Create Another',
          onPress: () => {
            setCreatedTask(null);
            resetForm();
          },
        }}
        tertiaryAction={{ label: 'Done', onPress: onClose }}
      />
    </Modal>
  );
}
