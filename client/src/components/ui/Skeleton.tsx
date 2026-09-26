import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { cn } from '../../utils/cn';

export interface SkeletonProps {
  className?: string;
  style?: ViewStyle;
}

/** Base pulsing placeholder block — SkeletonCard/SkeletonRow/SkeletonChart below all
 * compose this rather than each animating their own opacity separately. */
export function Skeleton({ className, style }: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.5, { duration: 700 })), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View className={cn('rounded-xl bg-elevated', className)} style={[animatedStyle, style]} />;
}

/** Placeholder for a Card-shaped block (journal entries, activity cards) — avatar/icon +
 * two title lines + two body lines. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <View className={cn('gap-3 rounded-2xl border border-subtle bg-surface p-4', className)}>
      <View className="flex-row items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <View className="flex-1 gap-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </View>
      </View>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </View>
  );
}

/** Placeholder for a single list row (tasks, activities) — icon + two lines, one line
 * shorter than the real content ever gets so it never looks like actual truncated text. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <View className={cn('flex-row items-center gap-3 rounded-xl border border-subtle bg-surface p-3', className)}>
      <Skeleton className="h-9 w-9 rounded-full" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </View>
    </View>
  );
}

/** Placeholder for a chart-shaped block (Insights' Bento cards) — one tall block standing
 * in for the plotted area, plus a thin row of "axis label" slivers underneath. */
export function SkeletonChart({ className }: { className?: string }) {
  return (
    <View className={cn('gap-2', className)}>
      <Skeleton className="h-32 w-full rounded-xl" />
      <View className="flex-row gap-2">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-3 w-1/4" />
      </View>
    </View>
  );
}
