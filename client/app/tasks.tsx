import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuestCard } from '@/components/dashboard';
import { AppLayout, MobileMenuButton, MobileTabBar } from '@/components/layout';
import { TaskBoard, TaskFilters, TaskPeek, TaskTable } from '@/components/tasks';
import { PRIORITY_META } from '@/components/tasks/TaskCard';
import { BackButton, BENTO_INK_TEXT, BentoRing, BentoStat, BentoTile, Button, EmptyState, ErrorState, FadeInView, ResponsiveContainer, SkeletonRow, Text, ViewToggle } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { getVisibleTasks, isTaskDueToday, isTaskOverdue, useTaskStore, type TaskView } from '@/store/taskStore';
import type { Task, TaskPriority } from '@/types/task';
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
  const openByPriority = (['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((priority) => ({
    priority,
    count: tasks.filter((t) => t.status !== 'done' && t.priority === priority).length,
  }));

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

            <View className="gap-2.5 md:flex-row md:gap-3">
              {/* Progress — ring of done/total plus what's still open, by priority. */}
              <BentoTile tone="deep" dense index={0} className="md:flex-[1.3]">
                <View className="flex-1 flex-row items-center gap-4">
                  <BentoRing value={completion} size={isPhone ? 96 : 112} strokeWidth={isPhone ? 8 : 10}>
                    <Text variant="h2" className="text-[22px] leading-[26px]" style={{ color: BENTO_INK_TEXT.primary, fontVariant: ['tabular-nums'] }}>
                      {completion}%
                    </Text>
                    <Text variant="body" className="text-[11px] font-medium" style={{ color: BENTO_INK_TEXT.muted }}>
                      complete
                    </Text>
                  </BentoRing>
                  <View className="flex-1 gap-2.5" style={{ minWidth: 0 }}>
                    <View>
                      <Text variant="h3" className="text-[16px] leading-[21px]" style={{ color: BENTO_INK_TEXT.primary }}>
                        {doneCount} of {tasks.length} done
                      </Text>
                      <Text variant="body" className="text-[12px]" style={{ color: BENTO_INK_TEXT.muted }}>
                        {doneTodayCount > 0 ? `${doneTodayCount} finished today — keep going` : 'Nothing finished yet today'}
                      </Text>
                    </View>
                    <View className="gap-1.5">
                      {openByPriority.map(({ priority, count }) => (
                        <View key={priority} className="flex-row items-center gap-2">
                          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_META[priority].color }} />
                          <Text variant="body" className="flex-1 text-[12px]" style={{ color: BENTO_INK_TEXT.secondary }}>
                            {PRIORITY_META[priority].label}
                          </Text>
                          <Text variant="body" className="text-[12px] font-semibold" style={{ color: BENTO_INK_TEXT.primary }}>
                            {count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </BentoTile>

              {/* Quick-filter stats — tapping one applies that filter to the list below. */}
              <View className="gap-2.5 md:flex-1 md:gap-3">
                <View className="flex-row gap-2.5 md:gap-3">
                  <BentoStat dense className="flex-1" index={1} icon="Sun" color={ocean.sand} value={`${dueTodayCount}`} label="due today" onPress={() => setFilter('today')} />
                  <BentoStat dense className="flex-1" index={2} icon="AlertTriangle" color={ocean.coral} value={`${overdueCount}`} label="overdue" onPress={() => setFilter('overdue')} />
                </View>
                <View className="flex-row gap-2.5 md:gap-3">
                  <BentoStat dense className="flex-1" index={3} icon="Loader" color={ocean.lavender} value={`${inProgressCount}`} label="in progress" />
                  <BentoStat dense className="flex-1" index={4} icon="CheckCheck" color={ocean.lagoon} value={`${doneCount}`} label="completed" onPress={() => setFilter('done')} />
                </View>
              </View>
            </View>

            <FadeInView index={5}>
              <QuestCard />
            </FadeInView>

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
