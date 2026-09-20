import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { cn } from '../../utils/cn';
import { colors, shadows } from '../../utils/theme';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  /** Visual style. Defaults to `primary`. */
  variant?: ButtonVariant;
  /** Height/padding/text-size scale. Defaults to `md`. */
  size?: ButtonSize;
  disabled?: boolean;
  /** Shows a spinner in place of the title/icon and blocks interaction. */
  loading?: boolean;
  /** Lucide icon name rendered alongside the title. */
  icon?: IconName;
  /** Side the icon renders on. Defaults to `left`. */
  iconPosition?: 'left' | 'right';
  /** Stretches the button to fill its container's width. */
  fullWidth?: boolean;
  className?: string;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3',
  md: 'h-10 px-4',
  lg: 'h-12 px-6',
};

const textSizeClasses: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

const iconSizes: Record<ButtonSize, number> = {
  sm: 16,
  md: 18,
  lg: 20,
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-tide-teal',
  secondary: 'bg-transparent border border-tide-teal hover:bg-tide-teal/10',
  ghost: 'bg-transparent hover:bg-subtle',
  danger: 'bg-error',
};

const textColorClasses: Record<ButtonVariant, string> = {
  primary: 'text-inverse',
  secondary: 'text-tide-teal',
  ghost: 'text-muted',
  danger: 'text-inverse',
};

const spinnerColors: Record<ButtonVariant, string> = {
  primary: colors.text.inverse,
  secondary: colors.brand.tideTeal,
  ghost: colors.text.muted,
  danger: colors.text.inverse,
};

/** Primary call-to-action control with solid/outline/ghost/danger variants. */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center rounded-md',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth ? 'w-full' : 'self-start',
        isDisabled && 'opacity-50',
        className,
      )}
      style={({ pressed }) => [
        variant === 'primary' && shadows.sm,
        pressed && !isDisabled && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColors[variant]} size="small" />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {icon && iconPosition === 'left' && (
            <Icon name={icon} size={iconSizes[size]} color={spinnerColors[variant]} />
          )}
          <Text className={cn('font-semibold', textSizeClasses[size], textColorClasses[variant])}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Icon name={icon} size={iconSizes[size]} color={spinnerColors[variant]} />
          )}
        </View>
      )}
    </Pressable>
  );
}
