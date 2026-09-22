import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { MOOD_ICON_MAP } from '../journal/MoodIcon';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { MoodTrendPoint } from '../../types/insights';
import { Icon, Text } from '../ui';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface MoodTrendProps {
  data: MoodTrendPoint[];
  /** Defaults to a compact height for the bento 'sm' card — pass a taller value for a
   * standalone/full-width usage. */
  height?: number;
  /** Shows the most recent recorded mood as an icon + label above the chart — the bento
   * 'sm' card's "current mood label" requirement. */
  showCurrentMood?: boolean;
}

const MIN_SCORE = 1;
const MAX_SCORE = 5;

/**
 * Straight-line-segment chart (not a true spline) — a deliberate simplification given the
 * time budget; it still reads as "smooth" at this data density (7-30 points) because of
 * the rounded stroke join/cap, but it isn't a Catmull-Rom/Bezier curve. A null `score`
 * breaks the line into a new segment rather than interpolating a mood that was never
 * recorded that day.
 */
export function MoodTrend({ data, height = 90, showCurrentMood = true }: MoodTrendProps) {
  const themeColors = useThemeColors();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [data, progress]);

  const handleLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const padding = 8;
  const plotWidth = Math.max(width - padding * 2, 1);
  const plotHeight = height - padding * 2;

  const xFor = (index: number) => padding + (index / Math.max(data.length - 1, 1)) * plotWidth;
  const yFor = (score: number) => padding + (1 - (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * plotHeight;

  // Group consecutive non-null points into segments so a missing day gaps the line.
  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  data.forEach((point, index) => {
    if (point.score == null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: xFor(index), y: yFor(point.score) });
  });
  if (current.length) segments.push(current);

  const pathForSegment = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // 4000 comfortably exceeds any real path length at this component's typical widths —
  // used purely as a draw-in reveal distance, not a measurement of the actual path.
  const DASH_LENGTH = 4000;
  const animatedDashProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - progress.value) * DASH_LENGTH,
  }));

  const latestMoodPoint = [...data].reverse().find((p) => p.mood != null);
  const currentMood = latestMoodPoint?.mood ? MOOD_ICON_MAP[latestMoodPoint.mood] : null;

  return (
    <View className="gap-2">
      {showCurrentMood && (
        <View className="flex-row items-center gap-1.5">
          {currentMood ? (
            <>
              <Icon name={currentMood.icon} size={16} color={currentMood.color} />
              <Text variant="body" color="primary" className="font-medium">
                {currentMood.label}
              </Text>
            </>
          ) : (
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              No recent entries
            </Text>
          )}
        </View>
      )}

      <View onLayout={handleLayout} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {segments.map((segment, i) => (
              <AnimatedPath
                key={i}
                d={pathForSegment(segment)}
                stroke={themeColors.brand.tideTeal}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={DASH_LENGTH}
                animatedProps={animatedDashProps}
              />
            ))}
            {data.map((point, index) =>
              point.score == null ? null : (
                <Circle
                  key={point.date}
                  cx={xFor(index)}
                  cy={yFor(point.score)}
                  r={3}
                  fill={themeColors.background.base}
                  stroke={themeColors.brand.tideTeal}
                  strokeWidth={2}
                />
              ),
            )}
          </Svg>
        )}
      </View>
    </View>
  );
}
