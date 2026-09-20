import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { gradients } from '../../utils/gradients';
import { colors } from '../../utils/theme';
import { Button, Text } from '../ui';

export interface HeroCardProps {
  label: string;
  subtitle: string;
  onStartSession?: () => void;
}

/** Dashboard centerpiece: today's focus goal + a big "Start Session" CTA, on a very subtle gradient wash. */
export function HeroCard({ label, subtitle, onStartSession }: HeroCardProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + pulse.value * 0.6,
    transform: [{ scale: 0.85 + pulse.value * 0.3 }],
  }));

  return (
    <View className="overflow-hidden rounded-2xl border border-subtle bg-base">
      <View className="absolute inset-0" pointerEvents="none">
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, opacity: 0.06 }}
        />
      </View>
      <View className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-tide-teal/10" pointerEvents="none" />
      <View className="absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-ocean-blue/10" pointerEvents="none" />

      <View className="gap-6 p-6">
        <View className="flex-row items-center gap-2">
          <Animated.View
            style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand.tideTeal }, dotStyle]}
          />
          <Text variant="label" color="accent">
            Today&apos;s Focus
          </Text>
        </View>

        <View className="gap-2">
          <Text variant="h1" color="primary">
            {label}
          </Text>
          <Text variant="body" color="muted">
            {subtitle}
          </Text>
        </View>

        <Button
          title="Start Session"
          variant="primary"
          size="lg"
          icon="Play"
          onPress={onStartSession ?? (() => router.push('/timer'))}
          className="self-end"
        />
      </View>
    </View>
  );
}
