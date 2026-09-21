import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { formatClock } from '../../utils/formatTime';
import { colors } from '../../utils/theme';
import { Text } from '../ui';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type TimerRingStatus = 'idle' | 'running' | 'paused';

export interface CircularTimerProps {
  seconds: number;
  status: TimerRingStatus;
  /** Shown below the clock when running/paused. Ignored (replaced by "Ready to start") when idle. */
  activityLabel?: string;
  /** Diameter in px. Defaults to 280 (the spec's minimum). */
  size?: number;
}

const statusLabels: Record<TimerRingStatus, string> = {
  idle: 'Ready',
  running: 'Running',
  paused: 'Paused',
};

/** The hero: a live circular stopwatch. Not tied to a fixed target duration, so the ring
 * sweeps one full lap every 60s — tangible progress feedback tied to the visible seconds
 * digit, rather than an arbitrary percentage of nothing. */
export function CircularTimer({ seconds, status, activityLabel, size = 280 }: CircularTimerProps) {
  const strokeWidth = Math.max(10, Math.round(size * 0.045));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const lapProgress = ((seconds % 60) / 60) * 100;

  const animatedProgress = useSharedValue(0);
  useEffect(() => {
    animatedProgress.value = withTiming(lapProgress, { duration: 350, easing: Easing.linear });
  }, [lapProgress, animatedProgress]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (circumference * animatedProgress.value) / 100,
  }));

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (status === 'running') {
      pulse.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }), -1, true);
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [status, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: status === 'running' ? 0.2 + pulse.value * 0.3 : 0,
    transform: [{ scale: 1 + pulse.value * 0.03 }],
  }));

  const tickScale = useSharedValue(1);
  useEffect(() => {
    if (status !== 'running') return;
    tickScale.value = withSequence(withTiming(1.03, { duration: 90 }), withTiming(1, { duration: 160 }));
  }, [seconds, status, tickScale]);

  const tickStyle = useAnimatedStyle(() => ({ transform: [{ scale: tickScale.value }] }));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brand.tideTeal },
          glowStyle,
        ]}
      />

      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="circularTimerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.brand.tideTeal} />
            <Stop offset="100%" stopColor={colors.brand.oceanBlue} />
          </LinearGradient>
        </Defs>

        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.background.hover} strokeWidth={strokeWidth} fill="none" />

        {status !== 'idle' && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={status === 'paused' ? colors.status.warning : 'url(#circularTimerGradient)'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            animatedProps={ringProps}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>

      <View className="absolute inset-0 items-center justify-center">
        <Animated.View style={tickStyle}>
          <Text variant="display" color="primary" style={{ fontVariant: ['tabular-nums'] }}>
            {formatClock(seconds)}
          </Text>
        </Animated.View>
        <Text variant="body" color="secondary" className="mt-2 font-medium">
          {status === 'idle' ? 'Ready to start' : activityLabel}
        </Text>
        <Text
          variant="caption"
          color="muted"
          className="mt-1 normal-case tracking-normal"
          style={status === 'paused' ? { color: colors.status.warning } : undefined}
        >
          {statusLabels[status]}
        </Text>
      </View>
    </View>
  );
}
