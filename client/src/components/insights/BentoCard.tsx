import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeInUp } from 'react-native-reanimated';

import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../utils/cn';
import { shadows } from '../../utils/theme';
import { Icon, Text, type IconName } from '../ui';

export type BentoCardSize = 'sm' | 'md' | 'lg' | 'wide' | 'tall' | 'hero';

export interface BentoCardProps {
  title?: string;
  icon?: IconName;
  size?: BentoCardSize;
  children: ReactNode;
  className?: string;
}

/**
 * Grid-span classes are web-correct (react-native-web compiles Tailwind's grid utilities
 * to real CSS grid) but have no native equivalent — Yoga (RN's layout engine) doesn't
 * implement CSS Grid at all, only Flexbox. On native, these classes are silently ignored
 * and cards fall back to simple document-order stacking — not broken, just not the
 * spanning bento layout. Since this app's tablet/desktop story has been built and tested
 * entirely through the web target so far, that tradeoff is deliberate; the base (no
 * prefix, mobile) classes stay pure single-column stacking, which is identical on every
 * platform regardless.
 */
const SIZE_CLASSES: Record<BentoCardSize, string> = {
  sm: 'md:col-span-1 lg:col-span-1',
  md: 'md:col-span-1 lg:col-span-2',
  lg: 'md:col-span-2 lg:col-span-4',
  wide: 'md:col-span-2 lg:col-span-2',
  tall: 'lg:row-span-2',
  hero: 'md:col-span-2 lg:col-span-2 lg:row-span-2',
};

/** Shared bento-grid tile — title/icon header (optional) + content. Background is an
 * explicit isDark check rather than a `bg-*` token, since the spec's "white (light) /
 * bg-surface (dark)" pairing doesn't match any single existing CSS-var token (bg-base is
 * white in both roles it's used for, bg-surface differs by theme but isn't white in
 * light mode) — same asymmetric-pairing pattern used for the search bar earlier. */
export function BentoCard({ title, icon, size = 'md', children, className }: BentoCardProps) {
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');

  return (
    <Animated.View
      // `flex-1` so a card actually fills its grid row's height (CSS grid's default
      // align-items:stretch sizes the *cell*, but this View's own children still need
      // flex-1 to expand into it) — content that doesn't naturally fill the row (e.g.
      // TotalHoursCard) otherwise stays top-pinned with dead space below, which is what
      // made "Tracked Time" look broken next to the taller Productivity Score hero card.
      className={cn('flex-1 gap-4 overflow-hidden rounded-2xl border border-subtle p-6', SIZE_CLASSES[size], className)}
      style={[{ backgroundColor: isDark ? themeColors.background.surface : '#FFFFFF' }, shadows.sm]}
      entering={FadeInUp.duration(420).easing(Easing.out(Easing.cubic))}
    >
      {title && (
        <View className="flex-row items-center gap-2">
          {icon && <Icon name={icon} size={18} color={themeColors.brand.tideTeal} />}
          <Text variant="h3" color="primary">
            {title}
          </Text>
        </View>
      )}
      {children}
    </Animated.View>
  );
}
