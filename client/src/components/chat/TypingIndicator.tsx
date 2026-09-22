import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '../../hooks/useThemeColors';

const DOT_COUNT = 3;
const BOUNCE_HEIGHT = 4;
const CYCLE_DURATION = 600;
const STAGGER = 150;

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
 * chatStore's isTyping is true (see chatStore.ts's simulated MOCK_AI_THINKING_DELAY). */
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
