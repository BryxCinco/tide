import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { cn } from '../../utils/cn';
import { gradients } from '../../utils/gradients';
import { Text } from './Text';

export type ProgressBarVariant = 'teal' | 'blue' | 'purple' | 'gradient';
export type ProgressBarSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps {
  /** Current progress, 0-100. Out-of-range values are clamped. */
  value: number;
  /** Fill style. Defaults to `gradient` (teal -> ocean blue). */
  variant?: ProgressBarVariant;
  /** Track thickness. Defaults to `md`. */
  size?: ProgressBarSize;
  /** Shows a "N%" label (or `label`, if given) below the track, right-aligned. */
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const heightClasses: Record<ProgressBarSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const solidFillClasses: Record<Exclude<ProgressBarVariant, 'gradient'>, string> = {
  teal: 'bg-tide-teal',
  blue: 'bg-ocean-blue',
  purple: 'bg-deep-purple',
};

/** Animated horizontal progress track. */
export function ProgressBar({
  value,
  variant = 'gradient',
  size = 'md',
  showLabel = false,
  label,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(clamped, { duration: 400, easing: Easing.out(Easing.cubic) });
  }, [clamped, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View className={cn('w-full', className)}>
      <View className={cn('w-full overflow-hidden rounded-full bg-hover', heightClasses[size])}>
        <Animated.View style={[{ height: '100%', overflow: 'hidden', borderRadius: 9999 }, fillStyle]}>
          {variant === 'gradient' ? (
            <LinearGradient
              colors={[...gradients.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          ) : (
            <View className={cn('h-full w-full', solidFillClasses[variant])} />
          )}
        </Animated.View>
      </View>

      {showLabel && (
        <Text variant="caption" color="muted" className="mt-1 self-end normal-case tracking-normal">
          {label ?? `${Math.round(clamped)}%`}
        </Text>
      )}
    </View>
  );
}
