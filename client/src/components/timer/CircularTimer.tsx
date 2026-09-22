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

import { useThemeColors } from '../../hooks/useThemeColors';
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
  /** Countdown mode (Fix 8): purple/blue ring instead of the stopwatch's teal gradient,
   * and the ring fills once toward 100% over `countdownDurationSeconds` instead of
   * sweeping one lap every 60s. `displaySeconds` is what's shown as text — the caller
   * passes the remaining time, not the elapsed `seconds` the ring math still needs. */
  countdownDurationSeconds?: number;
  displaySeconds?: number;
}

const statusLabels: Record<TimerRingStatus, string> = {
  idle: 'Ready',
  running: 'Running',
  paused: 'Paused',
};

/** The hero: a live circular timer. Stopwatch mode isn't tied to a fixed target duration,
 * so the ring sweeps one full lap every 60s — tangible progress feedback tied to the
 * visible seconds digit, rather than an arbitrary percentage of nothing. Countdown mode
 * has a real target, so its ring fills once toward 100% instead (see the prop doc above). */
export function CircularTimer({ seconds, status, activityLabel, size = 280, countdownDurationSeconds, displaySeconds }: CircularTimerProps) {
  const themeColors = useThemeColors();
  const isCountdown = countdownDurationSeconds != null;
  const strokeWidth = Math.max(10, Math.round(size * 0.045));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const lapProgress = isCountdown
    ? Math.min(100, (seconds / Math.max(countdownDurationSeconds, 1)) * 100)
    : ((seconds % 60) / 60) * 100;

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
          <LinearGradient id="circularTimerGradientCountdown" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.brand.deepPurple} />
            <Stop offset="100%" stopColor={colors.brand.oceanBlue} />
          </LinearGradient>
        </Defs>

        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={themeColors.background.hover} strokeWidth={strokeWidth} fill="none" />

        {status !== 'idle' && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={status === 'paused' ? colors.status.warning : isCountdown ? 'url(#circularTimerGradientCountdown)' : 'url(#circularTimerGradient)'}
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
            {formatClock(displaySeconds ?? seconds)}
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
