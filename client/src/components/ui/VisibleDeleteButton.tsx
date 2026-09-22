import { useState } from 'react';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../store/themeStore';
import { confirmAsync } from '../../utils/confirm';
import { Icon } from './Icon';
import { Pressable } from './SoundPressable';

export interface VisibleDeleteButtonProps {
  /** 'delete' (red hover, Trash2, confirms via confirmAsync before calling onConfirm) or
   * 'hide' (neutral hover, EyeOff, no confirmation — archiving isn't destructive/
   * irreversible the way a delete is, so it doesn't need the same guard rail). Defaults
   * to 'delete'. */
  variant?: 'delete' | 'hide';
  /** Called after confirmation (delete) or immediately (hide). */
  onConfirm: () => void;
  /** Only used for variant="delete". */
  confirmTitle?: string;
  confirmMessage?: string;
  size?: number;
}

/**
 * Always-visible 32x32 circular icon button — the whole point of this component (see Fix
 * 1's spec) is that delete is never hidden behind a 3-dot menu or a swipe gesture, so every
 * card that can be removed renders this directly instead of tucking the action away.
 */
export function VisibleDeleteButton({
  variant = 'delete',
  onConfirm,
  confirmTitle,
  confirmMessage,
  size = 16,
}: VisibleDeleteButtonProps) {
  const [hovered, setHovered] = useState(false);
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const isDelete = variant === 'delete';

  const handlePress = async () => {
    if (isDelete) {
      const confirmed = await confirmAsync(confirmTitle ?? 'Delete this?', confirmMessage ?? "This can't be undone.");
      if (!confirmed) return;
    }
    onConfirm();
  };

  const hoverBg = isDelete ? (isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2') : isDark ? 'rgba(255, 255, 255, 0.08)' : '#F3F4F6';

  return (
    <Pressable
      onPress={handlePress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      hitSlop={6}
      className="h-8 w-8 items-center justify-center rounded-full"
      style={{ backgroundColor: hovered ? hoverBg : 'transparent' }}
    >
      <Icon
        name={isDelete ? 'Trash2' : 'EyeOff'}
        size={size}
        color={hovered && isDelete ? themeColors.status.error : themeColors.text.muted}
      />
    </Pressable>
  );
}
