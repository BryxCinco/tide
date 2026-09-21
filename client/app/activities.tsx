import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityFormModal, ActivityRow } from '@/components/activity';
import { BackButton, Button, Input, ResponsiveContainer, Text } from '@/components/ui';
import { useActivityStore } from '@/store/activityStore';
import type { Activity } from '@/types/activity';

interface GroupProps {
  title: string;
  items: Activity[];
  onEdit: (activity: Activity) => void;
  onToggleFavorite: (id: string) => void;
  onReorder: (id: string, swapWithId: string) => void;
}

function ActivityGroup({ title, items, onEdit, onToggleFavorite, onReorder }: GroupProps) {
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
            onEdit={() => onEdit(activity)}
            onToggleFavorite={() => onToggleFavorite(activity.id)}
            onMoveUp={() => index > 0 && onReorder(activity.id, items[index - 1].id)}
            onMoveDown={() => index < items.length - 1 && onReorder(activity.id, items[index + 1].id)}
            canMoveUp={index > 0}
            canMoveDown={index < items.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

export default function ActivitiesScreen() {
  const activities = useActivityStore((s) => s.activities);
  const toggleFavorite = useActivityStore((s) => s.toggleFavorite);
  const reorderActivity = useActivityStore((s) => s.reorderActivity);

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | undefined>(undefined);

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

  return (
    <SafeAreaView className="flex-1 bg-base">
      <ScrollView className="flex-1" contentContainerClassName="pb-24 pt-4 md:pt-6 lg:pt-8">
        <ResponsiveContainer className="gap-6">
          <View className="flex-row items-center gap-3">
            <BackButton />
            <Text variant="h2" color="primary" className="flex-1">
              Activities
            </Text>
            <Button title="New" variant="primary" size="sm" icon="Plus" onPress={openCreate} />
          </View>

          <Input placeholder="Search activities" icon="Search" value={search} onChangeText={setSearch} />

          {activities.length === 0 ? (
            <Text variant="body" color="muted">
              No activities yet.
            </Text>
          ) : (
            <View className="gap-6">
              <ActivityGroup
                title="Favorites"
                items={favorites}
                onEdit={openEdit}
                onToggleFavorite={toggleFavorite}
                onReorder={reorderActivity}
              />
              <ActivityGroup
                title="Custom"
                items={custom}
                onEdit={openEdit}
                onToggleFavorite={toggleFavorite}
                onReorder={reorderActivity}
              />
              <ActivityGroup
                title="Pre-defined"
                items={predefined}
                onEdit={openEdit}
                onToggleFavorite={toggleFavorite}
                onReorder={reorderActivity}
              />
              <ActivityGroup
                title="Archived"
                items={archived}
                onEdit={openEdit}
                onToggleFavorite={toggleFavorite}
                onReorder={reorderActivity}
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
    </SafeAreaView>
  );
}
