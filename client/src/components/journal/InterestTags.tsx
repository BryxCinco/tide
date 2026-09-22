import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import { INTEREST_TAGS } from '../../types/journal';
import { cn } from '../../utils/cn';
import { shadows } from '../../utils/theme';
import { Button, Text } from '../ui';

export interface InterestTagsProps {
  value: string[];
  onChange: (tags: string[]) => void;
  className?: string;
}

/** Multi-select pills for the pre-defined interest tags, plus a soft pill-shaped field for custom ones. */
export function InterestTags({ value, onChange, className }: InterestTagsProps) {
  const [draft, setDraft] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const themeColors = useThemeColors();

  const toggleTag = (tag: string) => {
    onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag]);
  };

  const addCustomTag = () => {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft('');
  };

  // Custom tags the user already added render as their own pill too, even though they
  // aren't in INTEREST_TAGS, so they stay visible and removable alongside the presets.
  const customSelected = value.filter((tag) => !INTEREST_TAGS.includes(tag));
  const allTags = [...INTEREST_TAGS, ...customSelected];

  return (
    <View className={cn('gap-3', className)}>
      <Text variant="label" color="muted">
        Tags
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {allTags.map((tag) => {
          const isSelected = value.includes(tag);
          return (
            <Pressable
              key={tag}
              onPress={() => toggleTag(tag)}
              className={cn(
                'rounded-full border px-3 py-1.5',
                isSelected ? 'border-tide-teal bg-tide-teal/10' : 'border-subtle bg-base',
              )}
            >
              <Text variant="caption" color={isSelected ? 'accent' : 'secondary'} className="normal-case tracking-normal">
                {tag}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        className={cn(
          'h-11 flex-row items-center gap-2 rounded-full border bg-elevated pl-4 pr-1.5',
          isFocused ? 'border-tide-teal' : 'border-subtle',
        )}
        style={isFocused ? shadows.focusRing : undefined}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addCustomTag}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType="done"
          placeholder="Add custom tag..."
          placeholderTextColor={themeColors.text.disabled}
          className="flex-1 font-sans text-body text-primary"
        />
        <Button title="Add" variant="ghost" size="sm" onPress={addCustomTag} />
      </View>
    </View>
  );
}
