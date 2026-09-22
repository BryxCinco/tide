import { View } from 'react-native';

import { useQuestStore } from '../../../store/questStore';
import { Card, Icon, Text } from '../../ui';

const MOTIVATION_BY_STREAK = (streak: number): string => {
  if (streak === 0) return 'Complete a quest today to start your streak.';
  if (streak < 3) return 'Great start — keep it going!';
  if (streak < 7) return "You're on a roll!";
  if (streak < 30) return 'Impressive consistency!';
  return "Legendary streak — don't stop now!";
};

/** Restates DailyQuestCard's streak counter (questStore.ts) as its own glanceable tile —
 * same source of truth, so the two numbers can never disagree. */
export function StreakWidget() {
  const streak = useQuestStore((s) => s.streak);

  return (
    <Card variant="default" padding="md" className="min-h-[150px] items-center justify-center gap-1">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-orange-500/10">
        <Icon name="Flame" size={22} color="#F97316" />
      </View>
      <Text variant="h1" color="primary" className="mt-1 font-bold" style={{ fontSize: 28 }}>
        {streak}
      </Text>
      <Text variant="caption" color="muted" className="normal-case tracking-normal">
        day{streak === 1 ? '' : 's'} streak
      </Text>
      <Text variant="caption" color="muted" className="mt-1 text-center normal-case tracking-normal">
        {MOTIVATION_BY_STREAK(streak)}
      </Text>
    </Card>
  );
}
