import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { Activity } from '../../types/activity';
import { formatDuration } from '../../utils/formatTime';
import { Text } from '../ui';

interface BreakdownRowProps {
  activity: Activity;
  seconds: number;
  /** Relative to the largest activity today, not to a fixed day length. */
  percentage: number;
}

function BreakdownRow({ activity, seconds, percentage }: BreakdownRowProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(percentage, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [percentage, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text variant="body" color="primary" className="font-medium">
          {activity.name}
        </Text>
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          {formatDuration(seconds)}
        </Text>
      </View>
      <View className="h-2 w-full overflow-hidden rounded-full bg-hover">
        <Animated.View
          style={[{ height: '100%', overflow: 'hidden', borderRadius: 9999, backgroundColor: activity.color }, fillStyle]}
        />
      </View>
    </View>
  );
}

export interface ActivityBreakdownProps {
  activities: Activity[];
  totals: Record<string, number>;
}

/** Today's tracked time per activity, sorted descending, as mini progress bars. */
export function ActivityBreakdown({ activities, totals }: ActivityBreakdownProps) {
  const rows = activities
    .map((activity) => ({ activity, seconds: totals[activity.id] ?? 0 }))
    .filter((row) => row.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);

  const maxSeconds = rows.length > 0 ? rows[0].seconds : 1;

  return (
    <View className="gap-4 rounded-[24px] border border-subtle bg-surface p-5">
      <Text variant="h3" color="primary">
        Activity Breakdown
      </Text>

      {rows.length === 0 ? (
        <Text variant="body" color="muted">
          No activity tracked yet today.
        </Text>
      ) : (
        <View className="gap-4">
          {rows.map(({ activity, seconds }) => (
            <BreakdownRow
              key={activity.id}
              activity={activity}
              seconds={seconds}
              percentage={(seconds / maxSeconds) * 100}
            />
          ))}
        </View>
      )}
    </View>
  );
}
