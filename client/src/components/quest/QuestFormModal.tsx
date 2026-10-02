import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { ICON_OPTIONS } from '../../mocks/mockActivities';
import { useQuestStore } from '../../store/questStore';
import { QUEST_CATEGORY_COLOR, QUEST_CATEGORY_LABEL, QUEST_TIER_META, type Quest, type QuestCategory, type QuestRecurrenceType, type QuestTier } from '../../types/quest';
import { cn } from '../../utils/cn';
import { confirmAsync } from '../../utils/confirm';
import { computeQuestXp, DIFFICULTY_MODIFIER, type QuestDifficulty } from '../../utils/questXp';
import { colors } from '../../utils/theme';
import { Button, Icon, Input, Modal, Text, type IconName } from '../ui';

export interface QuestFormModalProps {
  visible: boolean;
  onClose: () => void;
  /** Present when editing; absent when creating a new quest. */
  quest?: Quest;
}

const CATEGORIES = Object.keys(QUEST_CATEGORY_COLOR) as QuestCategory[];
const TIERS = Object.keys(QUEST_TIER_META).map(Number) as QuestTier[];
const DIFFICULTIES: { value: QuestDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'normal', label: 'Normal' },
  { value: 'hard', label: 'Hard' },
];
const RECURRENCE_OPTIONS: { value: QuestRecurrenceType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom' },
];

/** Create/edit form for a custom quest — reachable from the Quest card's "+ Add Quest"
 * button and from QuestManagerModal's per-row Edit icon. XP is always auto-computed from
 * tier + difficulty (Tide's Quest's whole point) — never hand-typed. */
export function QuestFormModal({ visible, onClose, quest }: QuestFormModalProps) {
  const addCustomQuest = useQuestStore((s) => s.addCustomQuest);
  const updateQuest = useQuestStore((s) => s.updateQuest);
  const deleteQuest = useQuestStore((s) => s.deleteQuest);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState(ICON_OPTIONS[0]);
  const [category, setCategory] = useState<QuestCategory>('growth');
  const [tier, setTier] = useState<QuestTier>(1);
  const [difficulty, setDifficulty] = useState<QuestDifficulty>('normal');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<QuestRecurrenceType>('daily');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(quest);
  const previewXp = computeQuestXp(tier, DIFFICULTY_MODIFIER[difficulty]);

  useEffect(() => {
    if (!visible) return;
    setTitle(quest?.title ?? '');
    setDescription(quest?.description ?? '');
    setIcon(quest?.icon ?? ICON_OPTIONS[0]);
    setCategory(quest?.category ?? 'growth');
    setTier(quest?.tier ?? 1);
    setDifficulty('normal');
    setIsRecurring(quest?.isRecurring ?? false);
    setRecurrenceType(quest?.recurrenceType ?? 'daily');
    setError(null);
  }, [visible, quest]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Give this quest a title.');
      return;
    }

    if (isEditing && quest) {
      updateQuest(quest.id, {
        title: trimmedTitle,
        description: description.trim(),
        icon,
        category,
        tier,
        isRecurring,
        recurrenceType: isRecurring ? recurrenceType : null,
      });
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await addCustomQuest({
        title: trimmedTitle,
        description: description.trim(),
        icon,
        category,
        tier,
        difficulty: DIFFICULTY_MODIFIER[difficulty],
        isRecurring,
        recurrenceType: isRecurring ? recurrenceType : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this quest. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!quest) return;
    const confirmed = await confirmAsync('Delete quest?', `"${quest.title}" will be removed. This can't be undone.`);
    if (!confirmed) return;
    deleteQuest(quest.id);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={isEditing ? 'Edit Quest' : 'New Quest'}
      icon="Sparkles"
      size="md"
      footer={
        <View className="gap-2">
          <Button title="Save" variant="primary" size="lg" fullWidth loading={isSaving} onPress={handleSave} />
          {isEditing && quest?.isCustom && <Button title="Delete Quest" variant="danger" size="md" fullWidth onPress={handleDelete} />}
        </View>
      }
    >
      <View className="gap-6">
          <Input
            label="Title"
            placeholder="e.g. Read for 20 minutes"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (error) setError(null);
            }}
            error={error ?? undefined}
          />

          <Input
            label="Description"
            placeholder="A short line about what this quest is"
            value={description}
            onChangeText={setDescription}
          />

          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text variant="label" color="muted">
                Tier
              </Text>
              <Text variant="caption" color="accent" className="normal-case tracking-normal">
                +{previewXp} XP
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {TIERS.map((t) => {
                const meta = QUEST_TIER_META[t];
                const isSelected = t === tier;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setTier(t)}
                    className={cn('flex-row items-center gap-1.5 rounded-full border px-3 py-1.5', isSelected ? 'border-transparent' : 'border-subtle bg-surface')}
                    style={isSelected ? { backgroundColor: `${meta.color}22`, borderColor: meta.color } : undefined}
                  >
                    <View className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                    <Text variant="caption" color={isSelected ? 'primary' : 'muted'} className="normal-case tracking-normal">
                      {meta.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-2">
            <Text variant="label" color="muted">
              Difficulty
            </Text>
            <View className="flex-row gap-2">
              {DIFFICULTIES.map((option) => {
                const isSelected = option.value === difficulty;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setDifficulty(option.value)}
                    className={cn('flex-1 items-center rounded-lg border py-2', isSelected ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base')}
                  >
                    <Text variant="caption" color={isSelected ? 'accent' : 'muted'} className="normal-case tracking-normal">
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-2">
            <Text variant="label" color="muted">
              Category
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((option) => {
                const isSelected = option === category;
                const color = QUEST_CATEGORY_COLOR[option];
                return (
                  <Pressable
                    key={option}
                    onPress={() => setCategory(option)}
                    className={cn(
                      'flex-row items-center gap-1.5 rounded-full border px-3 py-1.5',
                      isSelected ? 'border-transparent' : 'border-subtle bg-surface',
                    )}
                    style={isSelected ? { backgroundColor: `${color}22`, borderColor: color } : undefined}
                  >
                    <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <Text variant="caption" color={isSelected ? 'primary' : 'muted'} className="normal-case tracking-normal">
                      {QUEST_CATEGORY_LABEL[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-2">
            <Text variant="label" color="muted">
              Icon
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {ICON_OPTIONS.map((option) => {
                const isSelected = option === icon;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setIcon(option)}
                    className={cn(
                      'h-11 w-11 items-center justify-center rounded-full border-2 transition-transform duration-150 hover:scale-110',
                      isSelected ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-surface hover:border-default',
                    )}
                  >
                    <Icon name={option as IconName} size={19} color={isSelected ? colors.brand.tideTeal : undefined} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-3 rounded-xl border border-subtle bg-surface p-4">
            <Pressable onPress={() => setIsRecurring((v) => !v)} className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text variant="body" color="primary" className="font-medium">
                  Recurring
                </Text>
                <Text variant="caption" color="muted" className="mt-0.5 normal-case tracking-normal">
                  Keep this quest around instead of a one-off
                </Text>
              </View>
              <View className={cn('h-6 w-11 justify-center rounded-full px-0.5', isRecurring ? 'bg-tide-teal' : 'bg-hover')}>
                <View className={cn('h-5 w-5 rounded-full bg-base', isRecurring ? 'self-end' : 'self-start')} />
              </View>
            </Pressable>

            {isRecurring && (
              <View className="flex-row gap-2">
                {RECURRENCE_OPTIONS.map((option) => {
                  const isSelected = option.value === recurrenceType;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setRecurrenceType(option.value)}
                      className={cn('flex-1 items-center rounded-lg border py-2', isSelected ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base')}
                    >
                      <Text variant="caption" color={isSelected ? 'accent' : 'muted'} className="normal-case tracking-normal">
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

      </View>
    </Modal>
  );
}
