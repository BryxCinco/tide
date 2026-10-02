import { useEffect, useState } from 'react';
import { Text as RNText, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { QuestFormModal, QuestManagerModal } from '../quest';
import { useQuestStore } from '../../store/questStore';
import { QUEST_CATEGORY_COLOR, QUEST_CATEGORY_ICON, QUEST_CATEGORY_LABEL, QUEST_TIER_META, type Quest, type QuestCategory } from '../../types/quest';
import { confirmAsync } from '../../utils/confirm';
import { hexToRgba } from '../../utils/color';
import { soundManager } from '../../utils/soundManager';
import { formatWeekdayMonthDay } from '../../utils/formatDate';
import { Badge, Button, Card, Icon, ProgressBar, Text, type IconName } from '../ui';
import { Pressable } from '../ui/SoundPressable';

function QuestRow({ quest, onToggle, onEdit, onDelete }: { quest: Quest; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const checkScale = useSharedValue(1);
  const color = QUEST_CATEGORY_COLOR[quest.category];
  const tierMeta = QUEST_TIER_META[quest.tier];

  const handleToggle = () => {
    if (!quest.isCompleted) {
      soundManager.play('success');
      checkScale.value = withSequence(withTiming(1.3, { duration: 120 }), withTiming(1, { duration: 150 }));
    }
    onToggle();
  };

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  return (
    <View className="flex-row items-center gap-1.5 rounded-xl px-1 py-1 hover:bg-elevated">
      <Pressable onPress={handleToggle} className="flex-1 flex-row items-center gap-3 rounded-xl px-1 py-1.5">
        <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: hexToRgba(color, 0.12) }}>
          <Icon name={quest.icon as IconName} size={17} color={color} />
        </View>
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-1.5">
            <Text variant="body" color={quest.isCompleted ? 'muted' : 'primary'} className={quest.isCompleted ? 'font-medium line-through' : 'font-medium'}>
              {quest.title}
            </Text>
            <View className="rounded-full px-1.5 py-0.5" style={{ backgroundColor: hexToRgba(tierMeta.color, 0.15) }}>
              <RNText className="text-[10px] font-semibold" style={{ color: tierMeta.color }}>
                {tierMeta.name}
              </RNText>
            </View>
          </View>
          <Text variant="caption" color="muted" className="mt-0.5 normal-case tracking-normal" numberOfLines={1}>
            {quest.generationReason || quest.description} · +{quest.xp} XP
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
          <Icon name="Trash2" size={14} color="#EF4444" />
        </Pressable>
      )}
    </View>
  );
}

function CategoryGroup({ category, quests, onToggle, onEdit, onDelete }: { category: QuestCategory; quests: Quest[]; onToggle: (q: Quest) => void; onEdit: (q: Quest) => void; onDelete: (q: Quest) => void }) {
  const color = QUEST_CATEGORY_COLOR[category];
  return (
    <View className="gap-1.5 rounded-2xl border border-subtle p-2">
      <View className="flex-row items-center gap-2 px-1.5 pt-1">
        <Icon name={QUEST_CATEGORY_ICON[category] as IconName} size={14} color={color} />
        <Text variant="label" style={{ color }}>
          {QUEST_CATEGORY_LABEL[category]}
        </Text>
      </View>
      {quests.map((quest) => (
        <QuestRow key={quest.id} quest={quest} onToggle={() => onToggle(quest)} onEdit={() => onEdit(quest)} onDelete={() => onDelete(quest)} />
      ))}
    </View>
  );
}

/**
 * Dashboard widget for Tide's Quest — always shown (not a toggleable WidgetGrid entry,
 * unlike the widgets in Fix 8), since the daily streak mechanic is meant to be a constant,
 * hard-to-miss presence rather than something a user could configure away. Replaces the
 * flat drag-reorderable list the old DailyQuestCard had with quests grouped by category —
 * those two layouts don't mix, so fine-grained reordering now lives only in
 * QuestManagerModal's own flat list (still fully drag-reorderable there).
 */
export function QuestCard() {
  const todayQuests = useQuestStore((s) => s.todayQuests);
  const streak = useQuestStore((s) => s.streak);
  const questStreak = useQuestStore((s) => s.questStreak);
  const isLoading = useQuestStore((s) => s.isLoading);
  const fetchTodayQuests = useQuestStore((s) => s.fetchTodayQuests);
  const generateQuests = useQuestStore((s) => s.generateQuests);
  const toggleQuest = useQuestStore((s) => s.toggleQuest);
  const deleteQuest = useQuestStore((s) => s.deleteQuest);

  const [formVisible, setFormVisible] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | undefined>(undefined);
  const [managerVisible, setManagerVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchTodayQuests();
  }, [fetchTodayQuests]);

  const visibleQuests = todayQuests.filter((q) => q.isActive);
  const completedCount = visibleQuests.filter((q) => q.isCompleted).length;
  const progress = visibleQuests.length > 0 ? (completedCount / visibleQuests.length) * 100 : 0;

  const grouped = visibleQuests.reduce<Partial<Record<QuestCategory, Quest[]>>>((acc, quest) => {
    (acc[quest.category] ??= []).push(quest);
    return acc;
  }, {});
  const categoriesInOrder = (Object.keys(QUEST_CATEGORY_LABEL) as QuestCategory[]).filter((c) => grouped[c]?.length);

  // Nothing fetched yet (first mount, still loading) — stay invisible rather than flash an
  // empty card. Once loaded, the card always shows (Add Quest / Generate need to be
  // reachable even with zero active quests, e.g. everything got paused).
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

  const handleGenerate = async () => {
    const confirmed = await confirmAsync('Generate today\'s quests?', 'This replaces your current non-custom quests with a fresh batch. Quests you added yourself are kept.');
    if (!confirmed) return;
    setIsGenerating(true);
    try {
      await generateQuests();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card variant="default" padding="lg" className="gap-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Icon name="Sparkles" size={18} color="#14B8A6" />
          <View>
            <Text variant="h3" color="primary">
              Tide's Quest
            </Text>
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              {formatWeekdayMonthDay(new Date().toISOString())}
            </Text>
          </View>
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
        <View className="gap-1">
          <ProgressBar value={progress} variant="teal" showLabel label={`${completedCount}/${visibleQuests.length} completed today`} />
          {questStreak && questStreak.weeklyCompletionRate > 0 && (
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              {questStreak.weeklyCompletionRate}% of days fully completed this week
            </Text>
          )}
        </View>
      )}

      {visibleQuests.length === 0 ? (
        <Text variant="body" color="muted" className="py-2 text-center">
          No active quests — generate a set, add one below, or unpause one from Manage.
        </Text>
      ) : (
        <View className="gap-3">
          {categoriesInOrder.map((category) => (
            <CategoryGroup
              key={category}
              category={category}
              quests={grouped[category] || []}
              onToggle={(q) => toggleQuest(q.id)}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </View>
      )}

      <View className="flex-row gap-2">
        <Button title="+ Add Quest" variant="ghost" size="sm" onPress={openCreate} className="flex-1" />
        <Button title="Generate Today's Quests" variant="secondary" size="sm" icon="Sparkles" loading={isGenerating} onPress={handleGenerate} className="flex-1" />
      </View>

      <QuestFormModal visible={formVisible} onClose={() => setFormVisible(false)} quest={editingQuest} />
      <QuestManagerModal visible={managerVisible} onClose={() => setManagerVisible(false)} />
    </Card>
  );
}
