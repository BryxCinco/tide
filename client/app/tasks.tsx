import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLayout, MobileMenuButton, MobileTabBar } from '@/components/layout';
import { TaskBoard, TaskFilters, TaskPeek, TaskTable } from '@/components/tasks';
import { BackButton, BentoTile, Button, ErrorState, ResponsiveContainer, SkeletonRow, StatStrip, Text, ViewToggle } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { getVisibleTasks, isTaskDueToday, isTaskOverdue, useTaskStore, type TaskView } from '@/store/taskStore';
import type { Task } from '@/types/task';
import { toDateKey } from '@/utils/formatDate';
import { ocean } from '@/utils/theme';

export default function TasksScreen() {
  const tasks = useTaskStore((s) => s.tasks);
  const filter = useTaskStore((s) => s.filter);
  const sort = useTaskStore((s) => s.sort);
  const isLoading = useTaskStore((s) => s.isLoading);
  const error = useTaskStore((s) => s.error);
  const fetchTasks = useTaskStore((s) => s.fetchTasks);
  const clearError = useTaskStore((s) => s.clearError);
  const setFilter = useTaskStore((s) => s.setFilter);
  const setSort = useTaskStore((s) => s.setSort);
  const view = useTaskStore((s) => s.view);
  const setView = useTaskStore((s) => s.setView);
  const { isPhone } = useResponsive();

  const [peekVisible, setPeekVisible] = useState(false);
  const [peekTaskId, setPeekTaskId] = useState<string | undefined>(undefined);
  // Looked up live so the peek reflects edits made elsewhere (e.g. a status move).
  const peekTask = tasks.find((t) => t.id === peekTaskId);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  };

  const visibleTasks = getVisibleTasks(tasks, filter, sort);
  const overdueCount = tasks.filter(isTaskOverdue).length;
  const dueTodayCount = tasks.filter(isTaskDueToday).length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in-progress').length;
  const todayKey = toDateKey(new Date());
  const doneTodayCount = tasks.filter((t) => t.completedAt && toDateKey(new Date(t.completedAt)) === todayKey).length;
  const completion = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const openCreate = () => {
    setPeekTaskId(undefined);
    setPeekVisible(true);
  };

  const openPeek = (task: Task) => {
    setPeekTaskId(task.id);
    setPeekVisible(true);
  };

  return (
    <AppLayout showMobileMenuButton={false}>
      {/* bottom excluded — MobileTabBar (below) owns the bottom safe-area inset itself,
          so the two don't double up on phone. */}
      <SafeAreaView className="flex-1 bg-transparent" edges={['top', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-24 pt-3 md:pt-5"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <ResponsiveContainer className="gap-2.5 md:gap-3">
            <View className="flex-row items-center gap-3">
              {/* Phone: drawer hamburger in the left slot; tablet/desktop have the Sidebar. */}
              <MobileMenuButton />
              {!isPhone && <BackButton />}
              <View className="flex-1" style={{ minWidth: 0 }}>
                <Text variant="label" color="muted" className="text-[10.5px]" style={{ letterSpacing: 1.2 }}>
                  Tasks
                </Text>
                <Text variant="h2" color="primary" className={isPhone ? 'text-[19px] leading-[24px]' : 'text-[22px] leading-[28px]'} numberOfLines={1}>
                  Get things done
                </Text>
              </View>
              <Button title="New" variant="primary" size="sm" icon="Plus" onPress={openCreate} />
            </View>

            {/* Focus-first: one slim strip of numbers, so the board is on screen right away. */}
            <StatStrip
              index={0}
              items={[
                {
                  id: 'done',
                  icon: 'CircleCheckBig',
                  color: ocean.lagoon,
                  value: `${doneCount}/${tasks.length}`,
                  label: doneTodayCount > 0 ? `done · ${doneTodayCount} today` : 'done',
                  progress: completion / 100,
                },
                { id: 'today', icon: 'Sun', color: ocean.sand, value: `${dueTodayCount}`, label: 'due today', onPress: () => setFilter('today') },
                { id: 'overdue', icon: 'AlertTriangle', color: ocean.coral, value: `${overdueCount}`, label: 'overdue', onPress: () => setFilter('overdue') },
                { id: 'doing', icon: 'Loader', color: ocean.lavender, value: `${inProgressCount}`, label: 'in progress' },
                { id: 'completed', icon: 'CheckCheck', color: ocean.lagoon, value: `${doneCount}`, label: 'completed', onPress: () => setFilter('done') },
              ]}
            />

            <BentoTile tone="glass" dense index={6}>
              <View className="gap-3">
                <ViewToggle<TaskView>
                  value={view}
                  onChange={setView}
                  options={[
                    { value: 'board', label: 'Board', icon: 'Columns3' },
                    { value: 'table', label: 'Table', icon: 'Table' },
                  ]}
                />
                <TaskFilters filter={filter} sort={sort} onFilterChange={setFilter} onSortChange={setSort} />
              </View>
            </BentoTile>

            {error && tasks.length === 0 ? (
              <ErrorState
                message={error}
                onRetry={() => {
                  clearError();
                  fetchTasks();
                }}
              />
            ) : isLoading && tasks.length === 0 ? (
              <View className="gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <SkeletonRow key={i} />
                ))}
              </View>
            ) : view === 'board' ? (
              <TaskBoard tasks={visibleTasks} onOpen={openPeek} />
            ) : (
              <TaskTable tasks={visibleTasks} onOpen={openPeek} />
            )}
          </ResponsiveContainer>
        </ScrollView>

        <TaskPeek visible={peekVisible} task={peekTask} onClose={() => setPeekVisible(false)} />
      </SafeAreaView>

      <MobileTabBar />
    </AppLayout>
  );
}
