import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { MobileMenuButton } from '../layout/MobileMenuButton';
import { BackButton, Icon, Text } from '../ui';
import { Pressable } from '../ui/SoundPressable';
import { AIAvatar } from './AIAvatar';

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
          { width: 6, height: 6, borderRadius: 3, backgroundColor: isTyping ? themeColors.brand.tideTeal : '#22C55E' },
          pulseStyle,
        ]}
      />
      <Text variant="body" color="muted" className="text-[12px]">
        {isTyping ? 'Thinking…' : 'Online · your productivity assistant'}
      </Text>
    </View>
  );
}

/** Fixed top bar for the full-page AI Coach — menu/back button, the coach's identity
 * (aurora avatar, name, live status), and a "New chat" action. */
export function ChatHeader({ isTyping, hasMessages, onClear }: ChatHeaderProps) {
  const themeColors = useThemeColors();
  const { isPhone } = useResponsive();

  return (
    <View className="flex-row items-center gap-3 border-b border-subtle px-4 py-3 md:px-6">
      {/* Phone uses the drawer-access hamburger; tablet/desktop keep BackButton since the
          Sidebar is always visible there. */}
      <MobileMenuButton />
      {!isPhone && <BackButton />}

      <AIAvatar size={36} />

      {/* minWidth: 0 lets this column truncate its own text instead of pushing the action
          button past the screen edge. */}
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Text variant="body" color="primary" className="text-[16px] font-semibold" numberOfLines={1}>
          TIDE Coach
        </Text>
        <StatusDot isTyping={isTyping} />
      </View>

      {hasMessages && (
        <Pressable
          onPress={onClear}
          hitSlop={6}
          accessibilityLabel="Start a new chat"
          className="h-9 flex-row items-center gap-1.5 rounded-xl border border-subtle bg-surface px-3 transition-colors hover:border-tide-teal/40"
        >
          <Icon name="SquarePen" size={15} color={themeColors.text.secondary} />
          {!isPhone && (
            <Text variant="body" color="secondary" className="text-[13px] font-medium">
              New chat
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}
