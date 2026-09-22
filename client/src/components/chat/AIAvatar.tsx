import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { gradients } from '../../utils/gradients';
import { colors } from '../../utils/theme';
import { Icon } from '../ui';

export interface AIAvatarProps {
  size?: number;
  /** Subtle breathing glow — on by default, but the typing indicator's own inline avatar
   * turns it off so two independently-animated pulses don't compete visually. */
  pulse?: boolean;
}

/** Teal-gradient circular avatar for the AI Coach — Sparkles icon, optional soft pulse
 * glow (a shadow, not a scale change, so it doesn't jostle text sitting next to it). */
export function AIAvatar({ size = 32, pulse = true }: AIAvatarProps) {
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!pulse) return;
    glow.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.25 + glow.value * 0.25,
  }));

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' },
        pulse && {
          shadowColor: colors.brand.tideTeal,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 8,
          elevation: 4,
        },
        pulse && glowStyle,
      ]}
    >
      <LinearGradient
        colors={[...gradients.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="Sparkles" size={size * 0.5} color="#FFFFFF" />
      </LinearGradient>
    </Animated.View>
  );
}
