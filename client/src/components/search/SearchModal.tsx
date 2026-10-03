import { useEffect, useRef, useState } from 'react';
import {
  Modal as RNModal,
  Platform,
  ScrollView,
  useWindowDimensions,
  View,
  type NativeSyntheticEvent,
  type TextInput as RNTextInputHandle,
  type TextInputKeyPressEventData,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '../ui/SoundPressable';
import { TextInput } from '../ui/SoundTextInput';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MIN_QUERY_LENGTH, useSearchController } from '../../hooks/useSearch';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useResponsive } from '../../hooks/useResponsive';
import { useThemeStore } from '../../store/themeStore';
import { modalHover, modalSurface, shadows } from '../../utils/theme';
import { darkVars, lightVars } from '../../utils/themeVars';
import { Icon, Text } from '../ui';
import { SearchSuggestions } from './SearchSuggestions';

export interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
}

/** Same grey-chip hover treatment as Modal.tsx/ChatPanel.tsx's close buttons — kept
 * consistent across all three RNModal-based dialogs in the app. */
function SearchCloseButton({
  onPress,
  themeColors,
  isDark,
}: {
  onPress: () => void;
  themeColors: ReturnType<typeof useThemeColors>;
  isDark: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className="h-9 w-9 items-center justify-center rounded-full"
      style={({ pressed }) => [
        { backgroundColor: hovered ? 'rgba(20, 184, 166, 0.12)' : isDark ? modalHover.dark : modalHover.light },
        pressed && { transform: [{ scale: 0.88 }] },
      ]}
    >
      <Icon name="X" size={17} color={hovered ? themeColors.brand.tideTeal : themeColors.text.secondary} />
    </Pressable>
  );
}

/**
 * The Cmd+K / Ctrl+K command palette — same suggestion logic and keyboard nav as
 * SearchBar (via useSearchController), just presented as a top-anchored overlay instead
 * of an inline dropdown. True backdrop blur needs expo-blur, which isn't installed; the
 * dark semi-transparent overlay plus a web-only `backdropFilter` (silently ignored
 * wherever the platform doesn't support it) approximates it without adding a dependency.
 */
const HEADER_HEIGHT = 68;

export function SearchModal({ visible, onClose }: SearchModalProps) {
  const { isPhone } = useResponsive();
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const inputRef = useRef<RNTextInputHandle>(null);
  const progress = useSharedValue(0);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Mirrors the wrapper View's own pt-20 (phone) / pt-32 (desktop) top offset below (80px /
  // 128px at the default 4px scale) — without a cap derived from it, the fixed 480px list plus
  // the 68px header could exceed what's actually left on a short or landscape phone screen,
  // pushing the bottom results off-screen with no scroll able to reach them (same class of bug
  // Modal.tsx's own windowHeight * 0.9 cap exists to prevent).
  const topOffset = isPhone ? 80 : 128;
  const panelMaxHeight = Math.max(200, windowHeight - topOffset - insets.bottom - 24);
  const listMaxHeight = Math.max(120, panelMaxHeight - HEADER_HEIGHT);

  const { query, setQuery, activeIndex, groups, select, handleKey, reset } = useSearchController(onClose);

  // See Modal.tsx's matching comment — `if (!visible) return null` used to unmount this
  // whole tree synchronously the instant `visible` went false, before the close `withTiming`
  // below ever got to visually play. `shouldRender` stays true until that animation actually
  // finishes; the render-phase update (not an effect) keeps opening exactly as instant as
  // before.
  const [shouldRender, setShouldRender] = useState(visible);
  if (visible && !shouldRender) {
    setShouldRender(true);
  }

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
      reset();
      // RNModal mounts its content on the next tick on web — a microtask delay lets the
      // TextInput actually exist before we try to focus it.
      const focusTimeout = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(focusTimeout);
    }
    progress.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(setShouldRender)(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -16 }, { scale: 0.98 + progress.value * 0.02 }],
  }));

  if (!shouldRender) return null;

  const hasEnoughQuery = query.trim().length >= MIN_QUERY_LENGTH;

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    handleKey(e.nativeEvent.key);
  };

  return (
    <RNModal visible={shouldRender} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Re-establishes the theme's CSS custom properties inside this portaled subtree —
          see Modal.tsx's matching comment for why RNModal on web needs this at all. */}
      <View className={isPhone ? 'flex-1 pt-20' : 'flex-1 items-center pt-32'} style={isDark ? darkVars : lightVars}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
            },
            Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as const) : undefined,
            backdropStyle,
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View style={contentStyle} className="mx-4 w-full md:max-w-[720px]">
          {/* Solid, not `bg-elevated` + `border-glass` — same "read as washed-out against
              the backdrop" issue Modal.tsx's header comment explains; same fix here. Sized
              to match Modal.tsx/ChatPanel.tsx's own upgrade (28px radius, bigger header). */}
          <View
            className="overflow-hidden rounded-[28px]"
            style={[
              {
                backgroundColor: isDark ? modalSurface.dark : modalSurface.light,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                maxHeight: panelMaxHeight,
              },
              shadows.modal,
            ]}
          >
            <View className="flex-row items-center gap-3.5 border-b border-subtle px-6" style={{ height: HEADER_HEIGHT }}>
              <View className="h-9 w-9 items-center justify-center rounded-full bg-tide-teal/[0.12]">
                <Icon name="Search" size={18} color={themeColors.brand.tideTeal} />
              </View>
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                onKeyPress={handleKeyPress}
                placeholder="Search TIDE... (habits, tasks, journal, activities)"
                placeholderTextColor={themeColors.text.disabled}
                className="flex-1 font-sans text-body-lg text-primary"
              />
              <SearchCloseButton onPress={onClose} themeColors={themeColors} isDark={isDark} />
            </View>

            {hasEnoughQuery ? (
              <ScrollView style={{ maxHeight: listMaxHeight }} keyboardShouldPersistTaps="handled">
                <SearchSuggestions groups={groups} activeIndex={activeIndex} onSelect={select} />
              </ScrollView>
            ) : (
              <View className="items-center px-4 py-10">
                <Text variant="body" color="muted">
                  Start typing to search...
                </Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
}
