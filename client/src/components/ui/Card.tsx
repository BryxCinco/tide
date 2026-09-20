import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, View, type GestureResponderEvent, type ViewStyle } from 'react-native';

import { cn } from '../../utils/cn';
import { gradients } from '../../utils/gradients';
import { shadows } from '../../utils/theme';

export type CardVariant = 'default' | 'elevated' | 'glass' | 'gradient' | 'outlined';
export type CardPadding = 'sm' | 'md' | 'lg';

export interface CardProps {
  children: ReactNode;
  /** Visual style. Defaults to `default`. */
  variant?: CardVariant;
  /** Inner content padding. Defaults to `md`. */
  padding?: CardPadding;
  /** Makes the card pressable. */
  onPress?: (event: GestureResponderEvent) => void;
  /** Renders a thin teal -> ocean-blue gradient line along the top edge, for hero-style cards. */
  accentLine?: boolean;
  className?: string;
}

const paddingClasses: Record<CardPadding, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-surface border border-subtle',
  elevated: 'bg-elevated',
  glass: 'bg-glass border border-glass',
  gradient: '',
  outlined: 'bg-transparent border border-default',
};

const variantShadow: Partial<Record<CardVariant, ViewStyle>> = {
  elevated: shadows.md,
  glass: shadows.md,
};

/** Surface container with default/elevated/glass/gradient/outlined styles. */
export function Card({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  accentLine = false,
  className,
}: CardProps) {
  const containerClassName = cn('overflow-hidden rounded-2xl', variantClasses[variant], className);
  const containerStyle = variantShadow[variant];

  const content = (
    <>
      {variant === 'gradient' && (
        <View className="absolute inset-0" pointerEvents="none">
          <LinearGradient
            colors={[...gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </View>
      )}

      {accentLine && (
        <View className="absolute left-0 right-0 top-0 h-0.5" pointerEvents="none">
          <LinearGradient
            colors={[...gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </View>
      )}

      <View className={paddingClasses[padding]}>{children}</View>
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className={containerClassName} style={containerStyle}>
        {content}
      </Pressable>
    );
  }

  return (
    <View className={containerClassName} style={containerStyle}>
      {content}
    </View>
  );
}
