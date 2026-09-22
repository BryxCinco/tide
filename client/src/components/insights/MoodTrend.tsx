import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { MOOD_ICON_MAP } from '../journal/MoodIcon';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { Mood } from '../../types/journal';
import type { MoodTrendPoint } from '../../types/insights';
import { EmptyState, Icon, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';

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
const Y_AXIS_WIDTH = 52;
const X_AXIS_HEIGHT = 18;

// Score 5 down to 1 — top to bottom, matching the chart's own y-axis direction.
const MOOD_LABELS_TOP_DOWN: Mood[] = ['great', 'good', 'okay', 'bad', 'terrible'];

/** Same UTC-based "YYYY-MM-DD" convention mockInsights.ts's own `isoDate()` uses to build
 * `MoodTrendPoint.date` — comparing against toDateKey's LOCAL-date convention instead would
 * risk an off-by-one mismatch right at the day boundary. */
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Smooth curve through a set of points via quadratic Beziers anchored at each segment's
 * midpoint — visually reads as a proper spline at this data density (7-30 points) without
 * pulling in a curve-fitting library. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/** Smooth-through-points curve + a semi-transparent fill under the curve, y-axis mood-name
 * labels, x-axis date labels, a highlighted "today" point, and a tap/hover tooltip per
 * point — see the file-level component doc below for the rest. */
export function MoodTrend({ data, height = 90, showCurrentMood = true }: MoodTrendProps) {
  const themeColors = useThemeColors();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [data, progress]);

  const handleLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const hasAnyData = data.some((p) => p.score != null);

  const padding = 8;
  const plotLeft = Y_AXIS_WIDTH;
  const plotWidth = Math.max(width - plotLeft - padding, 1);
  const plotHeight = height - padding * 2;

  const xFor = (index: number) => plotLeft + (index / Math.max(data.length - 1, 1)) * plotWidth;
  const yFor = (score: number) => padding + (1 - (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * plotHeight;

  // Group consecutive non-null points into segments so a missing day gaps the line.
  const segments: { x: number; y: number; index: number }[][] = [];
  let current: { x: number; y: number; index: number }[] = [];
  data.forEach((point, index) => {
    if (point.score == null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: xFor(index), y: yFor(point.score), index });
  });
  if (current.length) segments.push(current);

  const baselineY = padding + plotHeight;

  // 4000 comfortably exceeds any real path length at this component's typical widths —
  // used purely as a draw-in reveal distance, not a measurement of the actual path.
  const DASH_LENGTH = 4000;
  const animatedDashProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - progress.value) * DASH_LENGTH,
  }));
  const animatedFillProps = useAnimatedProps(() => ({ opacity: progress.value }));

  const latestMoodPoint = [...data].reverse().find((p) => p.mood != null);
  const currentMood = latestMoodPoint?.mood ? MOOD_ICON_MAP[latestMoodPoint.mood] : null;

  const activePoint = activeIndex != null ? data[activeIndex] : null;
  // X-axis gets crowded past ~10 points (month view) — thin it out to every 5th label.
  const xLabelStep = data.length > 10 ? 5 : 1;

  if (!hasAnyData) {
    return <EmptyState icon="Smile" title="No mood data yet" description="Start journaling to see your mood trend here." />;
  }

  return (
    <View className="gap-2">
      <View className="h-5 flex-row items-center gap-1.5">
        {activePoint?.mood ? (
          <>
            <Icon name={MOOD_ICON_MAP[activePoint.mood].icon} size={16} color={MOOD_ICON_MAP[activePoint.mood].color} />
            <Text variant="body" color="primary" className="font-medium">
              {MOOD_ICON_MAP[activePoint.mood].label}
            </Text>
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              · {activePoint.label}
            </Text>
          </>
        ) : showCurrentMood && currentMood ? (
          <>
            <Icon name={currentMood.icon} size={16} color={currentMood.color} />
            <Text variant="body" color="primary" className="font-medium">
              {currentMood.label}
            </Text>
          </>
        ) : (
          showCurrentMood && (
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              No recent entries
            </Text>
          )
        )}
      </View>

      <View onLayout={handleLayout} style={{ height }}>
        {width > 0 && (
          <>
            <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
              <Defs>
                <LinearGradient id="moodTrendFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={themeColors.brand.tideTeal} stopOpacity={0.35} />
                  <Stop offset="100%" stopColor={themeColors.brand.tideTeal} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {segments.map((segment, i) => {
                if (segment.length < 2) return null;
                const areaPath =
                  `${smoothPath(segment)} L ${segment[segment.length - 1].x} ${baselineY} L ${segment[0].x} ${baselineY} Z`;
                return <AnimatedPath key={`fill-${i}`} d={areaPath} fill="url(#moodTrendFill)" animatedProps={animatedFillProps} />;
              })}

              {segments.map((segment, i) => (
                <AnimatedPath
                  key={`line-${i}`}
                  d={smoothPath(segment)}
                  stroke={themeColors.brand.tideTeal}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  strokeDasharray={DASH_LENGTH}
                  animatedProps={animatedDashProps}
                />
              ))}

              {data.map((point, index) => {
                if (point.score == null) return null;
                const isToday = point.date === todayKey();
                return (
                  <Circle
                    key={point.date}
                    cx={xFor(index)}
                    cy={yFor(point.score)}
                    r={isToday ? 5 : activeIndex === index ? 4.5 : 3}
                    fill={isToday ? themeColors.brand.tideTeal : themeColors.background.base}
                    stroke={themeColors.brand.tideTeal}
                    strokeWidth={isToday ? 0 : 2}
                  />
                );
              })}
            </Svg>

            {/* Invisible per-point hit targets — hover (web) or tap (touch) surfaces the
                tooltip line above the chart via activeIndex, same pattern Heatmap.tsx uses. */}
            {data.map((point, index) => {
              if (point.score == null) return null;
              const hitSize = 22;
              return (
                <Pressable
                  key={`hit-${point.date}`}
                  onHoverIn={() => setActiveIndex(index)}
                  onHoverOut={() => setActiveIndex(null)}
                  onPress={() => setActiveIndex((current) => (current === index ? null : index))}
                  style={{
                    position: 'absolute',
                    left: xFor(index) - hitSize / 2,
                    top: yFor(point.score) - hitSize / 2,
                    width: hitSize,
                    height: hitSize,
                  }}
                />
              );
            })}

            {/* Y-axis mood-name labels, right-aligned into the reserved left gutter. */}
            <View style={{ position: 'absolute', left: 0, top: 0, width: Y_AXIS_WIDTH - 8, height }}>
              {MOOD_LABELS_TOP_DOWN.map((mood, i) => (
                <Text
                  key={mood}
                  variant="caption"
                  color="muted"
                  className="absolute right-0 normal-case tracking-normal"
                  style={{ fontSize: 10, top: yFor(5 - i) - 6 }}
                  numberOfLines={1}
                >
                  {MOOD_ICON_MAP[mood].label}
                </Text>
              ))}
            </View>
          </>
        )}
      </View>

      {/* X-axis date labels below the plot. */}
      {width > 0 && (
        <View style={{ height: X_AXIS_HEIGHT, marginLeft: Y_AXIS_WIDTH }}>
          {data.map((point, index) => {
            if (index % xLabelStep !== 0) return null;
            return (
              <Text
                key={point.date}
                variant="caption"
                color="muted"
                className="absolute normal-case tracking-normal"
                style={{ fontSize: 10, left: xFor(index) - Y_AXIS_WIDTH - 12, width: 24, textAlign: 'center' }}
                numberOfLines={1}
              >
                {point.label}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}
