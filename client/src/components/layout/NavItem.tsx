import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTranslation, type TranslationKey } from '../../i18n';
import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../utils/cn';
import { getSidebarNavPalette } from '../../utils/sidebarNavTheme';
import { Icon, Text, Tooltip, type IconName } from '../ui';

export interface NavItemConfig {
  href: string;
  /** English fallback — used verbatim if `labelKey` has no translation for the current
   * language (see translate() in i18n/index.ts), and as-is for items with no labelKey. */
  label: string;
  /** Resolved through useTranslation() when present. Not every item has one — full nav
   * translation only covers the items translations.ts actually lists strings for. */
  labelKey?: TranslationKey;
  icon: IconName;
}

/** Shared between the persistent/collapsed Sidebar and the mobile drawer. */
export const NAV_ITEMS: NavItemConfig[] = [
  { href: '/', label: 'Dashboard', labelKey: 'nav.dashboard', icon: 'Home' },
  { href: '/timer', label: 'Timer', labelKey: 'nav.timer', icon: 'Clock' },
  { href: '/journal', label: 'Journal', labelKey: 'nav.journal', icon: 'Book' },
  { href: '/tasks', label: 'Tasks', labelKey: 'nav.tasks', icon: 'CheckSquare' },
  { href: '/activities', label: 'Activities', labelKey: 'nav.activities', icon: 'Layers' },
  { href: '/insights', label: 'Insights', labelKey: 'nav.insights', icon: 'BarChart3' },
  { href: '/chat', label: 'AI Coach', labelKey: 'nav.aiCoach', icon: 'Sparkles' },
  { href: '/profile', label: 'Profile', labelKey: 'nav.profile', icon: 'User' },
];

export interface NavItemProps {
  item: NavItemConfig;
  /** Icons-only rail (tablet collapsed sidebar) — shows a hover tooltip instead of an inline label. */
  collapsed?: boolean;
  onNavigate?: () => void;
}

const HOVER_DURATION = 200;
const PULSE_MIN_OPACITY = 0.95;

export function NavItem({ item, collapsed = false, onNavigate }: NavItemProps) {
  const pathname = usePathname();
  const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
  const [isHovered, setIsHovered] = useState(false);
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const palette = getSidebarNavPalette(isDark);
  const { t } = useTranslation();
  const label = item.labelKey ? t(item.labelKey) : item.label;

  // onHoverIn/Out only ever fire on web (pointer devices) — a no-op on touch, so this is
  // safe to wire up unconditionally rather than branching on Platform.OS.
  const hoverProgress = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    // 200ms ease-out for every hover/active transition per spec — this same shared value
    // drives the row's hover-tint overlay opacity below, not just the translateX/scale.
    hoverProgress.value = withTiming(isHovered ? 1 : 0, { duration: HOVER_DURATION, easing: Easing.out(Easing.ease) });
  }, [isHovered, hoverProgress]);

  useEffect(() => {
    if (!isActive) {
      pulse.value = 1;
      return;
    }
    // Slower, more dramatic breathing in dark mode, per the design spec.
    pulse.value = withRepeat(
      withTiming(PULSE_MIN_OPACITY, { duration: isDark ? 4000 : 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [isActive, isDark, pulse]);

  const handlePress = () => {
    router.push(item.href as Href);
    onNavigate?.();
  };

  const activePulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const hoverOverlayStyle = useAnimatedStyle(() => ({ opacity: isActive ? 0 : hoverProgress.value }));
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: collapsed ? 0 : hoverProgress.value * 2 }],
  }));
  const iconScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + hoverProgress.value * 0.1 }],
  }));

  // Icon color always matches the label's text color (spec: "icon color matches text
  // color") — default state is text-secondary-equivalent (readable, not muted), not the
  // app's dimmer text-muted token, so idle nav items stay clearly legible.
  const textAndIconColor = isActive || isHovered ? palette.navAccentText : palette.navDefaultText;

  if (collapsed) {
    return (
      <Tooltip label={label} visible={isHovered}>
        <Pressable
          onPress={handlePress}
          onHoverIn={() => setIsHovered(true)}
          onHoverOut={() => setIsHovered(false)}
          className="h-11 w-11 items-center justify-center rounded-xl"
        >
          {isActive && (
            <Animated.View
              pointerEvents="none"
              className="absolute inset-0 rounded-xl"
              style={[{ backgroundColor: palette.navActiveBg }, palette.navActiveGlow, activePulseStyle]}
            />
          )}
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0 rounded-xl"
            style={[{ backgroundColor: palette.navHoverBg }, palette.navHoverGlow, hoverOverlayStyle]}
          />
          <Animated.View style={iconScaleStyle} className="shrink-0">
            <Icon name={item.icon} size={20} color={textAndIconColor} />
          </Animated.View>
        </Pressable>
      </Tooltip>
    );
  }

  return (
    <Pressable onPress={handlePress} onHoverIn={() => setIsHovered(true)} onHoverOut={() => setIsHovered(false)}>
      <Animated.View style={rowStyle} className="relative flex-row items-center gap-3 rounded-xl px-4 py-3">
        {isActive && (
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0 rounded-xl"
            style={[{ backgroundColor: palette.navActiveBg }, palette.navActiveGlow, activePulseStyle]}
          />
        )}
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 rounded-xl"
          style={[{ backgroundColor: palette.navHoverBg }, palette.navHoverGlow, hoverOverlayStyle]}
        />
        {isActive && (
          <View
            pointerEvents="none"
            className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full"
            style={[{ backgroundColor: palette.navAccentBar }, palette.navAccentBarGlow]}
          />
        )}

        <Animated.View style={iconScaleStyle} className="shrink-0">
          <Icon name={item.icon} size={20} color={textAndIconColor} />
        </Animated.View>
        <Text
          variant="body"
          className={cn('shrink text-base font-medium', isActive && 'font-semibold')}
          style={{ color: textAndIconColor, letterSpacing: isHovered ? 0.2 : 0 }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
