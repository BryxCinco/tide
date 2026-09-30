import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Pressable } from '../ui/SoundPressable';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '../../hooks/useThemeColors';
import { gradients } from '../../utils/gradients';
import { colors, shadows } from '../../utils/theme';
import { Icon } from '../ui';

/**
 * Floating action button for the AI Coach — navigates to the full-page /chat screen (Fix
 * 5 retired the old ChatPanel.tsx modal/overlay in favor of a dedicated page) at every
 * screen width.
 */
export function ChatbotFAB() {
  const themeColors = useThemeColors();
  const size = Platform.OS === 'web' ? 64 : 56;

  const float = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true);
    pulse.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [float, pulse]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -float.value * 4 }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + pulse.value * 0.5,
    transform: [{ scale: 0.85 + pulse.value * 0.3 }],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', right: 24, bottom: 24, width: size, height: size },
        floatStyle,
        shadows.md,
        { shadowColor: colors.brand.tideTeal, shadowOpacity: 0.35, shadowRadius: 14 },
      ]}
    >
      <Pressable
        onPress={() => router.push('/chat')}
        style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}
      >
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="Sparkles" size={size * 0.42} color={colors.text.inverse} />
        </LinearGradient>
      </Pressable>

      <Animated.View
        style={[
          {
            position: 'absolute',
            top: -2,
            right: -2,
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: colors.brand.tideTeal,
            borderWidth: 2,
            borderColor: themeColors.background.base,
          },
          dotStyle,
        ]}
      />
    </Animated.View>
  );
}
