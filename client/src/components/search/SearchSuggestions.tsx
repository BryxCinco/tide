import { useState } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import type { Suggestion, SuggestionGroup } from '../../hooks/useSearch';
import { hexToRgba } from '../../utils/color';
import { Icon, Text } from '../ui';

export interface SearchSuggestionsProps {
  groups: SuggestionGroup[];
  /** Flat index (spanning every group in order) of the keyboard-highlighted row. */
  activeIndex: number;
  onSelect: (item: Suggestion) => void;
  emptyMessage?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  pages: 'PAGES',
  actions: 'ACTIONS',
  recent: 'RECENT',
};

/** Grouped, keyboard-navigable suggestion list shared by SearchBar and SearchModal. */
export function SearchSuggestions({ groups, activeIndex, onSelect, emptyMessage = 'No results' }: SearchSuggestionsProps) {
  if (groups.length === 0) {
    return (
      <View className="items-center px-4 py-8">
        <Text variant="body" color="muted">
          {emptyMessage}
        </Text>
      </View>
    );
  }

  let runningIndex = -1;

  return (
    <View className="py-2">
      {groups.map((group) => (
        <View key={group.category} className="gap-0.5">
          <Text
            variant="label"
            color="muted"
            className="px-4 py-2"
            style={{ fontSize: 12 }}
          >
            {CATEGORY_LABELS[group.category] ?? group.label.toUpperCase()}
          </Text>
          {group.items.map((item) => {
            runningIndex += 1;
            return <SuggestionRow key={item.id} item={item} isActive={runningIndex === activeIndex} onSelect={() => onSelect(item)} />;
          })}
        </View>
      ))}
    </View>
  );
}

function SuggestionRow({ item, isActive, onSelect }: { item: Suggestion; isActive: boolean; onSelect: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const themeColors = useThemeColors();
  const highlighted = isActive || isHovered;

  return (
    <Pressable
      onPress={onSelect}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      className="mx-2 flex-row items-center gap-3 rounded-lg px-4 py-3"
      style={{
        minHeight: 52,
        backgroundColor: highlighted ? hexToRgba(themeColors.brand.tideTeal, isActive ? 0.1 : 0.06) : 'transparent',
      }}
    >
      <Icon name={item.icon} size={20} color={highlighted ? themeColors.brand.tideTeal : themeColors.text.muted} />
      <View className="flex-1">
        <Text
          variant="body"
          color="primary"
          className="font-medium"
          style={{ fontSize: 16 }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        {item.subtitle && (
          <Text
            variant="body"
            color="muted"
            style={{ fontSize: 14 }}
            numberOfLines={1}
          >
            {item.subtitle}
          </Text>
        )}
      </View>
      {highlighted && <Icon name="ArrowRight" size={16} color={themeColors.brand.tideTeal} />}
    </Pressable>
  );
}
