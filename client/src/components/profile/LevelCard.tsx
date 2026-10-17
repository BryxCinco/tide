import { useEffect } from 'react';
import { View } from 'react-native';

import { useLevelStore } from '../../store/levelStore';
import { xpForLevel } from '../../utils/xp';
import { BENTO_INK_TEXT, BentoRing, BentoTile, Text } from '../ui';

/**
 * Level as a dark bento tile: an aurora ring showing progress to the next level with the
 * level number inside it, and the raw XP numbers beside it. Self-fetches on mount;
 * levelStore.applyXpResult keeps it current after that.
 */
export function LevelCard({ className, index = 1 }: { className?: string; index?: number }) {
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
    <BentoTile tone="ink" index={index} className={className}>
      <View className="flex-1 flex-row items-center gap-5">
        <BentoRing value={progress} size={116} strokeWidth={10}>
          <Text variant="label" style={{ color: BENTO_INK_TEXT.muted, letterSpacing: 1.4 }}>
            Level
          </Text>
          <Text variant="display" style={{ color: BENTO_INK_TEXT.primary, fontVariant: ['tabular-nums'], lineHeight: 40 }}>
            {level}
          </Text>
        </BentoRing>
        <View className="flex-1 gap-3" style={{ minWidth: 0 }}>
          <View>
            <Text variant="h2" style={{ color: BENTO_INK_TEXT.primary, fontVariant: ['tabular-nums'] }}>
              {totalXp.toLocaleString()} XP
            </Text>
            <Text variant="body" className="text-[12px]" style={{ color: BENTO_INK_TEXT.muted }}>
              {(ceiling - totalXp).toLocaleString()} XP to level {level + 1}
            </Text>
          </View>
          <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(20,184,166,0.18)' }}>
            <Text variant="body" className="text-[11px] font-semibold" style={{ color: '#5EEAD4' }}>
              {progress}% of the way there
            </Text>
          </View>
        </View>
      </View>
    </BentoTile>
  );
}
