import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal as RNModal, Platform, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { ModalLayout } from './ModalLayout';
import { Text } from './Text';

export type ModalSize = 'sm' | 'md' | 'lg' | 'full';
export type ModalTone = 'default' | 'accent' | 'danger';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Small line under the title — e.g. an item's name while editing it. */
  subtitle?: string;
  /** Small colored icon badge to the left of the title — gives each modal a visual
   * identity at a glance (Linear/Notion-style) instead of every dialog looking identical
   * apart from its text. Optional; omit for a plain text-only header. */
  icon?: IconName;
  /** Tints the icon badge and the top accent line. `accent` (teal) is the default look;
   * `danger` (red) is for irreversible actions (Delete Account, sign-out warnings). */
  tone?: ModalTone;
  children: ReactNode;
  /** Fixed action row pinned below the scrolling body (Save/Cancel, etc.) — stays visible
   * even when `children` overflows and scrolls. Omit for a modal with no footer actions;
   * nothing renders in its place, so no dead space is added. */
  footer?: ReactNode;
  /** Max width when centered (tablet/desktop) / content height on phone. Defaults to `md`. */
  size?: ModalSize;
  /** Default true: `children` renders inside a scrollable body so content taller than the
   * modal's max height scrolls instead of overflowing or stretching the modal past the
   * viewport. Set false when `children` already manages its own internal scroll region
   * (e.g. a fixed search field above a separately-scrolling result list). */
  scrollable?: boolean;
  /** Default true. Set false to hide the header's X button — e.g. a modal that only closes
   * via its own in-body actions. */
  showCloseButton?: boolean;
}

const CENTERED_DURATION = 250;
const SHEET_DURATION = 300;

const TONE_COLOR: Record<Exclude<ModalTone, 'default'>, string> = {
  accent: '#14B8A6',
  danger: '#EF4444',
};

/**
 * Every modal in the app (20+ call sites — EditProfileModal, DeleteAccountModal,
 * TaskFormModal, CustomizeDashboardModal, ...) renders through this one component, so
 * upgrading it here upgrades all of them at once rather than needing 20 separate edits.
 *
 * Structure is a fixed HEADER, a scrollable/flexible BODY, and an optional fixed FOOTER (see
 * ModalLayout) inside a box capped at 90% of the viewport height — the combination that rules
 * out the whole "footer button scrolled out of view / modal taller than the screen" class of
 * bug: header and footer never shrink, the body is the only section that grows, shrinks, and
 * scrolls. A KeyboardAvoidingView around that box keeps the focused input clear of the
 * keyboard on phone instead of letting the keyboard cover it. On web, Escape closes the modal
 * the same as tapping the backdrop.
 */
export function Modal({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  tone = 'accent',
  children,
  footer,
  size = 'md',
  scrollable = true,
  showCloseButton = true,
}: ModalProps) {
  const { isPhone, isTablet, isDesktop } = useResponsive();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
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

  // Escape closes the modal on web, matching a backdrop press — native has no equivalent key.
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || typeof window === 'undefined') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

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

  // The box never exceeds 90% of the viewport (less the phone's bottom safe-area, so a
  // bottom sheet never gets capped right under the home-indicator area) — short content
  // still hugs its own size exactly (see ModalLayout's doc comment for why), this is only a
  // ceiling. `full` already fills 100% of the screen, so it doesn't need a separate cap.
  const maxHeightPx = windowHeight * 0.9 - (isPhone ? insets.bottom : 0);

  const header =
    title || showCloseButton ? (
      <View className={cn('flex-row items-center justify-between px-7', title ? 'border-b border-subtle py-6' : 'pt-6')}>
        {title ? (
          <View className="flex-1 flex-row items-center gap-3.5 pr-4">
            {icon && (
              <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${accentColor}1F` }}>
                <Icon name={icon} size={21} color={accentColor} />
              </View>
            )}
            <View className="flex-1">
              <Text variant="h2" color="primary" className="text-[22px]">
                {title}
              </Text>
              {subtitle && (
                <Text variant="caption" color="muted" className="mt-0.5 normal-case tracking-normal" numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View className="flex-1" />
        )}
        {showCloseButton && (
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
        )}
      </View>
    ) : undefined;

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

        <Animated.View
          style={[contentStyle, !isFull && { maxHeight: maxHeightPx }]}
          className={isPhone ? 'w-full' : cn('w-full', centeredWidthClasses[size])}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={isFull ? { flex: 1 } : { flexShrink: 1 }}
          >
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
                isFull ? { flex: 1 } : { maxHeight: maxHeightPx, flexShrink: 1 },
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
                <Pressable
                  onPress={onClose}
                  className="items-center pt-3"
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <View className="h-1 w-10 rounded-full" style={{ backgroundColor: themeColors.border.hover }} />
                </Pressable>
              )}

              <ModalLayout
                header={header}
                body={children}
                footer={footer}
                scrollable={scrollable}
                isFull={isFull}
                bottomInset={isPhone ? insets.bottom : 0}
              />
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </RNModal>
  );
}
