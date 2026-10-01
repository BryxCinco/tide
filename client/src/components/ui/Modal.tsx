import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Modal as RNModal, Platform, View } from 'react-native';
import { Pressable } from './SoundPressable';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../utils/cn';
import { gradients } from '../../utils/gradients';
import { modalHover, modalSurface, shadows } from '../../utils/theme';
import { darkVars, lightVars } from '../../utils/themeVars';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ModalSize = 'sm' | 'md' | 'lg' | 'full';
export type ModalTone = 'default' | 'accent' | 'danger';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Small colored icon badge to the left of the title — gives each modal a visual
   * identity at a glance (Linear/Notion-style) instead of every dialog looking identical
   * apart from its text. Optional; omit for a plain text-only header. */
  icon?: IconName;
  /** Tints the icon badge and the top accent line. `accent` (teal) is the default look;
   * `danger` (red) is for irreversible actions (Delete Account, sign-out warnings). */
  tone?: ModalTone;
  children: ReactNode;
  /** Max width when centered (tablet/desktop) / content height on phone. Defaults to `md`. */
  size?: ModalSize;
}

const CENTERED_DURATION = 250;
const SHEET_DURATION = 300;

const TONE_COLOR: Record<Exclude<ModalTone, 'default'>, string> = {
  accent: '#14B8A6',
  danger: '#EF4444',
};

/**
 * Every modal in the app (14+ call sites — EditProfileModal, DeleteAccountModal,
 * TaskFormModal, CustomizeDashboardModal, ...) renders through this one component, so
 * upgrading it here upgrades all of them at once rather than needing 14 separate edits.
 *
 * Beyond the solid-background fix (see the git history on this file), this version adds
 * the "readable AND interactive" half of that ask: a spring-based entrance instead of a
 * flat ease-out (a slight, natural overshoot reads as alive rather than mechanical), an
 * optional colored icon badge + top accent gradient line for visual identity per modal
 * (tone-able so a destructive modal can read as red instead of teal), and tactile
 * press/hover feedback on the close button.
 */
export function Modal({ visible, onClose, title, icon, tone = 'accent', children, size = 'md' }: ModalProps) {
  const { isPhone, isTablet, isDesktop } = useResponsive();
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const [closeHovered, setCloseHovered] = useState(false);
  const progress = useSharedValue(0);

  // Stays mounted through the close animation instead of unmounting the instant `visible`
  // goes false — gating the early return below on `visible` directly used to unmount this
  // whole tree synchronously on the same render, before the close `withTiming` below ever
  // got a chance to visually play (its effect still ran, just against nothing left on
  // screen). The render-phase update here (not an effect) is what keeps opening instant —
  // see React's "adjusting state when a prop changes" pattern: calling setState during
  // render like this is safe and re-renders before paint, no flash.
  const [shouldRender, setShouldRender] = useState(visible);
  if (visible && !shouldRender) {
    setShouldRender(true);
  }

  useEffect(() => {
    if (visible) {
      // Spring only on the way in — a bounce on close would fight the "gone" feeling of a
      // dismiss, so closing still uses the flat ease-out from before.
      progress.value = withSpring(1, { damping: 16, stiffness: 180, mass: 0.9 });
    } else {
      progress.value = withTiming(
        0,
        { duration: isPhone ? SHEET_DURATION : CENTERED_DURATION, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setShouldRender)(false);
        }
      );
    }
  }, [visible, isPhone, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.min(progress.value, 1),
  }));

  const contentStyle = useAnimatedStyle(() => {
    if (isPhone) {
      return {
        opacity: Math.min(progress.value, 1),
        transform: [{ translateY: (1 - progress.value) * 64 }],
      };
    }
    return {
      opacity: Math.min(progress.value, 1),
      // Wider range than a plain fade (0.9 -> 1.0, not 0.97 -> 1.0) so the spring's slight
      // overshoot past 1.0 actually reads as a visible "pop" instead of disappearing into
      // sub-pixel rounding.
      transform: [{ scale: 0.9 + progress.value * 0.1 }],
    };
  });

  if (!shouldRender) {
    return null;
  }

  const isFull = size === 'full';
  const accentColor = tone === 'danger' ? TONE_COLOR.danger : TONE_COLOR.accent;

  // Sized up from the previous 600/500 numbers — genuinely bigger, iOS-sheet-scale
  // dialogs, not just "not tiny anymore." sm/lg scale proportionally around `md`.
  const centeredWidthClasses: Record<ModalSize, string> = {
    sm: isTablet ? 'max-w-[420px]' : 'max-w-[460px]',
    md: isDesktop ? 'max-w-[680px]' : 'max-w-[560px]',
    lg: isDesktop ? 'max-w-[820px]' : 'max-w-[680px]',
    full: 'h-full w-full',
  };

  return (
    <RNModal visible={shouldRender} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* React Native Web's <Modal> renders through a portal straight onto `document.body`
          (see react-native-web's ModalPortal.js), completely outside the root <View> in
          app/_layout.tsx that carries the theme's `--color-*` CSS custom properties as an
          inline style. CSS custom properties only inherit through the real DOM tree, and a
          portal breaks that continuity — so every neutral `text-*`/`bg-*`/`border-*`
          className inside any RNModal-based component (this one, ChatPanel, SearchModal)
          was silently resolving to nothing and falling back to the browser's default black
          text, which happened to look fine on light backgrounds by coincidence and was
          unreadable on dark ones. Re-applying the same vars object here re-establishes that
          scope for this portaled subtree specifically. */}
      <View className={cn('flex-1', isPhone ? 'justify-end' : 'items-center justify-center p-4')} style={isDark ? darkVars : lightVars}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              inset: 0,
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
            },
            Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as const) : undefined,
            backdropStyle,
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View style={contentStyle} className={isPhone ? 'w-full' : cn('w-full', centeredWidthClasses[size])}>
          <View
            className={cn(
              'overflow-hidden',
              isPhone ? (isFull ? '' : 'rounded-t-[28px]') : 'rounded-[28px]',
              isFull && 'h-full w-full',
            )}
            style={[
              {
                backgroundColor: isDark ? modalSurface.dark : modalSurface.light,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
              },
              shadows.modal,
            ]}
          >
            {/* Signature glow — a thin gradient line, same idea as Card's `accentLine` and
                the Sidebar's top glow, so every modal carries a touch of the app's teal
                identity even when its content is plain text/rows. Red for `danger` tone. */}
            <View className="absolute left-0 right-0 top-0 h-[3px]" pointerEvents="none">
              <LinearGradient
                colors={tone === 'danger' ? ['#EF4444', '#F97316'] : [...gradients.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </View>

            {isPhone && !isFull && (
              <View className="items-center pt-3">
                <View className="h-1 w-10 rounded-full" style={{ backgroundColor: themeColors.border.hover }} />
              </View>
            )}

            <View className={cn('flex-row items-center justify-between px-7', title ? 'border-b border-subtle py-6' : 'pt-6')}>
              {title ? (
                <View className="flex-1 flex-row items-center gap-3.5 pr-4">
                  {icon && (
                    <View
                      className="h-11 w-11 items-center justify-center rounded-full"
                      style={{ backgroundColor: `${accentColor}1F` }}
                    >
                      <Icon name={icon} size={21} color={accentColor} />
                    </View>
                  )}
                  <Text variant="h2" color="primary" className="flex-1 text-[22px]">
                    {title}
                  </Text>
                </View>
              ) : (
                <View className="flex-1" />
              )}
              <Pressable
                onPress={onClose}
                hitSlop={8}
                onHoverIn={() => setCloseHovered(true)}
                onHoverOut={() => setCloseHovered(false)}
                className="h-9 w-9 items-center justify-center rounded-full"
                style={({ pressed }) => [
                  { backgroundColor: closeHovered ? 'rgba(20, 184, 166, 0.12)' : isDark ? modalHover.dark : modalHover.light },
                  pressed && { transform: [{ scale: 0.88 }] },
                ]}
              >
                <Icon name="X" size={18} color={closeHovered ? themeColors.brand.tideTeal : themeColors.text.secondary} />
              </Pressable>
            </View>

            <View className={cn('p-7', isFull && 'flex-1')}>{children}</View>
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
}
