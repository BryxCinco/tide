import { View } from 'react-native';

import { mockInsightsData } from '../../../mocks/mockInsights';
import { formatDuration } from '../../../utils/formatTime';
import { Card, Text } from '../../ui';
import { CircularProgress } from '../CircularProgress';

/** 20h/week is this widget's illustrative default goal (there's no user-configurable
 * weekly-goal setting yet — a natural Phase 10 addition once there's a backend to persist
 * it against). Matches the spec's own "12h / 20h this week" example. */
const WEEKLY_GOAL_SECONDS = 20 * 3600;

/** Reuses mockInsightsData.weeklyTime — the same 7-day dataset the Insights screen's own
 * charts already draw from — rather than a second, disconnected "weekly total" number. */
export function WeeklyProgressWidget() {
  const trackedSeconds = mockInsightsData.weeklyTime.reduce((sum, day) => sum + day.seconds, 0);
  const percent = Math.min(100, Math.round((trackedSeconds / WEEKLY_GOAL_SECONDS) * 100));

  return (
    <Card variant="default" padding="md" className="rounded-[24px] min-h-[150px] items-center justify-center gap-2">
      <CircularProgress value={percent} size={72} strokeWidth={7}>
        <Text variant="body" color="primary" className="font-bold">
          {percent}%
        </Text>
      </CircularProgress>
      <View className="items-center">
        <Text variant="caption" color="primary" className="font-medium normal-case tracking-normal">
          {formatDuration(trackedSeconds)} / {formatDuration(WEEKLY_GOAL_SECONDS)}
        </Text>
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          this week
        </Text>
      </View>
    </Card>
  );
}
