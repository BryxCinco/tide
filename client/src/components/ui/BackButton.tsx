import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';
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

  if (variant === 'text') {
    return (
      <Pressable onPress={handlePress} hitSlop={8} className={cn('flex-row items-center gap-1', className)}>
        <Icon name="ChevronLeft" size={18} color={colors.text.primary} />
        <Text variant="body" color="primary" className="font-medium">
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
      >
        <Icon name="ChevronLeft" size={18} color={colors.text.primary} />
        {label && (
          <Text variant="body" color="primary" className="font-medium">
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
    >
      <Icon name="ChevronLeft" size={20} color={colors.text.primary} />
    </Pressable>
  );
}
