import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../utils/cn';
import { shadows } from '../../utils/theme';
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

// Web-only pseudo-classes (hover:) are simply inert on native — there's no hover concept
// on a touchscreen — so it's safe to add them unconditionally for the web polish they ask for.
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-tide-teal hover:bg-tide-teal-dark',
  secondary: 'bg-base border border-default hover:border-tide-teal hover:bg-elevated',
  ghost: 'bg-transparent hover:bg-elevated',
  danger: 'bg-error hover:bg-[#DC2626]',
};

const textColorClasses: Record<ButtonVariant, string> = {
  primary: 'text-inverse',
  secondary: 'text-tide-teal',
  ghost: 'text-muted group-hover:text-primary',
  danger: 'text-inverse',
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
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');

  // primary/danger labels sit on a solid brand-colored fill (unchanged by theme), so they
  // stay white in both themes; only ghost's muted tone actually shifts with theme.
  const spinnerColors: Record<ButtonVariant, string> = {
    primary: themeColors.text.inverse,
    secondary: themeColors.brand.tideTeal,
    ghost: themeColors.text.muted,
    danger: themeColors.text.inverse,
  };

  // Only primary/danger get a permanent colored glow — secondary/ghost stay flat so the
  // glow reads as "this is the important action" rather than decorating every button.
  // Dark mode gets the more dramatic glow variant per the design spec.
  const variantShadow: Partial<Record<ButtonVariant, object>> = {
    primary: isDark ? shadows.glowTealDark : shadows.glowTeal,
    danger: isDark ? shadows.glowErrorDark : shadows.glowError,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={cn(
        'group flex-row items-center justify-center rounded-xl',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth ? 'w-full' : 'self-start',
        isDisabled && 'opacity-50',
        className,
      )}
      style={({ pressed }) => [
        !isDisabled && variantShadow[variant],
        pressed && !isDisabled && { transform: [{ scale: 0.98 }] },
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
