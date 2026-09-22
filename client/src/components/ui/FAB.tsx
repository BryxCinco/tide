import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable } from './SoundPressable';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useResponsive } from '../../hooks/useResponsive';
import { gradients } from '../../utils/gradients';
import { colors, shadows } from '../../utils/theme';
import { Icon, type IconName } from './Icon';

export interface FABProps {
  icon: IconName;
  onPress: () => void;
}

/**
 * Bottom-right gradient floating action button — 56px on phone, 64px on tablet/desktop,
 * with a subtle 2s float loop and a press-in scale. Distinct from ChatbotFAB (Dashboard's
 * chat entry point has its own pulsing-dot behavior); this is the generic "create" FAB.
 */
export function FAB({ icon, onPress }: FABProps) {
  const { isPhone } = useResponsive();
  const size = isPhone ? 56 : 64;

  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [float]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -float.value * 4 }],
  }));

  return (
    <Animated.View
      style={[{ position: 'absolute', right: 24, bottom: 24, width: size, height: size }, floatStyle, shadows.glowTeal]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' },
          pressed && { transform: [{ scale: 0.95 }] },
        ]}
      >
        <LinearGradient
          colors={[...gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={icon} size={28} color={colors.text.inverse} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
