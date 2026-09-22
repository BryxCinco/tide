import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, View, type GestureResponderEvent, type ViewStyle } from 'react-native';

import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../utils/cn';
import { gradients } from '../../utils/gradients';
import { soundManager } from '../../utils/soundManager';
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

/** Surface container with default/elevated/glass/gradient/outlined styles. Interactive
 * cards (`onPress` given) lift 3px and pick up a soft teal glow on hover, then settle with
 * a quick squash on press — the same "hover feedback everywhere interactive" the rest of
 * the app's buttons/nav items already do, extended to cards. Non-pressable cards are
 * unaffected: a card that isn't a button shouldn't look clickable. */
export function Card({
  children,
  variant = 'default',
  padding = 'md',
  onPress,
  accentLine = false,
  className,
}: CardProps) {
  const isInteractive = Boolean(onPress);
  const [isHovered, setIsHovered] = useState(false);
  const isDark = useThemeStore((s) => s.theme === 'dark');

  const containerClassName = cn(
    'overflow-hidden rounded-2xl transition-all duration-200',
    variantClasses[variant],
    isInteractive && (variant === 'default' || variant === 'outlined') && 'hover:border-tide-teal/40',
    className,
  );

  const restStyle = variantShadow[variant];
  const hoverGlowStyle: ViewStyle = {
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.35 : 0.18,
    shadowRadius: 20,
    elevation: 10,
  };

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
      <Pressable
        onPress={(event) => {
          soundManager.play('tap');
          onPress(event);
        }}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        className={containerClassName}
        style={({ pressed }) => [
          restStyle,
          isHovered && hoverGlowStyle,
          isHovered && !pressed && { transform: [{ translateY: -3 }] },
          pressed && { transform: [{ scale: 0.99 }] },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View className={containerClassName} style={restStyle}>
      {content}
    </View>
  );
}
