import { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import type { ProductivityScoreBreakdown } from '../../types/insights';
import { BentoRing, Text } from '../ui';
import { useChartTheme } from './chartTheme';

export interface ProductivityScoreProps {
  score: ProductivityScoreBreakdown;
}

const WEIGHTS = { focusTime: 0.4, consistency: 0.3, taskCompletion: 0.2, quests: 0.1 } as const;

function verdict(score: number): string {
  if (score >= 85) return 'Outstanding';
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'Steady';
  if (score >= 30) return 'Warming up';
  return 'Just getting started';
}

/**
 * The score as an aurora gauge with a one-word verdict, then the four components that feed
 * it as labelled meters (each meter's track is a lighter step of its own fill): focusTime*0.4
 * + consistency*0.3 + taskCompletion*0.2 + questCompletion*0.1, all for the selected period
 * (server-computed, see insightsService.js). Hover (web) or tap reveals the points.
 */
export function ProductivityScore({ score }: ProductivityScoreProps) {
  const theme = useChartTheme();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const questsCompletedPercent = score.questCompletion ?? 0;

  const focusPoints = score.focusTime * WEIGHTS.focusTime;
  const consistencyPoints = score.consistency * WEIGHTS.consistency;
  const taskPoints = score.taskCompletion * WEIGHTS.taskCompletion;
  const questPoints = questsCompletedPercent * WEIGHTS.quests;
  const overall = Math.min(100, Math.round(focusPoints + consistencyPoints + taskPoints + questPoints));

  const meters = [
    { label: 'Focus time', value: score.focusTime, points: focusPoints, weight: '40%', color: '#14B8A6' },
    { label: 'Consistency', value: score.consistency, points: consistencyPoints, weight: '30%', color: '#6366F1' },
    { label: 'Task completion', value: score.taskCompletion, points: taskPoints, weight: '20%', color: '#0EA5E9' },
    { label: 'Quests', value: questsCompletedPercent, points: questPoints, weight: '10%', color: '#8B5CF6' },
  ];

  return (
    <Pressable
      onPress={() => setShowBreakdown((v) => !v)}
      onHoverIn={() => setShowBreakdown(true)}
      onHoverOut={() => setShowBreakdown(false)}
      className="flex-1 gap-5"
    >
      <View className="flex-row items-center gap-5">
        <BentoRing value={overall} size={128} strokeWidth={12} trackColor={theme.track}>
          <Text variant="display" color="primary" style={{ lineHeight: 40 }}>
            {overall}
          </Text>
          <Text variant="body" color="muted" className="text-[11px]">
            of 100
          </Text>
        </BentoRing>
        <View className="flex-1 gap-1" style={{ minWidth: 0 }}>
          <Text variant="h3" color="primary">
            {verdict(overall)}
          </Text>
          <Text variant="body" color="muted" className="text-[12px] leading-[17px]">
            Weighted from focus time, consistency, tasks and quests.
          </Text>
          {questPoints >= 0.5 && (
            <View className="mt-1 self-start rounded-full bg-tide-teal/10 px-2 py-0.5">
              <Text variant="body" className="text-[11px] font-semibold text-tide-teal">
                +{Math.round(questPoints)} from quests
              </Text>
            </View>
          )}
        </View>
      </View>

      <View className="gap-3.5">
        {meters.map((meter) => (
          <View key={meter.label} className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text variant="body" color="secondary" className="text-[13px] font-medium">
                {meter.label}
              </Text>
              <Text variant="body" color="primary" className="text-[12px] font-semibold" style={{ fontVariant: ['tabular-nums'] }}>
                {showBreakdown ? `+${meter.points.toFixed(1)} pts · ${meter.weight}` : `${Math.round(meter.value)}%`}
              </Text>
            </View>
            <View className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: `${meter.color}26` }}>
              <View style={{ width: `${Math.max(0, Math.min(100, meter.value))}%`, height: '100%', borderRadius: 999, backgroundColor: meter.color }} />
            </View>
          </View>
        ))}
      </View>
    </Pressable>
  );
}
