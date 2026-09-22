import { useEffect } from 'react';
import { Text as RNText, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { useQuestStore } from '../../store/questStore';
import type { Quest, QuestCategory } from '../../types/quest';
import { hexToRgba } from '../../utils/color';
import { soundManager } from '../../utils/soundManager';
import { Card, Icon, ProgressBar, Text, type IconName } from '../ui';
import { Pressable } from '../ui/SoundPressable';

const CATEGORY_COLOR: Record<QuestCategory, string> = {
  focus: '#14B8A6',
  journal: '#8B5CF6',
  tasks: '#0EA5E9',
  wellness: '#F97316',
  growth: '#EC4899',
};

function QuestRow({ quest, onToggle }: { quest: Quest; onToggle: () => void }) {
  const checkScale = useSharedValue(1);
  const color = CATEGORY_COLOR[quest.category];

  const handlePress = () => {
    if (!quest.isCompleted) {
      soundManager.play('success');
      checkScale.value = withSequence(withTiming(1.3, { duration: 120 }), withTiming(1, { duration: 150 }));
    }
    onToggle();
  };

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));

  return (
    <Pressable onPress={handlePress} className="flex-row items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-elevated">
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
  );
}

/** Dashboard widget for the day's 1-3 random quests (see questGenerator.ts) — always shown
 * (not a toggleable WidgetGrid entry, unlike the widgets in Fix 8), since the daily streak
 * mechanic is meant to be a constant, hard-to-miss presence rather than something a user
 * could configure away and forget exists. */
export function DailyQuestCard() {
  const todayQuests = useQuestStore((s) => s.todayQuests);
  const streak = useQuestStore((s) => s.streak);
  const ensureToday = useQuestStore((s) => s.ensureToday);
  const toggleQuest = useQuestStore((s) => s.toggleQuest);

  useEffect(() => {
    ensureToday();
  }, [ensureToday]);

  const completedCount = todayQuests.filter((q) => q.isCompleted).length;
  const progress = todayQuests.length > 0 ? (completedCount / todayQuests.length) * 100 : 0;

  if (todayQuests.length === 0) return null;

  return (
    <Card variant="default" padding="lg" className="gap-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Icon name="Sparkles" size={18} color="#14B8A6" />
          <Text variant="h3" color="primary">
            Daily Quests
          </Text>
        </View>
        {streak > 0 && (
          <View className="flex-row items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1">
            <Icon name="Flame" size={14} color="#F97316" />
            <RNText className="text-caption font-bold text-orange-500">
              {streak} day{streak === 1 ? '' : 's'}
            </RNText>
          </View>
        )}
      </View>

      <ProgressBar value={progress} variant="teal" showLabel label={`${completedCount}/${todayQuests.length} completed`} />

      <View className="gap-0.5">
        {todayQuests.map((quest) => (
          <QuestRow key={quest.id} quest={quest} onToggle={() => toggleQuest(quest.id)} />
        ))}
      </View>
    </Card>
  );
}
