import { useEffect } from 'react';
import { View } from 'react-native';

import { useLevelStore } from '../../store/levelStore';
import { colors } from '../../utils/theme';
import { xpForLevel } from '../../utils/xp';
import { Icon, ProgressBar, Text } from '../ui';

/**
 * Profile's "top" level section — a big LV badge, an XP progress bar toward the next level,
 * and the raw numbers behind it. Self-fetches on mount (same pattern as this file's sibling
 * StatsRow.tsx); mutation responses elsewhere (levelStore.applyXpResult) keep it current
 * without another fetch in between, so this only needs to run once per screen visit.
 */
export function LevelCard() {
  const level = useLevelStore((s) => s.level);
  const totalXp = useLevelStore((s) => s.totalXp);
  const fetchLevel = useLevelStore((s) => s.fetchLevel);

  useEffect(() => {
    fetchLevel();
  }, [fetchLevel]);

  const floor = xpForLevel(level);
  const ceiling = xpForLevel(level + 1);
  const progress = ceiling === floor ? 100 : Math.round(((totalXp - floor) / (ceiling - floor)) * 100);

  return (
    <View className="flex-row items-center gap-4 rounded-2xl border border-subtle bg-elevated p-5">
      <View className="h-16 w-16 items-center justify-center rounded-full border-2 border-tide-teal/30 bg-tide-teal/10">
        <Text variant="h3" color="accent" className="font-bold">
          LV {level}
        </Text>
      </View>

      <View className="flex-1 gap-2">
        <View className="flex-row items-center justify-between">
          <Text variant="label" color="muted">
            Your Level
          </Text>
          <Icon name="Trophy" size={18} color={colors.brand.tideTeal} />
        </View>
        <ProgressBar value={progress} variant="teal" size="md" />
        <Text variant="caption" color="muted" className="normal-case tracking-normal">
          {totalXp.toLocaleString()} / {ceiling.toLocaleString()} XP to level {level + 1}
        </Text>
      </View>
    </View>
  );
}
