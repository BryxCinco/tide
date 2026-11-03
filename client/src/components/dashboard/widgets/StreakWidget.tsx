import { View } from 'react-native';

import { useDayStreak } from '../../../store/streakStore';
import { hexToRgba } from '../../../utils/color';
import { ocean } from '../../../utils/theme';
import { BentoTile, Icon, Text } from '../../ui';

const MOTIVATION_BY_STREAK = (streak: number): string => {
  if (streak === 0) return 'Finish a task or quest today to start your streak.';
  if (streak < 3) return 'Great start — keep it going!';
  if (streak < 7) return "You're on a roll!";
  if (streak < 30) return 'Impressive consistency!';
  return "Legendary streak — don't stop now!";
};

export function StreakWidget() {
  const streak = useDayStreak();

  return (
    <BentoTile tone="glass" dense>
      <View className="flex-1 justify-between gap-2">
        <View className="flex-row items-center gap-1.5">
          <View className="h-6 w-6 items-center justify-center rounded-[8px]" style={{ backgroundColor: hexToRgba(ocean.coral, 0.14) }}>
            <Icon name="Flame" size={13} color={ocean.coral} strokeWidth={2.2} />
          </View>
          <Text variant="label" color="muted" className="flex-1 text-[10.5px] tracking-[0.6px]">
            Day streak
          </Text>
        </View>
        <View>
          <View className="flex-row items-baseline gap-1">
            <Text variant="h1" color="primary" className="text-[28px] leading-[32px]" style={{ fontVariant: ['tabular-nums'] }}>
              {streak}
            </Text>
            <Text variant="body" color="muted" className="text-[12px]">
              day{streak === 1 ? '' : 's'}
            </Text>
          </View>
          <Text variant="body" color="muted" className="text-[11.5px] leading-[15px]" numberOfLines={2}>
            {MOTIVATION_BY_STREAK(streak)}
          </Text>
        </View>
      </View>
    </BentoTile>
  );
}
