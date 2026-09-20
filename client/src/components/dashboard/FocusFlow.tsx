import { View } from 'react-native';

import type { FocusActivity } from '../../types/dashboard';
import { ProgressBar, Text } from '../ui';
import { CircularProgress } from './CircularProgress';

export interface FocusFlowProps {
  score: number;
  activities: FocusActivity[];
}

/** Circular focus-score ring + a breakdown of today's activities as mini progress bars. */
export function FocusFlow({ score, activities }: FocusFlowProps) {
  return (
    <View className="gap-6 rounded-2xl border border-subtle bg-base p-6">
      <View>
        <Text variant="h3" color="primary">
          Focus Flow
        </Text>
        <Text variant="caption" color="muted" className="mt-0.5 normal-case tracking-normal">
          Today&apos;s breakdown
        </Text>
      </View>

      <View className="flex-col items-center gap-6 sm:flex-row">
        <CircularProgress value={score} size={160} strokeWidth={14}>
          <Text variant="h1" color="primary">
            {Math.round(score)}%
          </Text>
          <Text variant="caption" color="muted" className="normal-case tracking-normal">
            Focus Score
          </Text>
        </CircularProgress>

        <View className="w-full flex-1 gap-4">
          {activities.map((activity) => (
            <View key={activity.id} className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Text variant="body" color="primary" className="font-medium">
                  {activity.label}
                </Text>
                <Text variant="caption" color="muted" className="normal-case tracking-normal">
                  {activity.duration}
                </Text>
              </View>
              <ProgressBar value={activity.percentage} variant={activity.tint} size="sm" />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
