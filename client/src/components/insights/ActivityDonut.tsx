import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import type { ActivityBreakdownSlice } from '../../types/insights';
import { formatDuration } from '../../utils/formatTime';
import { Text } from '../ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ActivityDonutProps {
  slices: ActivityBreakdownSlice[];
  size?: number;
}

/** Donut built from stacked SVG circle strokes (strokeDasharray/offset per slice) — the
 * same technique as CircularProgress.tsx, extended to multiple colored segments instead
 * of one gradient. See TimeChart.tsx for why this is plain react-native-svg rather than
 * victory-native. */
export function ActivityDonut({ slices, size = 140 }: ActivityDonutProps) {
  const strokeWidth = Math.max(14, Math.round(size / 8));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(
    slices.reduce((sum, s) => sum + s.seconds, 0),
    1,
  );

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  let cumulative = 0;

  return (
    <View className="flex-col items-center gap-6 md:flex-row md:items-center">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="transparent"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {slices.map((slice) => {
            const sliceLength = (slice.seconds / total) * circumference;
            const dashOffset = -cumulative;
            cumulative += sliceLength;

            return (
              <DonutSlice
                key={slice.id}
                cx={size / 2}
                cy={size / 2}
                radius={radius}
                strokeWidth={strokeWidth}
                color={slice.color}
                sliceLength={sliceLength}
                circumference={circumference}
                dashOffset={dashOffset}
                progress={progress}
              />
            );
          })}
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text variant="h2" color="primary">
            {formatDuration(total)}
          </Text>
          <Text variant="caption" color="muted" className="normal-case tracking-normal">
            Total tracked
          </Text>
        </View>
      </View>

      <View className="w-full gap-2 md:w-auto md:flex-1">
        {slices.map((slice) => (
          <View key={slice.id} className="flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
              <Text variant="body" color="secondary">
                {slice.label}
              </Text>
            </View>
            <Text variant="caption" color="muted" className="normal-case tracking-normal">
              {formatDuration(slice.seconds)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface DonutSliceProps {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
  color: string;
  sliceLength: number;
  circumference: number;
  dashOffset: number;
  progress: SharedValue<number>;
}

/** One arc segment — its own component (not inlined in the parent's .map) because
 * useAnimatedProps is a hook and can't be called from inside a callback passed to .map. */
function DonutSlice({ cx, cy, radius, strokeWidth, color, sliceLength, circumference, dashOffset, progress }: DonutSliceProps) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: `${sliceLength * progress.value} ${circumference}`,
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={radius}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeDashoffset={dashOffset}
      animatedProps={animatedProps}
      strokeLinecap="butt"
      transform={`rotate(-90 ${cx} ${cy})`}
    />
  );
}
