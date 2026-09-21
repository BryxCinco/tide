import { useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MIN_QUERY_LENGTH, useSearchController } from '../../hooks/useSearch';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useResponsive } from '../../hooks/useResponsive';
import { shadows } from '../../utils/theme';
import { Icon, Text } from '../ui';
import { SearchSuggestions } from './SearchSuggestions';

export interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * The Cmd+K / Ctrl+K command palette — same suggestion logic and keyboard nav as
 * SearchBar (via useSearchController), just presented as a top-anchored overlay instead
 * of an inline dropdown. True backdrop blur needs expo-blur, which isn't installed; the
 * dark semi-transparent overlay plus a web-only `backdropFilter` (silently ignored
 * wherever the platform doesn't support it) approximates it without adding a dependency.
 */
export function SearchModal({ visible, onClose }: SearchModalProps) {
  const { isPhone } = useResponsive();
  const themeColors = useThemeColors();
  const inputRef = useRef<TextInput>(null);
  const progress = useSharedValue(0);

  const { query, setQuery, activeIndex, groups, select, handleKey, reset } = useSearchController(onClose);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 200, easing: Easing.out(Easing.cubic) });
    if (visible) {
      reset();
      // RNModal mounts its content on the next tick on web — a microtask delay lets the
      // TextInput actually exist before we try to focus it.
      const focusTimeout = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(focusTimeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -16 }, { scale: 0.98 + progress.value * 0.02 }],
  }));

  if (!visible) return null;

  const hasEnoughQuery = query.trim().length >= MIN_QUERY_LENGTH;

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    handleKey(e.nativeEvent.key);
  };

  return (
    <RNModal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className={isPhone ? 'flex-1 pt-20' : 'flex-1 items-center pt-32'}>
        <Animated.View
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 14, 20, 0.55)' },
            Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)' } as const) : undefined,
            backdropStyle,
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>

        <Animated.View style={contentStyle} className="mx-4 w-full md:max-w-[640px]">
          <View className="overflow-hidden rounded-2xl border border-glass bg-elevated" style={shadows.lg}>
            <View className="flex-row items-center gap-3 border-b border-subtle px-5" style={{ height: 56 }}>
              <Icon name="Search" size={20} color={themeColors.brand.tideTeal} />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                onKeyPress={handleKeyPress}
                placeholder="Search TIDE... (habits, tasks, journal, activities)"
                placeholderTextColor={themeColors.text.disabled}
                className="flex-1 font-sans text-body-lg text-primary"
              />
              <Pressable onPress={onClose} hitSlop={8}>
                <Icon name="X" size={18} />
              </Pressable>
            </View>

            {hasEnoughQuery ? (
              <ScrollView style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled">
                <SearchSuggestions groups={groups} activeIndex={activeIndex} onSelect={select} />
              </ScrollView>
            ) : (
              <View className="items-center px-4 py-8">
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
