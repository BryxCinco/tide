import { Image, Text as RNText, View } from 'react-native';

import { cn } from '../../utils/cn';
import { colors } from '../../utils/theme';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'offline' | 'busy';

export interface AvatarProps {
  /** Image URI. Falls back to initials when omitted or the image fails to load. */
  source?: string;
  /** Used to derive the initials fallback, e.g. "Ada Lovelace" -> "AL". */
  name?: string;
  /** Defaults to `md`. */
  size?: AvatarSize;
  /** Small status dot, bottom-right. Omit to hide it entirely. */
  status?: AvatarStatus;
  /** Adds a 2px deep-purple ring for highlighting important members. */
  ring?: boolean;
  className?: string;
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

const statusColors: Record<AvatarStatus, string> = {
  online: colors.status.success,
  offline: colors.text.disabled,
  busy: colors.status.warning,
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
export function Avatar({ source, name, size = 'md', status, ring = false, className }: AvatarProps) {
  return (
    <View className={cn('relative', sizeClasses[size], className)}>
      <View
        className={cn(
          'h-full w-full items-center justify-center overflow-hidden rounded-full bg-tide-teal',
          ring && 'border-2 border-deep-purple',
        )}
      >
        {source ? (
          <Image source={{ uri: source }} className="h-full w-full" resizeMode="cover" />
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
