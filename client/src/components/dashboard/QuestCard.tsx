import { useEffect, useState } from 'react';
import { Text as RNText, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { QuestFormModal, QuestManagerModal } from '../quest';
import { useQuestStore } from '../../store/questStore';
import { useDayStreak } from '../../store/streakStore';
import { QUEST_CATEGORY_COLOR, QUEST_CATEGORY_LABEL, QUEST_TIER_META, type Quest, type QuestCategory } from '../../types/quest';
import { confirmAsync } from '../../utils/confirm';
import { hexToRgba } from '../../utils/color';
import { soundManager } from '../../utils/soundManager';
import { formatWeekdayMonthDay } from '../../utils/formatDate';
import { ocean } from '../../utils/theme';
import { BentoHeader, BentoTile, Button, Icon, Text, type IconName } from '../ui';
import { Pressable } from '../ui/SoundPressable';

function QuestRow({ quest, onToggle, onEdit, onDelete }: { quest: Quest; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const checkScale = useSharedValue(1);
  const color = QUEST_CATEGORY_COLOR[quest.category];
  const tierMeta = QUEST_TIER_META[quest.tier];

  // A completed quest is locked (its XP is paid out) — it can't be un-checked or edited (a
  // custom one can still be deleted); the server enforces the same.
  const locked = quest.isCompleted;

  const handleToggle = () => {
    if (locked) return;
    soundManager.play('success');
    checkScale.value = withSequence(withTiming(1.3, { duration: 120 }), withTiming(1, { duration: 150 }));
    onToggle();
  };

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  return (
    <View className="flex-row items-center gap-0.5 rounded-xl hover:bg-hover">
      <Pressable
        onPress={handleToggle}
        disabled={locked}
        accessibilityState={{ checked: quest.isCompleted, disabled: locked }}
        accessibilityHint={locked ? 'Completed quests are locked' : undefined}
        className="flex-1 flex-row items-center gap-2.5 rounded-xl px-1.5 py-1.5"
      >
        <Animated.View
          style={checkStyle}
          className={
            quest.isCompleted
              ? 'h-[18px] w-[18px] items-center justify-center rounded-full bg-tide-teal'
              : 'h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-hover'
          }
        >
          {quest.isCompleted && <Icon name="Check" size={11} color="#FFFFFF" strokeWidth={3} />}
        </Animated.View>
        <View className="h-7 w-7 items-center justify-center rounded-[9px]" style={{ backgroundColor: hexToRgba(color, 0.13) }}>
          <Icon name={quest.icon as IconName} size={14} color={color} strokeWidth={2.2} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text
              variant="body"
              color={quest.isCompleted ? 'muted' : 'primary'}
              className={quest.isCompleted ? 'shrink text-[13px] font-medium line-through' : 'shrink text-[13px] font-semibold'}
              numberOfLines={1}
            >
              {quest.title}
            </Text>
            <View className="rounded-full px-1.5 py-px" style={{ backgroundColor: hexToRgba(tierMeta.color, 0.14) }}>
              <RNText className="text-[9.5px] font-semibold" style={{ color: tierMeta.color }}>
                {tierMeta.name}
              </RNText>
            </View>
          </View>
          <Text variant="body" color="muted" className="text-[11.5px] leading-[15px]" numberOfLines={1}>
            {quest.generationReason || quest.description} · +{quest.xp} XP
          </Text>
        </View>
      </Pressable>

      {locked ? (
        <View className="h-8 w-8 items-center justify-center" accessibilityLabel="Completed — locked">
          <Icon name="Lock" size={12} color={hexToRgba(color, 0.45)} />
        </View>
      ) : (
        <Pressable onPress={onEdit} hitSlop={6} accessibilityLabel={`Edit ${quest.title}`} className="h-8 w-8 items-center justify-center rounded-lg">
          <Icon name="Pencil" size={13} color={hexToRgba(color, 0.65)} />
        </Pressable>
      )}

      {quest.isCustom && (
        <Pressable onPress={onDelete} hitSlop={6} accessibilityLabel={`Delete ${quest.title}`} className="h-8 w-8 items-center justify-center rounded-lg">
          <Icon name="Trash2" size={13} color="#EF4444" />
        </Pressable>
      )}
    </View>
  );
}

function CategoryGroup({ category, quests, onToggle, onEdit, onDelete }: { category: QuestCategory; quests: Quest[]; onToggle: (q: Quest) => void; onEdit: (q: Quest) => void; onDelete: (q: Quest) => void }) {
  const color = QUEST_CATEGORY_COLOR[category];
  return (
    <View className="min-w-0 gap-0.5 md:flex-1">
      <View className="flex-row items-center gap-1.5 px-1.5 pb-0.5">
        <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <Text variant="label" className="text-[10px] tracking-[0.8px]" style={{ color }}>
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
  // The same day streak as the Dashboard/Profile stat — not the all-quests-done streak.
  const streak = useDayStreak();
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
    <BentoTile tone="glass" dense>
      <View className="gap-3">
        <BentoHeader
          dense
          title="Tide's Quest"
          icon="Sparkles"
          color={ocean.lagoon}
          right={
            <View className="flex-row items-center gap-1.5">
              <Text variant="body" color="muted" className="hidden text-[11.5px] md:flex">
                {formatWeekdayMonthDay(new Date().toISOString())}
              </Text>
              {streak > 0 && (
                <View className="flex-row items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: hexToRgba(ocean.coral, 0.14) }}>
                  <Icon name="Flame" size={11} color={ocean.coral} />
                  <RNText className="text-[11px] font-bold" style={{ color: ocean.coral }}>
                    {streak}d
                  </RNText>
                </View>
              )}
              <Pressable onPress={() => setManagerVisible(true)} hitSlop={6} accessibilityLabel="Manage quests" className="h-7 w-7 items-center justify-center rounded-lg hover:bg-hover">
                <Icon name="Settings2" size={14} />
              </Pressable>
            </View>
          }
        />

        {visibleQuests.length > 0 && (
          <View className="gap-1">
            <View className="h-1 overflow-hidden rounded-full bg-hover">
              <View style={{ width: `${progress}%`, height: '100%', borderRadius: 999, backgroundColor: ocean.lagoon }} />
            </View>
            <Text variant="body" color="muted" className="text-[11px]">
              {completedCount}/{visibleQuests.length} done today
              {questStreak && questStreak.weeklyCompletionRate > 0 ? ` · ${questStreak.weeklyCompletionRate}% of days fully completed this week` : ''}
            </Text>
          </View>
        )}

        {visibleQuests.length === 0 ? (
          <Text variant="body" color="muted" className="py-1 text-[12.5px]">
            No active quests — generate a set, add one below, or unpause one from Manage.
          </Text>
        ) : (
          <View className="gap-2.5 md:flex-row md:gap-3">
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

        <View className="flex-row items-center justify-end gap-1.5 border-t border-subtle pt-2.5">
          <Button title="Add quest" variant="ghost" size="sm" icon="Plus" onPress={openCreate} />
          <Button title="Generate today's" variant="secondary" size="sm" icon="Sparkles" loading={isGenerating} onPress={handleGenerate} />
        </View>
      </View>

      <QuestFormModal visible={formVisible} onClose={() => setFormVisible(false)} quest={editingQuest} />
      <QuestManagerModal visible={managerVisible} onClose={() => setManagerVisible(false)} />
    </BentoTile>
  );
}
