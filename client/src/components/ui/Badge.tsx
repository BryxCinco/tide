import { Text as RNText, View } from 'react-native';

import { cn } from '../../utils/cn';

export type BadgeVariant = 'default' | 'teal' | 'blue' | 'purple' | 'success' | 'warning' | 'error';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  label: string;
  /** Tint. Defaults to `default` (neutral gray). */
  variant?: BadgeVariant;
  /** Defaults to `md`. */
  size?: BadgeSize;
  /** Renders a small leading dot in the variant's color. */
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  default: { bg: 'bg-hover', text: 'text-secondary', dot: 'bg-gray-400' },
  teal: { bg: 'bg-tide-teal/15', text: 'text-tide-teal', dot: 'bg-tide-teal' },
  blue: { bg: 'bg-ocean-blue/15', text: 'text-ocean-blue', dot: 'bg-ocean-blue' },
  purple: { bg: 'bg-deep-purple/15', text: 'text-deep-purple', dot: 'bg-deep-purple' },
  success: { bg: 'bg-success/15', text: 'text-success', dot: 'bg-success' },
  warning: { bg: 'bg-warning/15', text: 'text-warning', dot: 'bg-warning' },
  error: { bg: 'bg-error/15', text: 'text-error', dot: 'bg-error' },
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5',
  md: 'px-2.5 py-1',
};

const textSizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[10px]',
  md: 'text-label',
};

/** Small tinted status/category pill. */
export function Badge({ label, variant = 'default', size = 'md', dot = false, className }: BadgeProps) {
  const tone = variantClasses[variant];

  return (
    <View
      className={cn(
        'flex-row items-center self-start rounded-full',
        tone.bg,
        sizeClasses[size],
        className,
      )}
    >
      {dot && <View className={cn('mr-1 h-1.5 w-1.5 rounded-full', tone.dot)} />}
      <RNText className={cn('font-medium uppercase tracking-wide', textSizeClasses[size], tone.text)}>
        {label}
      </RNText>
    </View>
  );
}
