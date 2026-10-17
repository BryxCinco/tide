import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Stop } from 'react-native-svg';

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
  const strokeWidth = Math.max(8, Math.round(size * 0.036));
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

  // Opacity-only breathing halo while running — no scale changes, and no per-second "tick"
  // bump on the digits, so the ring reads as calm and steady rather than twitchy.
  const glowStyle = useAnimatedStyle(() => ({
    opacity: status === 'running' ? 0.08 + pulse.value * 0.12 : 0,
  }));

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
            <Stop offset="0%" stopColor="#14B8A6" />
            <Stop offset="55%" stopColor="#06B6D4" />
            <Stop offset="100%" stopColor="#6366F1" />
          </LinearGradient>
          <LinearGradient id="circularTimerGradientCountdown" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colors.brand.deepPurple} />
            <Stop offset="100%" stopColor={colors.brand.oceanBlue} />
          </LinearGradient>
        </Defs>

        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={themeColors.background.hover} strokeWidth={strokeWidth} fill="none" />
        {/* Fine minute-tick dial just inside the track — 60 marks, every 5th one longer. */}
        {Array.from({ length: 60 }, (_, i) => {
          const angle = (i / 60) * Math.PI * 2;
          const outer = radius - strokeWidth;
          const inner = outer - (i % 5 === 0 ? 8 : 4);
          const c = size / 2;
          return (
            <Line
              key={i}
              x1={c + Math.sin(angle) * inner}
              y1={c - Math.cos(angle) * inner}
              x2={c + Math.sin(angle) * outer}
              y2={c - Math.cos(angle) * outer}
              stroke={themeColors.text.disabled}
              strokeOpacity={i % 5 === 0 ? 0.55 : 0.25}
              strokeWidth={i % 5 === 0 ? 1.5 : 1}
              strokeLinecap="round"
            />
          );
        })}

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
        <Text variant="display" color="primary" style={{ fontVariant: ['tabular-nums'], fontSize: Math.round(size * 0.16), lineHeight: Math.round(size * 0.2) }}>
          {formatClock(displaySeconds ?? seconds)}
        </Text>
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
