import { useEffect, useState } from 'react';
import { Text as RNText, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { QuestFormModal, QuestManagerModal } from '../quest';
import { useQuestStore } from '../../store/questStore';
import { QUEST_CATEGORY_COLOR, type Quest } from '../../types/quest';
import { confirmAsync } from '../../utils/confirm';
import { hexToRgba } from '../../utils/color';
import { soundManager } from '../../utils/soundManager';
import { colors } from '../../utils/theme';
import { Button, Card, Icon, ProgressBar, Text, type IconName } from '../ui';
import { Pressable } from '../ui/SoundPressable';

function QuestRow({
  quest,
  onToggle,
  onEdit,
  onDelete,
  drag,
  isDragging,
}: {
  quest: Quest;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  drag: () => void;
  isDragging: boolean;
}) {
  const checkScale = useSharedValue(1);
  const color = QUEST_CATEGORY_COLOR[quest.category];

  const handleToggle = () => {
    if (!quest.isCompleted) {
      soundManager.play('success');
      checkScale.value = withSequence(withTiming(1.3, { duration: 120 }), withTiming(1, { duration: 150 }));
    }
    onToggle();
  };

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  return (
    <View
      className={
        isDragging
          ? 'flex-row items-center gap-1.5 rounded-xl border border-tide-teal bg-elevated px-1 py-1'
          : 'flex-row items-center gap-1.5 rounded-xl px-1 py-1 hover:bg-elevated'
      }
    >
      <Pressable onPressIn={drag} hitSlop={8} className="cursor-grab px-1">
        <Icon name="GripVertical" size={14} color={hexToRgba(color, 0.4)} />
      </Pressable>

      <Pressable onPress={handleToggle} className="flex-1 flex-row items-center gap-3 rounded-xl px-1 py-1.5">
        <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: hexToRgba(color, 0.12) }}>
          <Icon name={quest.icon as IconName} size={17} color={color} />
        </View>
        <View className="flex-1">
          <Text variant="body" color={quest.isCompleted ? 'muted' : 'primary'} className={quest.isCompleted ? 'font-medium line-through' : 'font-medium'}>
            {quest.title}
          </Text>
          <Text variant="caption" color="muted" className="mt-0.5 normal-case tracking-normal">
            {quest.description} · +{quest.xp} XP
          </Text>
        </View>
        <Animated.View
          style={checkStyle}
          className={
            quest.isCompleted
              ? 'h-6 w-6 items-center justify-center rounded-full bg-tide-teal'
              : 'h-6 w-6 items-center justify-center rounded-full border-2 border-subtle'
          }
        >
          {quest.isCompleted && <Icon name="Check" size={14} color="#FFFFFF" />}
        </Animated.View>
      </Pressable>

      <Pressable onPress={onEdit} hitSlop={4} className="h-10 w-10 items-center justify-center">
        <Icon name="Pencil" size={14} color={hexToRgba(color, 0.6)} />
      </Pressable>

      {quest.isCustom && (
        <Pressable onPress={onDelete} hitSlop={4} className="h-10 w-10 items-center justify-center">
          <Icon name="Trash2" size={14} color={colors.status.error} />
        </Pressable>
      )}
    </View>
  );
}

/** Dashboard widget for the day's quests — always shown (not a toggleable WidgetGrid
 * entry, unlike the widgets in Fix 8), since the daily streak mechanic is meant to be a
 * constant, hard-to-miss presence rather than something a user could configure away. Fully
 * customizable now: reorder by drag, edit/delete per quest, "+ Add Quest" for a custom one,
 * and a "Manage" link for the fuller list (including paused quests, which are hidden here). */
export function DailyQuestCard() {
  const todayQuests = useQuestStore((s) => s.todayQuests);
  const streak = useQuestStore((s) => s.streak);
  const isLoading = useQuestStore((s) => s.isLoading);
  const fetchTodayQuests = useQuestStore((s) => s.fetchTodayQuests);
  const toggleQuest = useQuestStore((s) => s.toggleQuest);
  const deleteQuest = useQuestStore((s) => s.deleteQuest);

  const [formVisible, setFormVisible] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | undefined>(undefined);
  const [managerVisible, setManagerVisible] = useState(false);

  useEffect(() => {
    fetchTodayQuests();
  }, [fetchTodayQuests]);

  const visibleQuests = todayQuests.filter((q) => q.isActive);
  const completedCount = visibleQuests.filter((q) => q.isCompleted).length;
  const progress = visibleQuests.length > 0 ? (completedCount / visibleQuests.length) * 100 : 0;

  // Nothing fetched yet (first mount, still loading) — stay invisible rather than flash an
  // empty card. Once loaded, the card always shows (Add Quest / Manage need to be reachable
  // even with zero active quests, e.g. everything got paused).
  if (isLoading && todayQuests.length === 0) return null;

  const openCreate = () => {
    setEditingQuest(undefined);
    setFormVisible(true);
  };

  const openEdit = (quest: Quest) => {
    setEditingQuest(quest);
    setFormVisible(true);
  };

  const handleDelete = async (quest: Quest) => {
    const confirmed = await confirmAsync('Delete quest?', `"${quest.title}" will be removed. This can't be undone.`);
    if (confirmed) deleteQuest(quest.id);
  };

  return (
    <Card variant="default" padding="lg" className="gap-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Icon name="Sparkles" size={18} color="#14B8A6" />
          <Text variant="h3" color="primary">
            Daily Quests
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {streak > 0 && (
            <View className="flex-row items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1">
              <Icon name="Flame" size={14} color="#F97316" />
              <RNText className="text-caption font-bold text-orange-500">
                {streak} day{streak === 1 ? '' : 's'}
              </RNText>
            </View>
          )}
          <Pressable onPress={() => setManagerVisible(true)} hitSlop={4} className="h-10 w-10 items-center justify-center">
            <Icon name="Settings2" size={16} />
          </Pressable>
        </View>
      </View>

      {visibleQuests.length > 0 && (
        <ProgressBar value={progress} variant="teal" showLabel label={`${completedCount}/${visibleQuests.length} completed`} />
      )}

      {visibleQuests.length === 0 ? (
        <Text variant="body" color="muted" className="py-2 text-center">
          No active quests — add one below or unpause one from Manage.
        </Text>
      ) : (
        <View style={{ minHeight: visibleQuests.length * 56 }}>
          <DraggableFlatList
            data={visibleQuests}
            keyExtractor={(quest) => quest.id}
            scrollEnabled={false}
            renderItem={({ item: quest, drag, isActive }: RenderItemParams<Quest>) => (
              <QuestRow
                quest={quest}
                onToggle={() => toggleQuest(quest.id)}
                onEdit={() => openEdit(quest)}
                onDelete={() => handleDelete(quest)}
                drag={drag}
                isDragging={isActive}
              />
            )}
            onDragEnd={({ data }) => {
              // `data` is the new order of just the visible (active) quests — paused ones
              // aren't shown here, so they're appended after in their existing relative
              // order rather than trying to preserve exact interleaving (QuestManagerModal
              // is the tool for fine-grained full-list ordering, including paused quests).
              const pausedQuests = todayQuests.filter((q) => !q.isActive);
              useQuestStore.setState({ todayQuests: [...data, ...pausedQuests] });
            }}
          />
        </View>
      )}

      <Button title="+ Add Quest" variant="ghost" size="sm" onPress={openCreate} />

      <QuestFormModal visible={formVisible} onClose={() => setFormVisible(false)} quest={editingQuest} />
      <QuestManagerModal visible={managerVisible} onClose={() => setManagerVisible(false)} />
    </Card>
  );
}
