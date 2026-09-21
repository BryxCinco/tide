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

import { useThemeColors } from '../../hooks/useThemeColors';
import { useThemeStore } from '../../store/themeStore';
import { cn } from '../../utils/cn';
import { hexToRgba } from '../../utils/color';
import { Icon, Text, Tooltip, type IconName } from '../ui';

export interface NavItemConfig {
  href: string;
  label: string;
  icon: IconName;
}

/** Shared between the persistent/collapsed Sidebar and the mobile drawer. */
export const NAV_ITEMS: NavItemConfig[] = [
  { href: '/', label: 'Dashboard', icon: 'Home' },
  { href: '/timer', label: 'Timer', icon: 'Clock' },
  { href: '/journal', label: 'Journal', icon: 'Book' },
  { href: '/tasks', label: 'Tasks', icon: 'CheckSquare' },
  { href: '/activities', label: 'Activities', icon: 'Layers' },
  { href: '/insights', label: 'Insights', icon: 'BarChart3' },
  { href: '/profile', label: 'Profile', icon: 'User' },
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
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');

  // onHoverIn/Out only ever fire on web (pointer devices) — a no-op on touch, so this is
  // safe to wire up unconditionally rather than branching on Platform.OS.
  const hoverProgress = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
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

  const glowStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: collapsed ? 0 : hoverProgress.value * 2 }],
  }));
  const iconScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + hoverProgress.value * 0.1 }],
  }));

  const iconColor = isActive || isHovered ? themeColors.brand.tideTeal : themeColors.text.muted;
  const textColor = isActive ? 'accent' : isHovered ? 'primary' : 'secondary';

  // Active/hover glow shadows — dramatically more luminous in dark mode per spec.
  const activeGlow = isDark
    ? {
        shadowColor: themeColors.brand.tideTeal,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 8,
      }
    : {
        shadowColor: themeColors.brand.tideTeal,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
      };
  const hoverGlow = isDark
    ? {
        shadowColor: themeColors.brand.tideTeal,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 5,
      }
    : {
        shadowColor: themeColors.brand.tideTeal,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      };

  if (collapsed) {
    return (
      <Tooltip label={item.label} visible={isHovered}>
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
              style={[{ backgroundColor: hexToRgba(themeColors.brand.tideTeal, isDark ? 0.15 : 0.08) }, activeGlow, glowStyle]}
            />
          )}
          {!isActive && isHovered && (
            <View
              pointerEvents="none"
              className="absolute inset-0 rounded-xl"
              style={[{ backgroundColor: hexToRgba(themeColors.brand.tideTeal, isDark ? 0.1 : 0.05) }, hoverGlow]}
            />
          )}
          <Animated.View style={iconScaleStyle} className="shrink-0">
            <Icon name={item.icon} size={20} color={iconColor} />
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
            style={[{ backgroundColor: hexToRgba(themeColors.brand.tideTeal, isDark ? 0.15 : 0.08) }, activeGlow, glowStyle]}
          />
        )}
        {!isActive && isHovered && (
          <View
            pointerEvents="none"
            className="absolute inset-0 rounded-xl"
            style={[{ backgroundColor: hexToRgba(themeColors.brand.tideTeal, isDark ? 0.1 : 0.05) }, hoverGlow]}
          />
        )}
        {isActive && (
          <View
            pointerEvents="none"
            className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full"
            style={{ backgroundColor: themeColors.brand.tideTeal }}
          />
        )}

        <Animated.View style={iconScaleStyle} className="shrink-0">
          <Icon name={item.icon} size={20} color={iconColor} />
        </Animated.View>
        <Text
          variant="body"
          color={textColor}
          className={cn('shrink text-base font-medium', isActive && 'font-semibold')}
          style={{ letterSpacing: isHovered ? 0.2 : 0 }}
          numberOfLines={1}
        >
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
