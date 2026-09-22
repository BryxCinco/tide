import { View } from 'react-native';

import { CircularProgress } from '../dashboard/CircularProgress';
import type { ProductivityScoreBreakdown } from '../../types/insights';
import { ProgressBar, Text } from '../ui';

export interface ProductivityScoreProps {
  score: ProductivityScoreBreakdown;
}

/**
 * Hero-card layout — ring centered on top, breakdown bars stacked below, always
 * vertical (no side-by-side variant). This sits in BentoCard's 'hero' slot (2 columns x
 * 2 rows on desktop, roughly square), where a vertical stack reads better than the
 * wide side-by-side layout the standalone version used before the bento redesign.
 * Still built on the same CircularProgress/ProgressBar primitives, just bigger.
 */
export function ProductivityScore({ score }: ProductivityScoreProps) {
  return (
    <View className="flex-1 items-center justify-center gap-8">
      <CircularProgress value={score.overall} size={176} strokeWidth={14}>
        <Text variant="display" color="primary">
          {Math.round(score.overall)}
        </Text>
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          out of 100
        </Text>
      </CircularProgress>

      <View className="w-full gap-4">
        <ScoreRow label="Consistency" value={score.consistency} variant="teal" />
        <ScoreRow label="Focus Time" value={score.focusTime} variant="blue" />
        <ScoreRow label="Task Completion" value={score.taskCompletion} variant="purple" />
      </View>
    </View>
  );
}

function ScoreRow({ label, value, variant }: { label: string; value: number; variant: 'teal' | 'blue' | 'purple' }) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text variant="body" color="secondary">
          {label}
        </Text>
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          {Math.round(value)}%
        </Text>
      </View>
      <ProgressBar value={value} variant={variant} size="sm" />
    </View>
  );
}
