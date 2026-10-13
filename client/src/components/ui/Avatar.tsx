import { useState } from 'react';
import { Image, Text as RNText, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { cn } from '../../utils/cn';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'offline' | 'busy';
export type AvatarRingColor = 'purple' | 'teal';

export interface AvatarProps {
  /** Image URI. Falls back to initials when omitted or the image fails to load. */
  source?: string;
  /** Used to derive the initials fallback, e.g. "Ada Lovelace" -> "AL". */
  name?: string;
  /** Defaults to `md`. */
  size?: AvatarSize;
  /** Small status dot, bottom-right. Omit to hide it entirely. */
  status?: AvatarStatus;
  /** Adds a 2px ring for highlighting — `purple` (default, "important member") or `teal`
   * (the sidebar/drawer profile section's own-account highlight). */
  ring?: boolean;
  ringColor?: AvatarRingColor;
  className?: string;
  /** Overrides `size`'s fixed classes with an exact pixel size — needed anywhere the
   * dimension is computed at runtime (e.g. a responsive avatar), since NativeWind can't
   * statically generate styles for a dynamic arbitrary-value className. */
  style?: StyleProp<ViewStyle>;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
};

const initialsTextClasses: Record<AvatarSize, string> = {
  sm: 'text-[11px]',
  md: 'text-sm',
  lg: 'text-lg',
  xl: 'text-2xl',
};

const statusDotClasses: Record<AvatarSize, string> = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-3.5 w-3.5',
};

const ringColorClasses: Record<AvatarRingColor, string> = {
  purple: 'border-deep-purple',
  teal: 'border-tide-teal',
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return initials || '?';
}

/** Circular user avatar with image/initials fallback, status dot, and optional highlight ring. */
export function Avatar({ source, name, size = 'md', status, ring = false, ringColor = 'purple', className, style }: AvatarProps) {
  const themeColors = useThemeColors();
  // Resets whenever `source` itself changes (e.g. the user picks a new avatar after a
  // previous one failed) — without keying off source, a once-failed image would stay stuck
  // showing initials even after being replaced with a working URL.
  const [failedSource, setFailedSource] = useState<string | undefined>(undefined);
  const showImage = Boolean(source) && source !== failedSource;
  const statusColors: Record<AvatarStatus, string> = {
    online: themeColors.status.success,
    offline: themeColors.text.disabled,
    busy: themeColors.status.warning,
  };

  return (
    <View className={cn('relative', sizeClasses[size], className)} style={style}>
      <View
        className={cn(
          'h-full w-full items-center justify-center overflow-hidden rounded-full bg-tide-teal',
          ring && 'border-2',
          ring && ringColorClasses[ringColor],
        )}
      >
        {showImage ? (
          <Image
            source={{ uri: source }}
            className="h-full w-full"
            resizeMode="cover"
            onError={() => setFailedSource(source)}
          />
        ) : (
          <RNText className={cn('font-semibold text-inverse', initialsTextClasses[size])}>
            {getInitials(name)}
          </RNText>
        )}
      </View>

      {status && (
        <View
          className={cn('absolute bottom-0 right-0 rounded-full border-2 border-base', statusDotClasses[size])}
          style={{ backgroundColor: statusColors[status] }}
        />
      )}
    </View>
  );
}
