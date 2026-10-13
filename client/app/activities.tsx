import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityFormModal, ActivityInfoModal, ActivityRow } from '@/components/activity';
import { AppLayout, MobileMenuButton } from '@/components/layout';
import { BackButton, Button, EmptyState, ErrorState, Input, ResponsiveContainer, SkeletonRow, Text } from '@/components/ui';
import { useActivityStore } from '@/store/activityStore';
import type { Activity } from '@/types/activity';

interface GroupProps {
  title: string;
  items: Activity[];
  onInfo: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
  onToggleFavorite: (id: string) => void;
  onReorder: (id: string, swapWithId: string) => void;
  onDelete: (id: string) => void;
  onToggleHide: (id: string, archived: boolean) => void;
}

function ActivityGroup({ title, items, onInfo, onEdit, onToggleFavorite, onReorder, onDelete, onToggleHide }: GroupProps) {
  if (items.length === 0) return null;

  return (
    <View className="gap-3">
      <Text variant="label" color="muted">
        {title}
      </Text>
      <View className="gap-2">
        {items.map((activity, index) => (
          <ActivityRow
            key={activity.id}
            activity={activity}
            onInfo={() => onInfo(activity)}
            onEdit={() => onEdit(activity)}
            onToggleFavorite={() => onToggleFavorite(activity.id)}
            onMoveUp={() => index > 0 && onReorder(activity.id, items[index - 1].id)}
            onMoveDown={() => index < items.length - 1 && onReorder(activity.id, items[index + 1].id)}
            canMoveUp={index > 0}
            canMoveDown={index < items.length - 1}
            onDelete={() => onDelete(activity.id)}
            onToggleHide={() => onToggleHide(activity.id, !activity.isArchived)}
          />
        ))}
      </View>
    </View>
  );
}

export default function ActivitiesScreen() {
  const activities = useActivityStore((s) => s.activities);
  const isLoading = useActivityStore((s) => s.isLoading);
  const error = useActivityStore((s) => s.error);
  const fetchActivities = useActivityStore((s) => s.fetchActivities);
  const clearError = useActivityStore((s) => s.clearError);
  const toggleFavorite = useActivityStore((s) => s.toggleFavorite);
  const reorderActivity = useActivityStore((s) => s.reorderActivity);
  const deleteActivity = useActivityStore((s) => s.deleteActivity);
  const setArchived = useActivityStore((s) => s.setArchived);

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>(undefined);
  const [infoActivity, setInfoActivity] = useState<Activity | undefined>(undefined);
  const [infoVisible, setInfoVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  };

  const query = search.trim().toLowerCase();
  const filtered = query ? activities.filter((a) => a.name.toLowerCase().includes(query)) : activities;

  const active = filtered.filter((a) => !a.isArchived);
  const archived = filtered.filter((a) => a.isArchived);

  const favorites = active.filter((a) => a.isFavorite);
  const custom = active.filter((a) => a.category === 'custom' && !a.isFavorite);
  const predefined = active.filter((a) => a.category === 'predefined' && !a.isFavorite);

  const openCreate = () => {
    setEditingActivity(undefined);
    setModalVisible(true);
  };

  const openEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setModalVisible(true);
  };

  const openInfo = (activity: Activity) => {
    setInfoActivity(activity);
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
              <BackButton />
              <Text variant="h2" color="primary" className="flex-1">
                Activities
              </Text>
              <MobileMenuButton />
              <Button title="New" variant="primary" size="sm" icon="Plus" onPress={openCreate} />
            </View>

            <Input placeholder="Search activities" icon="Search" value={search} onChangeText={setSearch} />

            {error && activities.length === 0 ? (
              <ErrorState
                message={error}
                onRetry={() => {
                  clearError();
                  fetchActivities();
                }}
              />
            ) : isLoading && activities.length === 0 ? (
              <View className="gap-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <SkeletonRow key={i} />
                ))}
              </View>
            ) : activities.length === 0 ? (
              <EmptyState
                icon="Layers"
                title="No activities yet"
                description="Create your first!"
                actionLabel="New Activity"
                onAction={openCreate}
              />
            ) : (
              <View className="gap-6">
                <ActivityGroup
                  title="Favorites"
                  items={favorites}
                  onInfo={openInfo}
                  onEdit={openEdit}
                  onToggleFavorite={toggleFavorite}
                  onReorder={reorderActivity}
                  onDelete={deleteActivity}
                  onToggleHide={setArchived}
                />
                <ActivityGroup
                  title="Custom"
                  items={custom}
                  onInfo={openInfo}
                  onEdit={openEdit}
                  onToggleFavorite={toggleFavorite}
                  onReorder={reorderActivity}
                  onDelete={deleteActivity}
                  onToggleHide={setArchived}
                />
                <ActivityGroup
                  title="Pre-defined"
                  items={predefined}
                  onInfo={openInfo}
                  onEdit={openEdit}
                  onToggleFavorite={toggleFavorite}
                  onReorder={reorderActivity}
                  onDelete={deleteActivity}
                  onToggleHide={setArchived}
                />
                <ActivityGroup
                  title="Archived"
                  items={archived}
                  onInfo={openInfo}
                  onEdit={openEdit}
                  onToggleFavorite={toggleFavorite}
                  onReorder={reorderActivity}
                  onDelete={deleteActivity}
                  onToggleHide={setArchived}
                />
              </View>
            )}
          </ResponsiveContainer>
        </ScrollView>

        <ActivityFormModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          activity={editingActivity}
        />

        <ActivityInfoModal
          visible={infoVisible}
          onClose={() => setInfoVisible(false)}
          activity={infoActivity}
          onEdit={(activity) => {
            setInfoVisible(false);
            openEdit(activity);
          }}
        />
      </SafeAreaView>
    </AppLayout>
  );
}
