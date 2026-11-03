import { View } from 'react-native';

import type { FocusActivity } from '../../types/dashboard';
import { ocean } from '../../utils/theme';
import { BentoHeader, BentoTile, ProgressBar, Text } from '../ui';
import { CircularProgress } from './CircularProgress';

export interface FocusFlowProps {
  score: number;
  activities: FocusActivity[];
}

/** Compact focus-score ring beside a breakdown of today's activities as mini progress bars. */
export function FocusFlow({ score, activities }: FocusFlowProps) {
  return (
    <BentoTile tone="glass" dense>
      <View className="gap-3">
        <BentoHeader dense title="Focus flow" icon="Activity" color={ocean.aqua} />

        <View className="flex-row items-center gap-4">
          <CircularProgress value={score} size={84} strokeWidth={8}>
            <Text variant="h3" color="primary" className="text-[18px] leading-[22px]" style={{ fontVariant: ['tabular-nums'] }}>
              {Math.round(score)}%
            </Text>
            <Text variant="label" color="muted" className="text-[9px] tracking-[0.6px]">
              Focus
            </Text>
          </CircularProgress>

          <View className="min-w-0 flex-1 gap-2.5">
            {activities.length === 0 ? (
              <Text variant="body" color="muted" className="text-[12.5px]">
                Your share of the day spent in focus. Track a session to see where it goes.
              </Text>
            ) : (
              activities.map((activity) => (
                <View key={activity.id} className="gap-1">
                  <View className="flex-row items-center justify-between">
                    <Text variant="body" color="primary" className="flex-1 text-[12.5px] font-medium" numberOfLines={1}>
                      {activity.label}
                    </Text>
                    <Text variant="body" color="muted" className="text-[11.5px]" style={{ fontVariant: ['tabular-nums'] }}>
                      {activity.duration}
                    </Text>
                  </View>
                  <ProgressBar value={activity.percentage} variant={activity.tint} size="sm" />
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </BentoTile>
  );
}
