import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLayout } from '@/components/layout';
import { TaskCard, TaskFilters, TaskFormModal } from '@/components/tasks';
import { BackButton, Button, EmptyState, ResponsiveContainer, Text } from '@/components/ui';
import { useActivityStore } from '@/store/activityStore';
import { getVisibleTasks, useTaskStore } from '@/store/taskStore';
import type { Task } from '@/types/task';

export default function TasksScreen() {
  const tasks = useTaskStore((s) => s.tasks);
  const filter = useTaskStore((s) => s.filter);
  const sort = useTaskStore((s) => s.sort);
  const setFilter = useTaskStore((s) => s.setFilter);
  const setSort = useTaskStore((s) => s.setSort);
  const toggleTaskStatus = useTaskStore((s) => s.toggleTaskStatus);

  const activities = useActivityStore((s) => s.activities);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  const visibleTasks = getVisibleTasks(tasks, filter, sort);

  const openCreate = () => {
    setEditingTask(undefined);
    setModalVisible(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setModalVisible(true);
  };

  return (
    <AppLayout showMobileMenuButton={false}>
      <SafeAreaView className="flex-1 bg-base">
        <ScrollView className="flex-1" contentContainerClassName="pb-24 pt-4 md:pt-6 lg:pt-8">
          <ResponsiveContainer className="gap-6">
            <View className="flex-row items-center gap-3">
              <BackButton />
              <Text variant="h2" color="primary" className="flex-1">
                Tasks
              </Text>
              <Button title="New" variant="primary" size="sm" icon="Plus" onPress={openCreate} />
            </View>

            <TaskFilters filter={filter} sort={sort} onFilterChange={setFilter} onSortChange={setSort} />

            {visibleTasks.length === 0 ? (
              <EmptyState
                icon="ListChecks"
                title="No tasks yet"
                description="Create your first task to start planning your day."
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
                      onEdit={() => openEdit(task)}
                    />
                  </View>
                ))}
              </View>
            )}
          </ResponsiveContainer>
        </ScrollView>

        <TaskFormModal visible={modalVisible} onClose={() => setModalVisible(false)} task={editingTask} />
      </SafeAreaView>
    </AppLayout>
  );
}
