import { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useQuestStore } from '../../store/questStore';
import { CircularProgress } from '../dashboard/CircularProgress';
import type { ProductivityScoreBreakdown } from '../../types/insights';
import { ProgressBar, Text } from '../ui';

export interface ProductivityScoreProps {
  score: ProductivityScoreBreakdown;
}

const WEIGHTS = { focusTime: 0.4, consistency: 0.3, taskCompletion: 0.2, quests: 0.1 } as const;

/**
 * Hero-card layout — ring centered on top, breakdown bars stacked below, always
 * vertical (no side-by-side variant). This sits in BentoCard's 'hero' slot (2 columns x
 * 2 rows on desktop, roughly square), where a vertical stack reads better than the
 * wide side-by-side layout the standalone version used before the bento redesign.
 * Still built on the same CircularProgress/ProgressBar primitives, just bigger.
 *
 * `overall` is now COMPUTED here from the weighted formula (focusTime*0.4 +
 * consistency*0.3 + taskCompletion*0.2 + questsCompleted%*0.1) rather than trusting
 * `score.overall` as an independent mock number — this is what actually wires today's
 * quest completion (questStore.ts) into the score, per Fix 3. The spec's own text
 * describes the quest bonus two ways ("up to +15 points" in one bullet, `*0.1` of a 0-100
 * value — max 10 — in the formula two lines later); the formula is the more precise,
 * self-consistent spec (its four weights already sum to exactly 1.0 = a clean 100-point
 * scale), so this follows it and the bonus tops out at +10, not +15.
 */
export function ProductivityScore({ score }: ProductivityScoreProps) {
  const todayQuests = useQuestStore((s) => s.todayQuests);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const questsCompletedPercent =
    todayQuests.length > 0 ? (todayQuests.filter((q) => q.isCompleted).length / todayQuests.length) * 100 : 0;

  const focusPoints = score.focusTime * WEIGHTS.focusTime;
  const consistencyPoints = score.consistency * WEIGHTS.consistency;
  const taskPoints = score.taskCompletion * WEIGHTS.taskCompletion;
  const questPoints = questsCompletedPercent * WEIGHTS.quests;
  const overall = Math.min(100, Math.round(focusPoints + consistencyPoints + taskPoints + questPoints));
  const questBonusRounded = Math.round(questPoints);

  return (
    <Pressable
      onPress={() => setShowBreakdown((v) => !v)}
      onHoverIn={() => setShowBreakdown(true)}
      onHoverOut={() => setShowBreakdown(false)}
      className="flex-1 items-center justify-center gap-6"
    >
      <View className="items-center gap-1">
        <CircularProgress value={overall} size={176} strokeWidth={14}>
          <Text variant="display" color="primary">
            {overall}
          </Text>
          <Text variant="caption" color="muted" className="normal-case tracking-normal">
            out of 100
          </Text>
        </CircularProgress>
        {questBonusRounded > 0 && (
          <Text variant="caption" color="accent" className="normal-case tracking-normal">
            Includes +{questBonusRounded} from daily quests
          </Text>
        )}
      </View>

      {showBreakdown && (
        <View className="w-full gap-1.5 rounded-xl border border-subtle bg-elevated p-3">
          <BreakdownLine label="Focus Time" weight="40%" points={focusPoints} />
          <BreakdownLine label="Consistency" weight="30%" points={consistencyPoints} />
          <BreakdownLine label="Task Completion" weight="20%" points={taskPoints} />
          <BreakdownLine label="Daily Quests" weight="10%" points={questPoints} />
        </View>
      )}

      <View className="w-full gap-4">
        <ScoreRow label="Consistency" value={score.consistency} variant="teal" />
        <ScoreRow label="Focus Time" value={score.focusTime} variant="blue" />
        <ScoreRow label="Task Completion" value={score.taskCompletion} variant="purple" />
      </View>
    </Pressable>
  );
}

function BreakdownLine({ label, weight, points }: { label: string; weight: string; points: number }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="caption" color="secondary" className="normal-case tracking-normal">
        {label} ({weight})
      </Text>
      <Text variant="caption" color="primary" className="font-semibold normal-case tracking-normal">
        +{points.toFixed(1)}
      </Text>
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
