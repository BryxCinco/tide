import { useState } from 'react';
import { Platform, View } from 'react-native';

import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { isTaskOverdue, useTaskStore } from '../../store/taskStore';
import type { Task, TaskPriority } from '../../types/task';
import { cn } from '../../utils/cn';
import { formatDateKeyCompact } from '../../utils/formatDate';
import { canMoveTask, sortTasks, type TableSortKey } from '../../utils/taskBoard';
import { ocean } from '../../utils/theme';
import { BentoTile, CalendarPicker, Icon, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { TextInput } from '../ui/SoundTextInput';
import { StatusChip } from './BoardCard';
import { InlineTaskInput } from './InlineTaskInput';
import { OptionList, Popover } from './Popover';
import { PRIORITY_META } from './TaskCard';

export interface TaskTableProps {
  tasks: Task[];
  onOpen: (task: Task) => void;
}

const PRIORITY_OPTIONS = (['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => ({
  value: p,
  label: PRIORITY_META[p].label,
  color: PRIORITY_META[p].color,
}));

const COLUMNS: { key: TableSortKey | null; label: string; style: object }[] = [
  { key: 'title', label: 'Title', style: { flex: 3 } },
  { key: 'status', label: 'Status', style: { width: 130 } },
  { key: 'priority', label: 'Priority', style: { width: 110 } },
  { key: 'dueDate', label: 'Due', style: { width: 110 } },
  { key: null, label: 'Tags', style: { flex: 2 } },
];

/**
 * Notion-style table: sortable headers, title edited in place, status/priority/due picked
 * from small menus. On phone each row collapses to the title plus a chip line.
 */
export function TaskTable({ tasks, onOpen }: TaskTableProps) {
  const { isPhone } = useResponsive();
  const theme = useThemeColors();
  const addTask = useTaskStore((s) => s.addTask);
  const [sort, setSort] = useState<{ key: TableSortKey; dir: 'asc' | 'desc' }>({ key: 'priority', dir: 'asc' });
  const rows = sortTasks(tasks, sort.key, sort.dir);

  const onHeader = (key: TableSortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  return (
    <BentoTile tone="surface" dense index={0}>
      <View>
        {!isPhone && (
          <View className="flex-row items-center border-b border-default pb-2">
            <View style={{ width: 36 }} />
            {COLUMNS.map((col) => (
              <View key={col.label} style={col.style} className="pr-2">
                {col.key ? (
                  <Pressable onPress={() => onHeader(col.key!)} accessibilityRole="button" accessibilityLabel={`Sort by ${col.label}`} className="flex-row items-center gap-1 self-start rounded-md px-1 py-0.5 hover:bg-[rgba(100,116,139,0.08)]">
                    <Text variant="label" color={sort.key === col.key ? 'primary' : 'muted'} className="text-[11px]" style={{ letterSpacing: 0.8 }}>
                      {col.label}
                    </Text>
                    {sort.key === col.key && <Icon name={sort.dir === 'asc' ? 'ArrowUp' : 'ArrowDown'} size={12} color={theme.text.primary} />}
                  </Pressable>
                ) : (
                  <Text variant="label" color="muted" className="px-1 text-[11px]" style={{ letterSpacing: 0.8 }}>
                    {col.label}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {rows.length === 0 && (
          <View className="items-center py-6">
            <Text variant="body" color="muted" className="text-[13px]">
              No tasks here yet
            </Text>
          </View>
        )}

        {rows.map((task) => (isPhone ? <PhoneRow key={task.id} task={task} onOpen={() => onOpen(task)} /> : <DesktopRow key={task.id} task={task} onOpen={() => onOpen(task)} />))}

        <View className="pt-1.5">
          <InlineTaskInput onSubmit={(title) => addTask({ title, status: 'todo', priority: 'medium', tags: [] })} />
        </View>
      </View>
    </BentoTile>
  );
}

function CheckCell({ task }: { task: Task }) {
  const toggleTaskStatus = useTaskStore((s) => s.toggleTaskStatus);
  const isDone = task.status === 'done';
  return (
    <Pressable
      onPress={() => toggleTaskStatus(task.id)}
      disabled={isDone}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isDone, disabled: isDone }}
      accessibilityLabel={isDone ? `"${task.title}" is completed` : `Mark "${task.title}" as done`}
      className={cn('h-[18px] w-[18px] items-center justify-center rounded-full', !isDone && 'border-[1.5px] border-[rgba(100,116,139,0.55)]')}
      style={isDone ? { backgroundColor: ocean.lagoon } : undefined}
    >
      {isDone && <Icon name="Check" size={12} strokeWidth={3} color="#FFFFFF" />}
    </Pressable>
  );
}

function TitleCell({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const updateTask = useTaskStore((s) => s.updateTask);
  const theme = useThemeColors();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const isDone = task.status === 'done';

  const commit = () => {
    const title = draft.trim();
    if (title && title !== task.title) updateTask(task.id, { title });
    else setDraft(task.title);
    setEditing(false);
  };

  return (
    <View className="flex-1 flex-row items-center gap-1" style={{ minWidth: 0 }}>
      {editing ? (
        <TextInput
          autoFocus
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          onBlur={commit}
          onKeyPress={(e) => {
            if (Platform.OS === 'web' && e.nativeEvent.key === 'Escape') {
              setDraft(task.title);
              setEditing(false);
            }
          }}
          className="flex-1 rounded-md border border-tide-teal bg-elevated px-1.5 py-0.5 font-sans text-[14px] text-primary"
          accessibilityLabel="Task title"
        />
      ) : (
        <Pressable
          onPress={() => (isDone ? onOpen() : (setDraft(task.title), setEditing(true)))}
          accessibilityRole="button"
          accessibilityLabel={isDone ? `Open ${task.title}` : `Rename ${task.title}`}
          className="flex-1 rounded-md px-1.5 py-0.5 hover:bg-[rgba(100,116,139,0.08)]"
          style={{ minWidth: 0 }}
        >
          <Text variant="body" color={isDone ? 'muted' : 'primary'} className={cn('text-[14px] font-medium', isDone && 'line-through')} numberOfLines={1}>
            {task.title}
          </Text>
        </Pressable>
      )}
      <Pressable onPress={onOpen} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Open ${task.title} details`} className="h-7 w-7 items-center justify-center rounded-md hover:bg-[rgba(100,116,139,0.10)]">
        <Icon name="PanelRightOpen" size={15} color={theme.text.muted} />
      </Pressable>
    </View>
  );
}

function PriorityCell({ task }: { task: Task }) {
  const updateTask = useTaskStore((s) => s.updateTask);
  const meta = PRIORITY_META[task.priority];
  const value = (
    <View className="flex-row items-center gap-1.5 px-1 py-0.5">
      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
      <Text variant="body" color="secondary" className="text-[13px]">
        {meta.label}
      </Text>
    </View>
  );
  if (!canMoveTask(task)) return value;
  return (
    <Popover trigger={value} accessibilityLabel={`Priority: ${meta.label}. Change priority`}>
      {(close) => (
        <OptionList<TaskPriority>
          options={PRIORITY_OPTIONS}
          value={task.priority}
          onSelect={(priority) => {
            updateTask(task.id, { priority });
            close();
          }}
        />
      )}
    </Popover>
  );
}

function DueCell({ task }: { task: Task }) {
  const updateTask = useTaskStore((s) => s.updateTask);
  const theme = useThemeColors();
  const overdue = isTaskOverdue(task);
  const value = (
    <View className="flex-row items-center gap-1 px-1 py-0.5">
      <Icon name="Calendar" size={12} color={overdue ? ocean.coral : theme.text.muted} />
      <Text variant="body" className="text-[13px]" style={{ color: task.dueDate ? (overdue ? ocean.coral : theme.text.secondary) : theme.text.disabled }}>
        {task.dueDate ? formatDateKeyCompact(task.dueDate) : 'Set date'}
      </Text>
    </View>
  );
  if (!canMoveTask(task)) return value;
  return (
    <Popover trigger={value} width={300} accessibilityLabel="Change due date">
      {(close) => (
        <View className="px-2">
          <CalendarPicker
            value={task.dueDate}
            onChange={(dueDate) => {
              updateTask(task.id, { dueDate });
              close();
            }}
          />
        </View>
      )}
    </Popover>
  );
}

function DesktopRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  return (
    <View className="min-h-[44px] flex-row items-center border-b border-[rgba(100,116,139,0.12)] hover:bg-[rgba(100,116,139,0.05)]">
      <View style={{ width: 36 }} className="items-center">
        <CheckCell task={task} />
      </View>
      <View style={{ flex: 3, minWidth: 0 }} className="pr-2">
        <TitleCell task={task} onOpen={onOpen} />
      </View>
      <View style={{ width: 130 }} className="items-start pr-2">
        <StatusChip task={task} />
      </View>
      <View style={{ width: 110 }} className="items-start pr-2">
        <PriorityCell task={task} />
      </View>
      <View style={{ width: 110 }} className="items-start pr-2">
        <DueCell task={task} />
      </View>
      <View style={{ flex: 2, minWidth: 0 }} className="flex-row flex-wrap gap-1 pr-2">
        {task.tags.slice(0, 3).map((tag) => (
          <View key={tag} className="rounded-md bg-[rgba(20,184,166,0.10)] px-1.5 py-0.5">
            <Text variant="body" className="text-[11.5px] font-medium" style={{ color: ocean.lagoon }}>
              {tag}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PhoneRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  return (
    <View className="gap-1 border-b border-[rgba(100,116,139,0.12)] py-2.5">
      <View className="flex-row items-center gap-2">
        <CheckCell task={task} />
        <TitleCell task={task} onOpen={onOpen} />
      </View>
      <View className="flex-row flex-wrap items-center gap-1.5 pl-[26px]">
        <StatusChip task={task} />
        <PriorityCell task={task} />
        <DueCell task={task} />
      </View>
    </View>
  );
}
