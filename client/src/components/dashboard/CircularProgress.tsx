import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useThemeColors } from '../../hooks/useThemeColors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface CircularProgressProps {
  /** 0-100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
}

/** Gradient-stroke ring (teal -> ocean blue) that animates from 0 to `value` on mount/change. */
export function CircularProgress({ value, size = 160, strokeWidth = 12, children }: CircularProgressProps) {
  const themeColors = useThemeColors();
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [clamped, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (circumference * progress.value) / 100,
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="circularProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={themeColors.brand.tideTeal} />
            <Stop offset="100%" stopColor={themeColors.brand.oceanBlue} />
          </LinearGradient>
        </Defs>

        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={themeColors.background.hover} strokeWidth={strokeWidth} fill="none" />

        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#circularProgressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {children && <View className="absolute inset-0 items-center justify-center">{children}</View>}
    </View>
  );
}
