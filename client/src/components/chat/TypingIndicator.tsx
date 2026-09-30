import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '../../hooks/useThemeColors';

const DOT_COUNT = 3;
const BOUNCE_HEIGHT = 4;
// Each dot bounces up-and-back over 1.4s total (withRepeat's `true` reverse means this
// duration is one direction, so the full up+down cycle is 2x = 1.4s — matching the "loop:
// 1.4s total" spec), staggered 0.2s apart so they read as a wave, not a synchronized bounce.
const CYCLE_DURATION = 700;
const STAGGER = 200;

function Dot({ delay, color }: { delay: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: CYCLE_DURATION, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -progress.value * BOUNCE_HEIGHT }],
    opacity: 0.5 + progress.value * 0.5,
  }));

  return (
    <Animated.View
      style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }, style]}
    />
  );
}

/** Classic 3-dot "thinking" indicator, shown in an assistant-style bubble while
 * chatStore's isTyping is true (app/chat.tsx's full-page AI Coach — Fix 6). */
export function TypingIndicator() {
  const themeColors = useThemeColors();

  return (
    <View className="flex-row items-center gap-1.5">
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <Dot key={i} delay={i * STAGGER} color={themeColors.text.muted} />
      ))}
    </View>
  );
}
