import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useTranslation, type TranslationKey } from '../../i18n';
import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../utils/cn';
import { gradientDirections, gradients } from '../../utils/gradients';
import { getSidebarNavPalette } from '../../utils/sidebarNavTheme';
import { soundManager } from '../../utils/soundManager';
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
  /** Tiny aurora pill after the label (e.g. "AI") — for the one or two items worth calling out. */
  badge?: string;
  /** Never shows the active state — for a secondary shortcut (the Sidebar's "Settings")
   * that points at the same route as a primary item, so only one of them lights up. */
  noActiveState?: boolean;
}

export interface NavSection {
  label: string;
  labelKey?: TranslationKey;
  items: NavItemConfig[];
}

/** Shared between the persistent/collapsed Sidebar and the mobile drawer, grouped so a long
 * flat list reads as a few short, scannable blocks. */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    labelKey: 'nav.section.workspace',
    items: [
      { href: '/', label: 'Dashboard', labelKey: 'nav.dashboard', icon: 'Home' },
      { href: '/timer', label: 'Timer', labelKey: 'nav.timer', icon: 'Clock' },
      { href: '/tasks', label: 'Tasks', labelKey: 'nav.tasks', icon: 'CheckSquare' },
      { href: '/activities', label: 'Activities', labelKey: 'nav.activities', icon: 'Layers' },
      { href: '/journal', label: 'Journal', labelKey: 'nav.journal', icon: 'Book' },
    ],
  },
  {
    label: 'Growth',
    labelKey: 'nav.section.growth',
    items: [
      { href: '/insights', label: 'Insights', labelKey: 'nav.insights', icon: 'BarChart3' },
      { href: '/chat', label: 'AI Coach', labelKey: 'nav.aiCoach', icon: 'Sparkles', badge: 'AI' },
      { href: '/profile', label: 'Profile', labelKey: 'nav.profile', icon: 'User' },
    ],
  },
];

/** Flat list of every primary destination, in display order. */
export const NAV_ITEMS: NavItemConfig[] = NAV_SECTIONS.flatMap((section) => section.items);

export interface NavItemProps {
  item: NavItemConfig;
  /** Icons-only rail (tablet / collapsed desktop sidebar) — shows a hover tooltip instead of an inline label. */
  collapsed?: boolean;
  onNavigate?: () => void;
  /** Position within the list — only used to stagger `animateIn`. */
  index?: number;
  /** Fade-in on mount. Only the mobile drawer opts in (it mounts fresh on every open); the
   * persistent Sidebar is re-mounted on every screen change, so animating it there would
   * make the whole nav flicker on each navigation. */
  animateIn?: boolean;
}

const HOVER_DURATION = 150;
const ENTRANCE_DURATION = 260;
const ENTRANCE_STAGGER_MS = 25;
const CHIP_SIZE = 30;

export function NavItem({ item, collapsed = false, onNavigate, index = 0, animateIn = false }: NavItemProps) {
  const pathname = usePathname();
  const isActive =
    !item.noActiveState && (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href));
  const [isHovered, setIsHovered] = useState(false);
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const palette = getSidebarNavPalette(isDark);
  const { t } = useTranslation();
  const label = item.labelKey ? t(item.labelKey) : item.label;

  // onHoverIn/Out only ever fire on web (pointer devices). The hover state is a pure color
  // fade — nothing moves, scales, or changes letter-spacing, so the row never shifts.
  const hoverProgress = useSharedValue(0);
  const entrance = useSharedValue(animateIn ? 0 : 1);

  useEffect(() => {
    if (!animateIn) return;
    entrance.value = withDelay(
      index * ENTRANCE_STAGGER_MS,
      withTiming(1, { duration: ENTRANCE_DURATION, easing: Easing.out(Easing.cubic) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    hoverProgress.value = withTiming(isHovered ? 1 : 0, { duration: HOVER_DURATION, easing: Easing.out(Easing.ease) });
  }, [isHovered, hoverProgress]);

  const handlePress = () => {
    soundManager.play('tap');
    router.push(item.href as Href);
    onNavigate?.();
  };

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateX: (1 - entrance.value) * -8 }],
  }));
  const hoverOverlayStyle = useAnimatedStyle(() => ({ opacity: isActive ? 0 : hoverProgress.value }));

  const iconColor = isActive ? '#FFFFFF' : isHovered ? palette.navActiveText : palette.navDefaultText;
  const textColor = isActive || isHovered ? palette.navActiveText : palette.navDefaultText;

  const chip = (size: number, radius: number, iconSize: number) => (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }} className="items-center justify-center">
      {isActive && (
        <LinearGradient
          colors={[...gradients.aurora]}
          {...gradientDirections.diagonal}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
      )}
      {/* Own View so it stacks above the absolutely-positioned gradient on web, where a
          non-positioned sibling would otherwise paint underneath it. */}
      <View>
        <Icon name={item.icon} size={iconSize} color={iconColor} />
      </View>
    </View>
  );

  if (collapsed) {
    return (
      <Animated.View style={entranceStyle}>
        <Tooltip label={label} visible={isHovered}>
          <Pressable
            onPress={handlePress}
            onHoverIn={() => setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
            accessibilityRole="link"
            accessibilityLabel={label}
            className="h-11 w-11 items-center justify-center rounded-xl"
          >
            <Animated.View
              pointerEvents="none"
              className="absolute inset-0 rounded-xl"
              style={[{ backgroundColor: palette.navHoverBg }, hoverOverlayStyle]}
            />
            {chip(40, 12, 19)}
          </Pressable>
        </Tooltip>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={entranceStyle}>
      <Pressable
        onPress={handlePress}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        accessibilityRole="link"
        accessibilityLabel={label}
        className="relative flex-row items-center gap-3 rounded-xl border px-2 py-1.5"
        style={{
          backgroundColor: isActive ? palette.navActiveBg : 'transparent',
          borderColor: isActive ? palette.navActiveBorder : 'transparent',
        }}
      >
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0 rounded-xl"
          style={[{ backgroundColor: palette.navHoverBg }, hoverOverlayStyle]}
        />

        {chip(CHIP_SIZE, 9, 17)}

        <Text
          variant="body"
          className={cn('flex-1 font-medium', isActive && 'font-semibold')}
          style={{ color: textColor }}
          numberOfLines={1}
        >
          {label}
        </Text>

        {item.badge && (
          <View className="overflow-hidden rounded-md px-1.5 py-0.5">
            <LinearGradient
              colors={[...gradients.aurora]}
              {...gradientDirections.horizontal}
              style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: isActive ? 1 : 0.9 }}
            />
            <Text variant="label" className="tracking-wider" style={{ color: '#FFFFFF', fontSize: 9 }}>
              {item.badge}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** Small uppercase group heading between nav sections. Collapses to a short divider in the
 * icon rail, where there's no room for text. */
export function NavSectionLabel({ label, collapsed = false }: { label: string; collapsed?: boolean }) {
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const palette = getSidebarNavPalette(isDark);

  if (collapsed) {
    return <View className="my-2 h-px w-6 self-center" style={{ backgroundColor: palette.divider }} />;
  }

  return (
    <Text variant="label" className="mb-1 mt-4 px-2.5" style={{ color: palette.sectionLabel, letterSpacing: 1.2 }}>
      {label}
    </Text>
  );
}
