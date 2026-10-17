import Animated, { FadeInDown } from 'react-native-reanimated';
import { View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useLevelStore } from '../../store/levelStore';
import { useStreakStore } from '../../store/streakStore';
import { hexToRgba } from '../../utils/color';
import { Icon, Text, type IconName } from '../ui';

const HEX_WIDTH = 92;
const HEX_HEIGHT = HEX_WIDTH * (Math.sqrt(3) / 2);

/** Flat-top hexagon vertex points, inscribed in a `HEX_WIDTH` x `HEX_HEIGHT` box — six
 * points at 60° increments starting from the rightmost vertex, which is what gives a
 * flat (not pointy) top/bottom edge. */
const HEX_POINTS = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * (60 * i);
  const r = HEX_WIDTH / 2;
  const x = r + r * Math.cos(angle);
  const y = HEX_HEIGHT / 2 + r * Math.sin(angle);
  return `${x},${y}`;
}).join(' ');

interface HexTileProps {
  icon: IconName;
  value: string | number;
  label: string;
  tint: string;
  disabledColor: string;
  /** Staggers each tile's entrance so the row fills in left-to-right rather than all six
   * popping in at once — a small "human touch" over a single flat fade. */
  index: number;
  /** Greyed out (still visible, not hidden) for a streak that's currently broken — "0"
   * alone doesn't read as clearly as a dimmed, inactive-looking tile does. */
  inactive?: boolean;
}

function HexTile({ icon, value, label, tint, disabledColor, index, inactive }: HexTileProps) {
  const activeTint = inactive ? disabledColor : tint;

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(380).springify().damping(14)}>
      <View style={{ width: HEX_WIDTH, height: HEX_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={HEX_WIDTH} height={HEX_HEIGHT} style={{ position: 'absolute' }}>
          <Polygon
            points={HEX_POINTS}
            fill={hexToRgba(activeTint, inactive ? 0.06 : 0.12)}
            stroke={activeTint}
            strokeWidth={1.5}
          />
        </Svg>
        <View className="items-center" style={{ gap: 1 }}>
          <Icon name={icon} size={16} color={activeTint} />
          <Text variant="h3" color={inactive ? undefined : 'primary'} style={inactive ? { color: disabledColor } : undefined}>
            {value}
          </Text>
          <Text variant="caption" color="muted" className="normal-case tracking-normal" style={{ fontSize: 9.5 }} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Gamification stats (streaks, level) as a row of hexagon tiles — brings this data onto
 * the Insights screen for the first time (it previously only lived on the Dashboard's
 * QuestCard/StreakWidget). A plain row of independently-shaped tiles rather than a true
 * interlocking honeycomb (which needs precise negative-margin offsets that are brittle
 * across the app's range of responsive widths) — still a distinctly non-rectangular stat
 * display without that fragility.
 */
export function HexagonStats() {
  const themeColors = useThemeColors();
  const streak = useStreakStore((s) => s.streak);
  const level = useLevelStore((s) => s.level);

  const taskStreak = streak?.taskCurrentStreak ?? 0;
  const questStreak = streak?.currentStreak ?? 0;
  const longestStreak = Math.max(streak?.taskLongestStreak ?? 0, streak?.longestStreak ?? 0);

  return (
    <View className="flex-row flex-wrap items-start justify-around gap-3 py-2">
      <HexTile
        index={0}
        icon="Flame"
        value={taskStreak}
        label="Task Streak"
        tint={themeColors.brand.tideTeal}
        disabledColor={themeColors.text.disabled}
        inactive={taskStreak === 0}
      />
      <HexTile
        index={1}
        icon="Sparkles"
        value={questStreak}
        label="Quest Streak"
        tint={themeColors.brand.deepPurple}
        disabledColor={themeColors.text.disabled}
        inactive={questStreak === 0}
      />
      <HexTile
        index={2}
        icon="Trophy"
        value={longestStreak}
        label="Best Streak"
        tint={themeColors.status.warning}
        disabledColor={themeColors.text.disabled}
      />
      <HexTile
        index={3}
        icon="Award"
        value={level}
        label="Level"
        tint={themeColors.brand.oceanBlue}
        disabledColor={themeColors.text.disabled}
      />
    </View>
  );
}
