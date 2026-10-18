import { View } from 'react-native';

import { useDayStreak } from '../../../store/streakStore';
import { Card, Icon, Text } from '../../ui';

const MOTIVATION_BY_STREAK = (streak: number): string => {
  if (streak === 0) return 'Finish a task or quest today to start your streak.';
  if (streak < 3) return 'Great start — keep it going!';
  if (streak < 7) return "You're on a roll!";
  if (streak < 30) return 'Impressive consistency!';
  return "Legendary streak — don't stop now!";
};

/** The day streak — +1 for each day in a row with a task or quest completed. */
export function StreakWidget() {
  const streak = useDayStreak();

  return (
    <Card variant="default" padding="md" className="rounded-[24px] min-h-[150px] items-center justify-center gap-1">
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
