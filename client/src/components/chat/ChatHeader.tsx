import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '../../hooks/useThemeColors';
import { BackButton, Icon, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';

export interface ChatHeaderProps {
  isTyping: boolean;
  hasMessages: boolean;
  onClear: () => void;
}

/** Green when idle, pulsing teal + "Thinking..." while the AI Coach is working on a reply —
 * the full page's equivalent of ChatPanel's old AIStatusIndicator, folded into the header
 * instead of floating above the composer. */
function StatusDot({ isTyping }: { isTyping: boolean }) {
  const themeColors = useThemeColors();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!isTyping) return;
    pulse.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [isTyping, pulse]);

  const pulseStyle = useAnimatedStyle(() =>
    isTyping ? { opacity: 0.5 + pulse.value * 0.5, transform: [{ scale: 0.85 + pulse.value * 0.3 }] } : { opacity: 1 },
  );

  return (
    <View className="flex-row items-center gap-1.5">
      <Animated.View
        style={[
          { width: 7, height: 7, borderRadius: 3.5, backgroundColor: isTyping ? themeColors.brand.tideTeal : '#22C55E' },
          pulseStyle,
        ]}
      />
      <Text variant="caption" color="muted" className="normal-case tracking-normal">
        {isTyping ? 'Thinking...' : 'Online'}
      </Text>
    </View>
  );
}

/** Fixed top bar for the full-page AI Coach (Fix 5) — back button, title/subtitle, a live
 * status line, and a clear-chat action, all pinned above the scrollable conversation. */
export function ChatHeader({ isTyping, hasMessages, onClear }: ChatHeaderProps) {
  const themeColors = useThemeColors();

  return (
    <View className="flex-row items-center gap-3 border-b border-subtle bg-base px-4 py-3 md:px-6">
      <BackButton />

      <View className="flex-1">
        <Text variant="h3" color="primary">
          AI Coach
        </Text>
        <View className="flex-row items-center gap-2">
          <Text variant="caption" color="muted" className="normal-case tracking-normal">
            Your personal productivity assistant
          </Text>
          <Text variant="caption" color="muted">
            •
          </Text>
          <StatusDot isTyping={isTyping} />
        </View>
      </View>

      {hasMessages && (
        <Pressable
          onPress={onClear}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-full hover:bg-elevated"
        >
          <Icon name="Trash2" size={18} color={themeColors.text.secondary} />
        </Pressable>
      )}
    </View>
  );
}
