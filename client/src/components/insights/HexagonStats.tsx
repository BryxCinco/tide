import { useMemo } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Line, Polygon } from 'react-native-svg';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useLevelStore } from '../../store/levelStore';
import { useStreakStore } from '../../store/streakStore';
import { hexToRgba } from '../../utils/color';
import { progressToNextLevel } from '../../utils/xp';
import { Text } from '../ui';

export interface HexagonStatsProps {
  /** 0-100, from the selected range's Productivity Score card — that card fetches
   * separately and can still be loading when this one mounts, so this axis just plots at 0
   * until the value arrives rather than needing its own loading state. */
  productivityScore?: number | null;
}

const RADIUS = 84;
const RING_COUNT = 3;
const LABEL_GAP = 26;
const LABEL_WIDTH = 60;
const MARGIN = LABEL_WIDTH / 2 + 6;
const BOX = (RADIUS + LABEL_GAP) * 2;
const WRAPPER_SIZE = BOX + MARGIN * 2;
const CENTER = BOX / 2;

/** Six axis angles, pointy-top (first axis straight up), 60° apart — the familiar
 * FIFA-card-style stat-wheel layout. */
const AXIS_ANGLES = Array.from({ length: 6 }, (_, i) => (-90 + i * 60) * (Math.PI / 180));

function pointAt(radius: number, axisIndex: number) {
  const angle = AXIS_ANGLES[axisIndex];
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

function polygonPoints(radiusPerAxis: number[]) {
  return radiusPerAxis.map((r, i) => { const p = pointAt(r, i); return `${p.x},${p.y}`; }).join(' ');
}

interface Axis {
  tag: string;
  display: string;
  /** 0-1, already clamped — how far out this axis's point sits on its spoke. */
  norm: number;
}

/**
 * A hexagon radar/spider chart — six stats plotted as one filled polygon against a
 * concentric hexagon grid, same shape language as a FIFA player card. (An earlier version
 * of this component drew six separate hexagon-shaped badges instead, which isn't what a
 * "hexagon graph" means and read as visually broken — this replaces that entirely.)
 */
export function HexagonStats({ productivityScore }: HexagonStatsProps) {
  const themeColors = useThemeColors();
  const streak = useStreakStore((s) => s.streak);
  const level = useLevelStore((s) => s.level);
  const totalXp = useLevelStore((s) => s.totalXp);

  const taskStreak = streak?.taskCurrentStreak ?? 0;
  const questStreak = streak?.currentStreak ?? 0;
  const bestStreak = Math.max(streak?.taskLongestStreak ?? 0, streak?.longestStreak ?? 0);
  const xpProgress = progressToNextLevel(totalXp);
  const score = Math.round(productivityScore ?? 0);

  // Each axis caps at a value that's already "great" for that stat (14-day streak, level
  // 20, ...) rather than some theoretical max, so the polygon actually uses the chart's
  // full radius for a solid run instead of forever reading as a tiny sliver.
  const axes: Axis[] = useMemo(
    () => [
      { tag: 'Task', display: `${taskStreak}d`, norm: Math.min(taskStreak / 14, 1) },
      { tag: 'Quest', display: `${questStreak}d`, norm: Math.min(questStreak / 14, 1) },
      { tag: 'Best', display: `${bestStreak}d`, norm: Math.min(bestStreak / 30, 1) },
      { tag: 'Level', display: `${level}`, norm: Math.min(level / 20, 1) },
      { tag: 'XP', display: `${xpProgress}%`, norm: xpProgress / 100 },
      { tag: 'Score', display: `${score}`, norm: score / 100 },
    ],
    [taskStreak, questStreak, bestStreak, level, xpProgress, score]
  );

  const dataPoints = useMemo(
    () => polygonPoints(axes.map((a) => (a.norm > 0 ? Math.max(RADIUS * a.norm, 3) : 0))),
    [axes]
  );
  const gridRings = useMemo(
    () => Array.from({ length: RING_COUNT }, (_, ring) => polygonPoints(new Array(6).fill((RADIUS * (ring + 1)) / RING_COUNT))),
    []
  );

  return (
    <Animated.View entering={FadeIn.duration(420)} style={{ alignItems: 'center' }}>
      <View style={{ width: WRAPPER_SIZE, height: WRAPPER_SIZE }}>
        <Svg width={BOX} height={BOX} style={{ position: 'absolute', left: MARGIN, top: MARGIN }}>
          {gridRings.map((pts, i) => (
            <Polygon key={i} points={pts} fill="none" stroke={themeColors.border.subtle} strokeWidth={1} />
          ))}
          {AXIS_ANGLES.map((_, i) => {
            const outer = pointAt(RADIUS, i);
            return (
              <Line key={i} x1={CENTER} y1={CENTER} x2={outer.x} y2={outer.y} stroke={themeColors.border.subtle} strokeWidth={1} />
            );
          })}
          <Polygon
            points={dataPoints}
            fill={hexToRgba(themeColors.brand.tideTeal, 0.28)}
            stroke={themeColors.brand.tideTeal}
            strokeWidth={2}
          />
        </Svg>

        {axes.map((axis, i) => {
          const p = pointAt(RADIUS + LABEL_GAP, i);
          return (
            <View
              key={axis.tag}
              style={{
                position: 'absolute',
                left: MARGIN + p.x - LABEL_WIDTH / 2,
                top: MARGIN + p.y - 14,
                width: LABEL_WIDTH,
                alignItems: 'center',
              }}
            >
              <Text variant="caption" color="muted" numberOfLines={1}>
                {axis.tag}
              </Text>
              <Text variant="h3" color="primary" numberOfLines={1}>
                {axis.display}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}
