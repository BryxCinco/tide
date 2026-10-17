import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuestCard } from '@/components/dashboard';
import { AppLayout, MobileMenuButton, MobileTabBar } from '@/components/layout';
import { TaskCard, TaskFilters, TaskFormModal, TaskInfoModal } from '@/components/tasks';
import { PRIORITY_META } from '@/components/tasks/TaskCard';
import { BackButton, BENTO_INK_TEXT, BentoRing, BentoStat, BentoTile, Button, EmptyState, ErrorState, FadeInView, ResponsiveContainer, SkeletonRow, Text } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { useActivityStore } from '@/store/activityStore';
import { getVisibleTasks, isTaskDueToday, isTaskOverdue, useTaskStore } from '@/store/taskStore';
import type { Task, TaskPriority } from '@/types/task';
import { toDateKey } from '@/utils/formatDate';

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
  const toggleTaskStatus = useTaskStore((s) => s.toggleTaskStatus);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const activities = useActivityStore((s) => s.activities);
  const { isPhone } = useResponsive();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [infoTask, setInfoTask] = useState<Task | undefined>(undefined);
  const [infoVisible, setInfoVisible] = useState(false);
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
    setEditingTask(undefined);
    setModalVisible(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setModalVisible(true);
  };

  const openInfo = (task: Task) => {
    setInfoTask(task);
    setInfoVisible(true);
  };

  return (
    <AppLayout showMobileMenuButton={false}>
      {/* bottom excluded — MobileTabBar (below) owns the bottom safe-area inset itself,
          so the two don't double up on phone. */}
      <SafeAreaView className="flex-1 bg-base" edges={['top', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-24 pt-3 md:pt-6"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <ResponsiveContainer className="gap-3 md:gap-4">
            <View className="flex-row items-center gap-3">
              {/* Phone: drawer hamburger in the left slot; tablet/desktop have the Sidebar. */}
              <MobileMenuButton />
              {!isPhone && <BackButton />}
              <View className="flex-1" style={{ minWidth: 0 }}>
                <Text variant="label" color="muted" style={{ letterSpacing: 1.4 }}>
                  Tasks
                </Text>
                <Text variant={isPhone ? 'h3' : 'h2'} color="primary" numberOfLines={1}>
                  Get things done
                </Text>
              </View>
              <Button title="New" variant="primary" size="sm" icon="Plus" onPress={openCreate} />
            </View>

            <View className="gap-3 md:flex-row md:gap-4">
              {/* Progress — ring of done/total plus what's still open, by priority. */}
              <BentoTile tone="ink" index={0} className="md:flex-[1.3]">
                <View className="flex-1 flex-row items-center gap-5">
                  <BentoRing value={completion} size={isPhone ? 104 : 124} strokeWidth={isPhone ? 9 : 11}>
                    <Text variant="h2" style={{ color: BENTO_INK_TEXT.primary, fontVariant: ['tabular-nums'] }}>
                      {completion}%
                    </Text>
                    <Text variant="body" className="text-[11px] font-medium" style={{ color: BENTO_INK_TEXT.muted }}>
                      complete
                    </Text>
                  </BentoRing>
                  <View className="flex-1 gap-3" style={{ minWidth: 0 }}>
                    <View>
                      <Text variant="h3" style={{ color: BENTO_INK_TEXT.primary }}>
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
              <View className="gap-3 md:flex-1 md:gap-4">
                <View className="flex-row gap-3 md:gap-4">
                  <BentoStat className="flex-1" index={1} icon="Sun" color="#F59E0B" value={`${dueTodayCount}`} label="due today" onPress={() => setFilter('today')} />
                  <BentoStat className="flex-1" index={2} icon="AlertTriangle" color="#EF4444" value={`${overdueCount}`} label="overdue" onPress={() => setFilter('overdue')} />
                </View>
                <View className="flex-row gap-3 md:gap-4">
                  <BentoStat className="flex-1" index={3} icon="Loader" color="#6366F1" value={`${inProgressCount}`} label="in progress" />
                  <BentoStat className="flex-1" index={4} icon="CheckCheck" color="#14B8A6" value={`${doneCount}`} label="completed" onPress={() => setFilter('done')} />
                </View>
              </View>
            </View>

            <FadeInView index={5}>
              <QuestCard />
            </FadeInView>

            <BentoTile index={6}>
              <TaskFilters filter={filter} sort={sort} onFilterChange={setFilter} onSortChange={setSort} />
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
            ) : visibleTasks.length === 0 ? (
              <EmptyState
                icon="ListChecks"
                title="No tasks yet"
                description="Create your first task!"
                actionLabel="New Task"
                onAction={openCreate}
              />
            ) : (
              <View className="flex-row flex-wrap gap-3">
                {visibleTasks.map((task, index) => (
                  <FadeInView key={task.id} index={index} className="basis-full md:basis-[45%] md:grow">
                    <TaskCard
                      task={task}
                      activityName={activities.find((a) => a.id === task.linkedActivityId)?.name}
                      onToggle={() => toggleTaskStatus(task.id)}
                      onView={() => openInfo(task)}
                      onEdit={() => openEdit(task)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  </FadeInView>
                ))}
              </View>
            )}
          </ResponsiveContainer>
        </ScrollView>

        <TaskFormModal visible={modalVisible} onClose={() => setModalVisible(false)} task={editingTask} />

        <TaskInfoModal
          visible={infoVisible}
          onClose={() => setInfoVisible(false)}
          task={infoTask}
          activityName={activities.find((a) => a.id === infoTask?.linkedActivityId)?.name}
          onToggle={toggleTaskStatus}
          onDelete={deleteTask}
          onEdit={(task) => {
            setInfoVisible(false);
            openEdit(task);
          }}
        />
      </SafeAreaView>

      <MobileTabBar />
    </AppLayout>
  );
}
