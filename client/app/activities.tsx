import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityFormModal, ActivityInfoModal, ActivityRow, FavoriteActivityTile } from '@/components/activity';
import { AppLayout, MobileMenuButton, MobileTabBar } from '@/components/layout';
import { BackButton, BENTO_INK_TEXT, BentoHeader, BentoTile, Button, EmptyState, ErrorState, Icon, Input, ResponsiveContainer, SkeletonRow, Text, type IconName } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { useActivityStore } from '@/store/activityStore';
import type { Activity } from '@/types/activity';
import { isActivityScheduledOn } from '@/utils/activityRecurrence';

interface GroupProps {
  title: string;
  icon: IconName;
  items: Activity[];
  onInfo: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
  onToggleFavorite: (id: string) => void;
  onReorder: (id: string, swapWithId: string) => void;
  onDelete: (id: string) => void;
  onToggleHide: (id: string, archived: boolean) => void;
}

function ActivityGroup({
  title,
  icon,
  items,
  onInfo,
  onEdit,
  onToggleFavorite,
  onReorder,
  onDelete,
  onToggleHide,
  index,
  className,
}: GroupProps & { index: number; className?: string }) {
  if (items.length === 0) return null;

  return (
    <BentoTile index={index} className={className}>
      <View className="gap-4">
        <BentoHeader
          title={title}
          icon={icon}
          right={
            <View className="rounded-full bg-elevated px-2.5 py-0.5">
              <Text variant="body" color="muted" className="text-[12px] font-semibold">
                {items.length}
              </Text>
            </View>
          }
        />
        <View className="gap-2">
          {items.map((activity, i) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              index={i}
              onInfo={() => onInfo(activity)}
              onEdit={() => onEdit(activity)}
              onToggleFavorite={() => onToggleFavorite(activity.id)}
              onMoveUp={() => i > 0 && onReorder(activity.id, items[i - 1].id)}
              onMoveDown={() => i < items.length - 1 && onReorder(activity.id, items[i + 1].id)}
              canMoveUp={i > 0}
              canMoveDown={i < items.length - 1}
              onDelete={() => onDelete(activity.id)}
              onToggleHide={() => onToggleHide(activity.id, !activity.isArchived)}
            />
          ))}
        </View>
      </View>
    </BentoTile>
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
  const { isPhone } = useResponsive();

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
  const scheduledToday = activities.filter((a) => !a.isArchived && isActivityScheduledOn(a));
  const libraryStats = [
    { label: 'active', value: activities.filter((a) => !a.isArchived).length },
    { label: 'favorites', value: activities.filter((a) => a.isFavorite && !a.isArchived).length },
    { label: 'custom', value: activities.filter((a) => a.category === 'custom').length },
    { label: 'hidden', value: activities.filter((a) => a.isArchived).length },
  ];

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
                  Activities
                </Text>
                <Text variant={isPhone ? 'h3' : 'h2'} color="primary" numberOfLines={1}>
                  Your activity library
                </Text>
              </View>
              <Button title="New" variant="primary" size="sm" icon="Plus" onPress={openCreate} />
            </View>

            <View className="gap-3 md:flex-row md:gap-4">
              <BentoTile tone="aurora" index={0} className="md:flex-[1.4]">
                <View className="flex-1 justify-between gap-5">
                  <View className="flex-row items-center gap-2 self-start rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                    <Icon name="CalendarCheck" size={13} color="#FFFFFF" />
                    <Text variant="body" className="text-[12px] font-semibold" style={{ color: '#FFFFFF' }}>
                      {scheduledToday.length > 0 ? `${scheduledToday.length} on today’s routine` : 'No routine set for today'}
                    </Text>
                  </View>
                  <View className="gap-1.5">
                    <Text variant="h2" style={{ color: '#FFFFFF' }}>
                      Build the routine you actually want.
                    </Text>
                    <Text variant="body" className="text-[13px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      Make an activity for anything you track, then schedule it daily, weekly or on your own days.
                    </Text>
                  </View>
                  {scheduledToday.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2">
                      {scheduledToday.slice(0, 4).map((a) => (
                        <View key={a.id} className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}>
                          <Icon name={a.icon as IconName} size={13} color="#FFFFFF" />
                          <Text variant="body" className="text-[12px] font-semibold" style={{ color: '#FFFFFF' }}>
                            {a.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Button title="New activity" icon="Plus" variant="secondary" size="sm" onPress={openCreate} className="self-start" />
                  )}
                </View>
              </BentoTile>

              <BentoTile tone="ink" index={1} className="md:flex-1">
                <View className="flex-1 justify-between gap-5">
                  <Text variant="label" style={{ color: BENTO_INK_TEXT.muted, letterSpacing: 1.4 }}>
                    Library
                  </Text>
                  <View className="flex-row flex-wrap gap-y-4">
                    {libraryStats.map((stat) => (
                      <View key={stat.label} className="basis-1/2">
                        <Text variant="h1" style={{ color: BENTO_INK_TEXT.primary, fontVariant: ['tabular-nums'] }}>
                          {stat.value}
                        </Text>
                        <Text variant="body" className="text-[12px] font-medium" style={{ color: BENTO_INK_TEXT.muted }}>
                          {stat.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </BentoTile>
            </View>

            <BentoTile index={2}>
              <Input placeholder="Search activities" icon="Search" value={search} onChangeText={setSearch} />
            </BentoTile>

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
              <View className="gap-3 md:gap-4">
                {favorites.length > 0 && (
                  <View className="gap-3">
                    <View className="flex-row items-center gap-1.5 px-1">
                      <Icon name="Star" size={14} color="#F59E0B" fill="#F59E0B" />
                      <Text variant="label" color="muted" style={{ letterSpacing: 1.4 }}>
                        Favorites
                      </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-3 md:gap-4">
                      {favorites.map((activity, i) => (
                        <FavoriteActivityTile
                          key={activity.id}
                          activity={activity}
                          index={i + 3}
                          className="basis-[46%] grow md:basis-[22%] md:grow-0"
                          onPress={() => openInfo(activity)}
                          onToggleFavorite={() => toggleFavorite(activity.id)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                <View className="gap-3 lg:flex-row lg:items-start lg:gap-4">
                  <ActivityGroup
                    index={4}
                    className="lg:flex-1"
                    title="Custom"
                    icon="Sparkles"
                    items={custom}
                    onInfo={openInfo}
                    onEdit={openEdit}
                    onToggleFavorite={toggleFavorite}
                    onReorder={reorderActivity}
                    onDelete={deleteActivity}
                    onToggleHide={setArchived}
                  />
                  <ActivityGroup
                    index={5}
                    className="lg:flex-1"
                    title="Built-in"
                    icon="Layers"
                    items={predefined}
                    onInfo={openInfo}
                    onEdit={openEdit}
                    onToggleFavorite={toggleFavorite}
                    onReorder={reorderActivity}
                    onDelete={deleteActivity}
                    onToggleHide={setArchived}
                  />
                </View>
                <ActivityGroup
                  index={6}
                  title="Hidden"
                  icon="Archive"
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

      <MobileTabBar />
    </AppLayout>
  );
}
