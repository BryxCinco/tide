import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useQuestStore } from '../../store/questStore';
import { QUEST_CATEGORY_COLOR, QUEST_TIER_META, type Quest } from '../../types/quest';
import { cn } from '../../utils/cn';
import { confirmAsync } from '../../utils/confirm';
import { soundManager } from '../../utils/soundManager';
import { Button, Icon, Modal, Text, useModalBodyMaxHeight, type IconName } from '../ui';
import { QuestFormModal } from './QuestFormModal';

export interface QuestManagerModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Split out purely so it can call useModalBodyMaxHeight() — see CustomizeDashboardModal's
 * WidgetDraggableList for why that hook only resolves inside Modal's own `children` subtree. */
function QuestDraggableList({
  quests,
  renderItem,
  onDragEnd,
}: {
  quests: Quest[];
  renderItem: (params: RenderItemParams<Quest>) => ReactElement;
  onDragEnd: (data: Quest[]) => void;
}) {
  const bodyMaxHeight = useModalBodyMaxHeight();

  if (quests.length === 0) {
    return (
      <Text variant="body" color="muted" className="py-6 text-center">
        No quests yet today.
      </Text>
    );
  }

  return (
    <View style={{ maxHeight: bodyMaxHeight ?? 320 }}>
      <DraggableFlatList
        data={quests}
        keyExtractor={(quest) => quest.id}
        renderItem={renderItem}
        onDragEnd={({ data }) => onDragEnd(data)}
        showsVerticalScrollIndicator={false}
        activationDistance={4}
      />
    </View>
  );
}

/** Bulk-management view for today's quests — active and paused alike (QuestCard only
 * ever shows active ones). Reorder/pause/delete all apply immediately; Edit opens
 * QuestFormModal on top of this one. */
export function QuestManagerModal({ visible, onClose }: QuestManagerModalProps) {
  const quests = useQuestStore((s) => s.todayQuests);
  const updateQuest = useQuestStore((s) => s.updateQuest);
  const deleteQuest = useQuestStore((s) => s.deleteQuest);
  const reorderQuests = useQuestStore((s) => s.reorderQuests);
  const themeColors = useThemeColors();

  const [formVisible, setFormVisible] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | undefined>(undefined);

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

  const moveQuest = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= quests.length) return;
    reorderQuests(quests[index].id, quests[targetIndex].id);
  };

  const renderItem = ({ item: quest, getIndex, drag, isActive }: RenderItemParams<Quest>) => {
    const index = getIndex() ?? 0;
    const color = QUEST_CATEGORY_COLOR[quest.category];
    const isFirst = index === 0;
    const isLast = index === quests.length - 1;

    return (
      <View
        className={cn('mb-2 gap-2 rounded-xl border border-subtle bg-base p-3', isActive && 'border-tide-teal')}
        style={isActive ? { opacity: 0.9, transform: [{ scale: 1.02 }] } : undefined}
      >
        <View className="flex-row items-center gap-2">
          <Pressable onPressIn={() => { soundManager.play('tap'); drag(); }} hitSlop={8} className="cursor-grab">
            <Icon name="GripVertical" size={16} color={themeColors.text.disabled} />
          </Pressable>

          <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1F` }}>
            <Icon name={quest.icon as IconName} size={15} color={color} />
          </View>

          <View className="flex-1">
            <Text
              variant="body"
              color={quest.isActive ? 'primary' : 'muted'}
              className="font-medium"
              numberOfLines={1}
            >
              {quest.title}
            </Text>
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              +{quest.xp} XP · {QUEST_TIER_META[quest.tier].name}
              {quest.isRecurring ? ` · ${quest.recurrenceType}` : ''}
              {quest.isCustom ? ' · Custom' : ''}
            </Text>
          </View>

          <Pressable onPress={() => moveQuest(index, -1)} disabled={isFirst} hitSlop={6} className={isFirst ? 'opacity-30' : undefined}>
            <Icon name="ChevronUp" size={16} />
          </Pressable>
          <Pressable onPress={() => moveQuest(index, 1)} disabled={isLast} hitSlop={6} className={isLast ? 'opacity-30' : undefined}>
            <Icon name="ChevronDown" size={16} />
          </Pressable>

          <Pressable onPress={() => openEdit(quest)} hitSlop={6}>
            <Icon name="Pencil" size={16} color={themeColors.text.muted} />
          </Pressable>

          {quest.isCustom && (
            <Pressable onPress={() => handleDelete(quest)} hitSlop={6}>
              <Icon name="Trash2" size={16} color={themeColors.status.error} />
            </Pressable>
          )}

          <Pressable
            onPress={() => updateQuest(quest.id, { isActive: !quest.isActive })}
            hitSlop={6}
            className={cn('ml-1 h-6 w-11 justify-center rounded-full px-0.5', quest.isActive ? 'bg-tide-teal' : 'bg-hover')}
          >
            <View className={cn('h-5 w-5 rounded-full bg-base', quest.isActive ? 'self-end' : 'self-start')} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        onClose={onClose}
        title="Manage Quests"
        icon="ListChecks"
        size="md"
        scrollable={false}
        footer={<Button title="+ Add Quest" variant="secondary" size="md" fullWidth onPress={openCreate} />}
      >
        {/* DraggableFlatList renders its own internal ScrollView — see CustomizeDashboardModal's
            matching comment for why the outer Modal's body is non-scrollable here. */}
        <QuestDraggableList
          quests={quests}
          renderItem={renderItem}
          onDragEnd={(data) => {
            // DraggableFlatList already hands back the final order directly — write it
            // straight to the store instead of reconstructing it via N pairwise swaps
            // through reorderQuests (which exists for the Up/Down buttons above, where
            // only two ids are known at a time).
            useQuestStore.setState({ todayQuests: data });
          }}
        />
      </Modal>

      <QuestFormModal visible={formVisible} onClose={() => setFormVisible(false)} quest={editingQuest} />
    </>
  );
}
