import { useEffect } from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useToastStore, type ToastVariant } from '../../store/toastStore';
import { shadows } from '../../utils/theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const AUTO_DISMISS_MS = 3000;

const VARIANT_ICON: Record<ToastVariant, IconName> = {
  success: 'CheckCircle2',
  error: 'XCircle',
  info: 'Info',
};

/**
 * Mounted once at the root (app/_layout.tsx, same pattern as ChatPanel/SearchModal) and
 * driven entirely by toastStore — call `showToast(...)` from anywhere, including plain
 * utils outside a component (exportData.ts, cache.ts), not just from event handlers here.
 * Bottom-center, above the mobile tab bar's reach and clear of ChatbotFAB's bottom-right
 * corner on desktop. Auto-dismisses; also dismissible by tap since a toast blocking a
 * repeated action for 3s would be its own small annoyance.
 */
export function Toast() {
  const message = useToastStore((s) => s.message);
  const variant = useToastStore((s) => s.variant);
  const key = useToastStore((s) => s.key);
  const hide = useToastStore((s) => s.hide);
  const themeColors = useThemeColors();

  const progress = useSharedValue(0);

  // Entrance-only, same tradeoff Modal.tsx already makes: kicking off a fade-out then
  // unmounting on the same render (below) means the exit never visibly animates, only the
  // entrance does. Matching that existing convention rather than introducing a different
  // "hold state until the exit animation finishes" pattern used nowhere else in this app.
  useEffect(() => {
    if (!message) return;
    progress.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
    const timeout = setTimeout(hide, AUTO_DISMISS_MS);
    return () => clearTimeout(timeout);
    // Re-runs on every `key` bump (see toastStore.ts) so showing the same message twice in
    // a row restarts the timer instead of being swallowed by an unchanged dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 16 }],
  }));

  if (!message) return null;

  const iconColor = variant === 'error' ? themeColors.status.error : variant === 'info' ? themeColors.brand.oceanBlue : themeColors.brand.tideTeal;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: Platform.OS === 'web' ? 24 : 96, alignItems: 'center', zIndex: 100 }}
    >
      <Animated.View style={style}>
        <Pressable
          onPress={hide}
          className="max-w-[90vw] flex-row items-center gap-2.5 rounded-full border border-glass bg-elevated px-4 py-3"
          style={shadows.lg}
        >
          <Icon name={VARIANT_ICON[variant]} size={18} color={iconColor} />
          <Text variant="body" color="primary" className="normal-case tracking-normal">
            {message}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
