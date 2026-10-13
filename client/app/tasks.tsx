import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuestCard } from '@/components/dashboard';
import { AppLayout, MobileMenuButton } from '@/components/layout';
import { TaskCard, TaskFilters, TaskFormModal, TaskInfoModal } from '@/components/tasks';
import { BackButton, Button, EmptyState, ErrorState, ResponsiveContainer, SkeletonRow, Text } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { useActivityStore } from '@/store/activityStore';
import { getVisibleTasks, isTaskOverdue, useTaskStore } from '@/store/taskStore';
import type { Task } from '@/types/task';

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
      <SafeAreaView className="flex-1 bg-base">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-24 pt-4 md:pt-6 lg:pt-8"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <ResponsiveContainer className="gap-6">
            <View className="flex-row items-center gap-3">
              {/* Left slot, same as every other primary screen on phone (hamburger always
                  lives at the row's start, not next to a right-side action button) —
                  desktop/tablet keep BackButton since there's no floating-menu concept
                  there and Sidebar is always visible. */}
              <MobileMenuButton />
              {!isPhone && <BackButton />}
              <View className="flex-1 flex-row items-center gap-2">
                <Text variant="h2" color="primary">
                  Tasks
                </Text>
                {overdueCount > 0 && (
                  <Text variant="caption" color="error" className="normal-case tracking-normal">
                    {overdueCount} overdue
                  </Text>
                )}
              </View>
              <Button title="New" variant="primary" size="sm" icon="Plus" onPress={openCreate} />
            </View>

            <QuestCard />

            <TaskFilters filter={filter} sort={sort} onFilterChange={setFilter} onSortChange={setSort} />

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
              <View className="flex-row flex-wrap gap-2">
                {visibleTasks.map((task) => (
                  <View key={task.id} className="basis-full md:basis-[48%]">
                    <TaskCard
                      task={task}
                      activityName={activities.find((a) => a.id === task.linkedActivityId)?.name}
                      onToggle={() => toggleTaskStatus(task.id)}
                      onView={() => openInfo(task)}
                      onEdit={() => openEdit(task)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  </View>
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
    </AppLayout>
  );
}
