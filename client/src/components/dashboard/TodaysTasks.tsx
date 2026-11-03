import { router } from 'expo-router';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useTaskStore } from '../../store/taskStore';
import type { TaskPriority } from '../../types/task';
import { ocean } from '../../utils/theme';
import { Badge, BentoHeader, BentoTile, Icon, SkeletonRow, Text, type BadgeVariant } from '../ui';

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
    <BentoTile tone="glass" dense>
      <View className="gap-2">
        <BentoHeader
          dense
          title="Today's tasks"
          icon="ListChecks"
          color={ocean.lagoon}
          right={
            <View className="flex-row items-center gap-1">
              <Pressable onPress={() => router.push('/tasks')} hitSlop={8} className="rounded-md px-1.5 py-1 hover:bg-hover">
                <Text variant="body" color="accent" className="text-[12px] font-semibold">
                  View all
                </Text>
              </Pressable>
              <Pressable onPress={onAddTask} hitSlop={6} accessibilityLabel="Add task" className="h-7 w-7 items-center justify-center rounded-lg bg-tide-teal/10 hover:bg-tide-teal/20">
                <Icon name="Plus" size={14} color={ocean.lagoon} strokeWidth={2.4} />
              </Pressable>
            </View>
          }
        />

        {isLoading && tasks.length === 0 ? (
          <View className="gap-2">
            <SkeletonRow />
            <SkeletonRow />
          </View>
        ) : topTasks.length === 0 ? (
          <View className="flex-row items-center gap-2 rounded-xl bg-hover/60 px-2.5 py-2">
            <Icon name="CheckCircle2" size={14} color={ocean.lagoon} />
            <Text variant="body" color="muted" className="text-[12.5px]">
              No open tasks — clear waters.
            </Text>
          </View>
        ) : (
          <View>
            {topTasks.map((task, index) => {
              const priority = PRIORITY_BADGE[task.priority];
              return (
                <View key={task.id} className={index > 0 ? 'flex-row items-center gap-2.5 border-t border-subtle py-2' : 'flex-row items-center gap-2.5 py-2'}>
                  <Pressable
                    onPress={() => toggleTaskStatus(task.id)}
                    hitSlop={10}
                    accessibilityLabel={`Complete ${task.title}`}
                    className="h-[18px] w-[18px] rounded-full border-[1.5px] border-hover hover:border-tide-teal"
                  />
                  <Text variant="body" color="primary" className="flex-1 text-[13px] font-medium" numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Badge label={priority.label} variant={priority.variant} size="sm" />
                </View>
              );
            })}
          </View>
        )}
      </View>
    </BentoTile>
  );
}
