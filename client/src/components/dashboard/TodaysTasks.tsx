import { router } from 'expo-router';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useTaskStore } from '../../store/taskStore';
import type { TaskPriority } from '../../types/task';
import { Badge, Button, SkeletonRow, Text, type BadgeVariant } from '../ui';

const PRIORITY_BADGE: Record<TaskPriority, { label: string; variant: BadgeVariant }> = {
  low: { label: 'Low', variant: 'default' },
  medium: { label: 'Medium', variant: 'blue' },
  high: { label: 'High', variant: 'warning' },
  critical: { label: 'Critical', variant: 'error' },
};

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export interface TodaysTasksProps {
  /** Opens the shared TaskFormModal for a quick add, owned by the screen. */
  onAddTask: () => void;
}

/** Top 3 open tasks by priority. Checking one off removes it from this list immediately
 * (it's filtered to non-done tasks), which is the point of a quick dashboard widget. */
export function TodaysTasks({ onAddTask }: TodaysTasksProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const isLoading = useTaskStore((s) => s.isLoading);
  const toggleTaskStatus = useTaskStore((s) => s.toggleTaskStatus);

  const topTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority])
    .slice(0, 3);

  return (
    <View className="gap-4 rounded-2xl border border-subtle bg-base p-6">
      <View className="flex-row items-center justify-between">
        <Text variant="h3" color="primary">
          Today&apos;s Tasks
        </Text>
        <Pressable onPress={() => router.push('/tasks')} hitSlop={8}>
          <Text variant="body" color="accent" className="font-medium">
            View all
          </Text>
        </Pressable>
      </View>

      {isLoading && tasks.length === 0 ? (
        <View className="gap-2">
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : topTasks.length === 0 ? (
        <Text variant="body" color="muted">
          No open tasks. Nice work!
        </Text>
      ) : (
        <View className="gap-3">
          {topTasks.map((task) => {
            const priority = PRIORITY_BADGE[task.priority];
            return (
              <View key={task.id} className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => toggleTaskStatus(task.id)}
                  hitSlop={6}
                  className="h-5 w-5 rounded-full border border-subtle bg-base"
                />
                <Text variant="body" color="primary" className="flex-1 font-medium">
                  {task.title}
                </Text>
                <Badge label={priority.label} variant={priority.variant} size="sm" />
              </View>
            );
          })}
        </View>
      )}

      <Button title="+ Add Task" variant="ghost" size="sm" onPress={onAddTask} />
    </View>
  );
}
