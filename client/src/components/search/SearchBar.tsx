import { useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';

import { MIN_QUERY_LENGTH, useSearchController } from '../../hooks/useSearch';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../store/themeStore';
import { shadows } from '../../utils/theme';
import { Icon, Text } from '../ui';
import { SearchSuggestions } from './SearchSuggestions';

// navigator.platform is deprecated but still the simplest cross-browser Mac check
// available without adding a dependency — this only affects which hint glyph is shown.
const isMac =
  Platform.OS === 'web' && typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform ?? '');

/**
 * Inline, always-on-screen search bar for the Dashboard header. Shares its
 * query/suggestion/keyboard-nav logic with SearchModal (the Cmd+K palette) via
 * useSearchController — this is just the "closed" surface; opening it just means
 * focusing the input and showing the dropdown beneath it, no separate modal state.
 */
export function SearchBar() {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const { query, setQuery, activeIndex, groups, select, handleKey } = useSearchController(() =>
    inputRef.current?.blur(),
  );

  const isOpen = isFocused;
  const hasEnoughQuery = query.trim().length >= MIN_QUERY_LENGTH;

  const handleFocus = () => {
    if (blurTimeout.current) clearTimeout(blurTimeout.current);
    setIsFocused(true);
  };

  const handleBlur = () => {
    // Delayed so a suggestion's onPress (which fires before a TextInput blur commits on
    // web) still has a chance to run before the dropdown unmounts underneath it.
    blurTimeout.current = setTimeout(() => setIsFocused(false), 150);
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    handleKey(e.nativeEvent.key);
  };

  return (
    <View className="w-full items-center">
      <View className="w-full md:max-w-[600px]" style={{ position: 'relative', zIndex: 30 }}>
        <View
          className="w-full flex-row items-center gap-2 rounded-full border px-4"
          style={[
            {
              height: 48,
              backgroundColor: isDark ? themeColors.background.surface : themeColors.background.elevated,
              borderColor: isFocused ? themeColors.brand.tideTeal : themeColors.border.subtle,
            },
            isFocused ? (isDark ? shadows.focusRingDark : shadows.focusRing) : undefined,
          ]}
        >
          <Icon name="Search" size={18} color={isFocused ? themeColors.brand.tideTeal : themeColors.text.muted} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyPress={handleKeyPress}
            placeholder="Search TIDE... (habits, tasks, journal, activities)"
            placeholderTextColor={themeColors.text.disabled}
            className="flex-1 font-sans text-body text-primary"
          />
          {Platform.OS === 'web' && !isFocused && !query && (
            <View className="flex-row items-center rounded-md border border-subtle px-1.5 py-0.5">
              <Text variant="caption" color="muted" className="normal-case tracking-normal">
                {isMac ? '⌘K' : 'Ctrl+K'}
              </Text>
            </View>
          )}
        </View>

        {isOpen && (
          <View
            className="absolute left-0 right-0 top-[54px] overflow-hidden rounded-2xl border border-subtle bg-elevated"
            style={[{ zIndex: 30 }, shadows.lg]}
          >
            {hasEnoughQuery ? (
              <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
                <SearchSuggestions
                  groups={groups}
                  activeIndex={activeIndex}
                  onSelect={(item) => {
                    select(item);
                    setIsFocused(false);
                  }}
                />
              </ScrollView>
            ) : (
              <View className="items-center px-4 py-8">
                <Text variant="body" color="muted">
                  Start typing to search...
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
