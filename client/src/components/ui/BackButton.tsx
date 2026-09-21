import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { cn } from '../../utils/cn';
import { Icon } from './Icon';
import { Text } from './Text';

export type BackButtonVariant = 'icon' | 'text' | 'full';

export interface BackButtonProps {
  /** Defaults to router.back(). Pass an explicit handler to navigate to a specific screen instead. */
  onPress?: () => void;
  /** Shown next to the chevron for the `text`/`full` variants. Ignored by `icon`. */
  label?: string;
  /** `icon`: circular 40x40 button, chevron only (default). `text`: chevron + label, no chrome.
   * `full`: pill-shaped button with border, chevron + optional label. */
  variant?: BackButtonVariant;
  className?: string;
}

/** Reusable back-navigation control — chevron-left, Tide Light styling, teal-tinted hover on web. */
export function BackButton({ onPress, label, variant = 'icon', className }: BackButtonProps) {
  const handlePress = onPress ?? (() => router.back());
  // onHoverIn/Out only ever fire on web (pointer devices) — a no-op on touch, so this is
  // safe to wire up unconditionally rather than branching on Platform.OS.
  const [isHovered, setIsHovered] = useState(false);
  const hoverProps = { onHoverIn: () => setIsHovered(true), onHoverOut: () => setIsHovered(false) };
  const themeColors = useThemeColors();
  const iconColor = isHovered ? themeColors.brand.tideTeal : themeColors.text.primary;

  if (variant === 'text') {
    return (
      <Pressable onPress={handlePress} hitSlop={8} className={cn('flex-row items-center gap-1', className)} {...hoverProps}>
        <Icon name="ChevronLeft" size={18} color={iconColor} />
        <Text variant="body" color={isHovered ? 'accent' : 'primary'} className="font-medium">
          {label ?? 'Back'}
        </Text>
      </Pressable>
    );
  }

  if (variant === 'full') {
    return (
      <Pressable
        onPress={handlePress}
        hitSlop={8}
        className={cn(
          'h-10 flex-row items-center gap-2 self-start rounded-full border border-subtle bg-base px-4 hover:bg-elevated',
          className,
        )}
        style={({ pressed }) => [pressed && { transform: [{ scale: 0.95 }] }]}
        {...hoverProps}
      >
        <Icon name="ChevronLeft" size={18} color={iconColor} />
        {label && (
          <Text variant="body" color={isHovered ? 'accent' : 'primary'} className="font-medium">
            {label}
          </Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      className={cn(
        'h-10 w-10 items-center justify-center rounded-full border border-subtle bg-base hover:bg-elevated',
        className,
      )}
      style={({ pressed }) => [pressed && { transform: [{ scale: 0.95 }] }]}
      {...hoverProps}
    >
      <Icon name="ChevronLeft" size={20} color={iconColor} />
    </Pressable>
  );
}
