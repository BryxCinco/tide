import { useState } from 'react';
import { View } from 'react-native';
import { TextInput } from '../ui/SoundTextInput';
import { Pressable } from '../ui/SoundPressable';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../utils/cn';
import { shadows } from '../../utils/theme';
import { Icon } from '../ui';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  className?: string;
}

/** Search input styled to match Input.tsx (soft border, teal focus glow), with a clear button once there's text. */
export function SearchBar({ value, onChangeText, placeholder = 'Search entries...', className }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');

  return (
    <View
      className={cn(
        'h-11 flex-row items-center gap-2 rounded-xl border bg-base px-3.5',
        isFocused ? 'border-tide-teal' : 'border-subtle',
        className,
      )}
      style={isFocused ? (isDark ? shadows.focusRingDark : shadows.focusRing) : undefined}
    >
      <Icon name="Search" size={18} color={isFocused ? themeColors.brand.tideTeal : undefined} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={themeColors.text.disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="flex-1 font-sans text-body text-primary"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Icon name="X" size={16} />
        </Pressable>
      )}
    </View>
  );
}
