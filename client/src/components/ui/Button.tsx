import { useState } from 'react';
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
import { soundManager } from '../../utils/soundManager';
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

/** Primary call-to-action control with solid/outline/ghost/danger variants. Grows slightly
 * and its glow intensifies on hover (web), and settles with a quick squash on press — both
 * layered on top of the existing per-variant hover background/border className swaps,
 * not replacing them. */
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
  const [isHovered, setIsHovered] = useState(false);

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
  // Dark mode gets the more dramatic glow variant per the design spec. Hovering intensifies
  // it further (bigger radius, higher opacity) — an `onHoverIn`/`onHoverOut` boolean rather
  // than a CSS-only trick, since RN's shadow* props are inline style, not classNames a
  // `hover:` variant can target.
  const restShadow: Partial<Record<ButtonVariant, object>> = {
    primary: isDark ? shadows.glowTealDark : shadows.glowTeal,
    danger: isDark ? shadows.glowErrorDark : shadows.glowError,
  };
  const hoverShadow: Partial<Record<ButtonVariant, object>> = {
    primary: { ...restShadow.primary, shadowOpacity: isDark ? 0.65 : 0.4, shadowRadius: isDark ? 32 : 20 },
    danger: { ...restShadow.danger, shadowOpacity: isDark ? 0.55 : 0.35, shadowRadius: isDark ? 28 : 18 },
  };
  const activeShadow = isHovered ? hoverShadow[variant] : restShadow[variant];

  const handlePress = (event: GestureResponderEvent) => {
    // Every Button in the app plays this — the one shared tap point that gives the whole
    // UI a consistent "click" the same way a native OS's system button sound would,
    // without needing to wire it into dozens of individual Pressables by hand.
    soundManager.play('tap');
    onPress?.(event);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      className={cn(
        'group flex-row items-center justify-center rounded-xl transition-transform duration-200',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth ? 'w-full' : 'self-start',
        !isDisabled && 'hover:scale-[1.02]',
        isDisabled && 'opacity-50',
        className,
      )}
      style={({ pressed }) => [
        !isDisabled && activeShadow,
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
