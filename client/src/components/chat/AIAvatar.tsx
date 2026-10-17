import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { gradientDirections, gradients } from '../../utils/gradients';
import { Icon } from '../ui';

export interface AIAvatarProps {
  size?: number;
  /** Slow breathing halo behind the avatar — an opacity-only animation on a separate layer,
   * so the avatar itself (and any text next to it) never moves. */
  pulse?: boolean;
  /** Kept for API compatibility with older call sites; the spin-in was removed because a
   * rotating avatar on every new reply made the conversation feel jumpy. */
  spinOnMount?: boolean;
  /** Rounded-square "app icon" shape instead of a circle — used for the empty-state hero. */
  shape?: 'circle' | 'squircle';
}

/** The AI Coach's identity mark: a Sparkles glyph on TIDE's aurora gradient. */
export function AIAvatar({ size = 32, pulse = false, shape = 'circle' }: AIAvatarProps) {
  const halo = useSharedValue(0);
  const radius = shape === 'circle' ? size / 2 : size * 0.32;

  useEffect(() => {
    if (!pulse) return;
    halo.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse, halo]);

  const haloStyle = useAnimatedStyle(() => ({ opacity: 0.25 + halo.value * 0.35 }));

  return (
    <View style={{ width: size, height: size }}>
      {pulse && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: -size * 0.18,
              left: -size * 0.18,
              width: size * 1.36,
              height: size * 1.36,
              borderRadius: shape === 'circle' ? size : radius * 1.4,
              backgroundColor: 'rgba(20, 184, 166, 0.22)',
            },
            haloStyle,
          ]}
        />
      )}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          overflow: 'hidden',
          shadowColor: '#06B6D4',
          shadowOffset: { width: 0, height: size > 40 ? 10 : 3 },
          shadowOpacity: 0.3,
          shadowRadius: size > 40 ? 20 : 6,
          elevation: 4,
        }}
      >
        <LinearGradient
          colors={[...gradients.aurora]}
          {...gradientDirections.diagonal}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius }}
        >
          <Icon name="Sparkles" size={size * 0.48} color="#FFFFFF" />
        </LinearGradient>
      </View>
    </View>
  );
}
