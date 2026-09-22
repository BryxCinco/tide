import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '../../hooks/useThemeColors';
import { Icon, Text } from '../ui';

export interface AIStatusIndicatorProps {
  visible: boolean;
}

// Cycled while chatStore.isTyping is true (MOCK_AI_THINKING_DELAY = 1000ms — see
// mockAI.ts) — two phrases at 500ms each fits that window once, reading as real
// multi-step "processing" rather than a single static label. A real backend (Phase 10)
// could drive this from actual request stages instead of a timer.
const STATUS_PHRASES = ['Thinking...', 'Analyzing your data...'];
const PHRASE_INTERVAL = 500;

/** Spotlight/Raycast-style micro-interaction feedback — a cycling status line with a
 * pulsing Sparkles glyph, shown above the results area while the mock AI "thinks",
 * instead of (or in addition to) a plain 3-dot bubble. */
export function AIStatusIndicator({ visible }: AIStatusIndicatorProps) {
  const themeColors = useThemeColors();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      setPhraseIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % STATUS_PHRASES.length);
    }, PHRASE_INTERVAL);
    return () => clearInterval(interval);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    pulse.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [visible, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + pulse.value * 0.5,
    transform: [{ scale: 0.9 + pulse.value * 0.15 }],
  }));

  if (!visible) return null;

  return (
    <View className="flex-row items-center gap-2 px-6 py-3">
      <Animated.View style={pulseStyle}>
        <Icon name="Sparkles" size={15} color={themeColors.brand.tideTeal} />
      </Animated.View>
      <Text variant="caption" color="muted" className="normal-case tracking-normal">
        {STATUS_PHRASES[phraseIndex]}
      </Text>
    </View>
  );
}
