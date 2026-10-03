import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useAuth } from '../../hooks/useAuth';
import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../i18n';
import { LogoutModal } from '../profile/LogoutModal';
import { useThemeStore } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import { cn } from '../../utils/cn';
import { hexToRgba } from '../../utils/color';
import { getSidebarNavPalette } from '../../utils/sidebarNavTheme';
import { Avatar, Icon, Text, ThemeToggle, Tooltip } from '../ui';
import { NAV_ITEMS, NavItem } from './NavItem';
import { SidebarLogo } from './SidebarLogo';

export interface SidebarProps {
  /** Forced by breakpoint (tablet rail) — always icons-only, no manual toggle. Desktop's
   * own collapse is a separate, user-controlled, persisted preference (see uiStore). */
  collapsed?: boolean;
}

const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 72;
const WIDTH_ANIM_DURATION = 250;

/**
 * Persistent left-hand navigation for tablet/desktop, replacing the bottom tab bar at
 * those widths. Structure is a fixed top (brand + profile), a scrolling middle (nav
 * items), and a fixed bottom (settings/theme/logout) — so at any zoom level or short
 * viewport, items scroll instead of overlapping.
 */
export function Sidebar({ collapsed: forcedCollapsed = false }: SidebarProps) {
  const { user, logout } = useAuth();
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const { isDesktop } = useResponsive();
  const isSidebarCollapsed = useUiStore((s) => s.isSidebarCollapsed);
  const [logoutHovered, setLogoutHovered] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const { t } = useTranslation();

  const collapsed = forcedCollapsed || (isDesktop && isSidebarCollapsed);

  const width = useSharedValue(collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH);
  useEffect(() => {
    width.value = withTiming(collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH, {
      duration: WIDTH_ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [collapsed, width]);
  const widthStyle = useAnimatedStyle(() => ({ width: width.value }));

  const confirmLogout = async () => {
    setLogoutVisible(false);
    await logout();
    router.replace('/(auth)/login');
  };

  // Single source of truth (shared with NavItem.tsx and MobileDrawer.tsx) for the exact
  // background/border/glow values — see sidebarNavTheme.ts.
  const palette = getSidebarNavPalette(isDark);
  const dividerColor = hexToRgba(themeColors.brand.tideTeal, 0.1);

  return (
    <Animated.View
      style={[
        widthStyle,
        { backgroundColor: palette.background, borderRightWidth: 1, borderRightColor: palette.borderColor },
        palette.edgeGlow,
      ]}
      className="h-full"
    >
      <View className="flex-1 flex-col">
        {/* FIXED TOP — brand mark, profile. Generous top padding so the logo has room to
            breathe instead of crowding the sidebar's top edge. */}
        <View className="shrink-0 pt-10">
          <View className="absolute inset-x-0 top-0 h-40" pointerEvents="none">
            <LinearGradient
              colors={[hexToRgba(themeColors.brand.tideTeal, isDark ? 0.1 : 0.04), 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ flex: 1 }}
            />
          </View>

          <View className={cn('px-3', collapsed && 'items-center')}>
            {collapsed ? (
              <SidebarLogo collapsed />
            ) : (
              <View className="px-1">
                <SidebarLogo width={120} />
                <Text variant="caption" color="muted" className="mt-1 normal-case tracking-normal">
                  Productivity Coach
                </Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            className={cn(
              'mt-8 flex-row items-center gap-3 rounded-xl px-2 py-2 hover:bg-elevated',
              collapsed && 'mx-auto justify-center px-0',
            )}
          >
            {!collapsed && (
              <View className="absolute inset-0 rounded-xl" pointerEvents="none">
                <LinearGradient
                  colors={[hexToRgba(themeColors.brand.tideTeal, isDark ? 0.12 : 0.03), 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ flex: 1, borderRadius: 12 }}
                />
              </View>
            )}
            <Avatar
              name={user?.name}
              source={user?.avatar}
              ring
              ringColor="teal"
              style={{ width: collapsed ? 40 : 48, height: collapsed ? 40 : 48 }}
            />
            {!collapsed && (
              <View className="flex-1">
                <Text variant="body" color="primary" className="font-semibold" numberOfLines={1}>
                  {user?.name ?? 'Guest'}
                </Text>
                <Text variant="caption" color="muted" className="normal-case tracking-normal" numberOfLines={1}>
                  {user?.email ?? 'Browsing as guest'}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* SCROLLABLE MIDDLE — nav items. This is the one section that can overflow, so
            it's the only one that scrolls; top/bottom never move. */}
        <ScrollView
          className={cn('sidebar-scrollbar mt-4 flex-1', collapsed ? 'px-0' : 'px-3')}
          contentContainerClassName={cn('gap-1', collapsed ? 'items-center pb-4' : 'pb-4')}
          showsVerticalScrollIndicator={false}
        >
          {NAV_ITEMS.map((item, index) => (
            <NavItem key={item.href} item={item} collapsed={collapsed} index={index} />
          ))}
        </ScrollView>

        {/* FIXED BOTTOM — settings, theme toggle, log out. */}
        <View className={cn('shrink-0 px-3 pb-4 pt-2', collapsed && 'items-center px-0')}>
          <View className="mb-2 h-px" style={{ backgroundColor: dividerColor, width: collapsed ? 40 : undefined }} />

          <NavItem item={{ href: '/profile', label: 'Settings', labelKey: 'nav.settings', icon: 'Settings' }} collapsed={collapsed} />

          {collapsed ? (
            <View className="mt-2 items-center">
              <ThemeToggle collapsed />
            </View>
          ) : (
            <View className="mt-3 flex-row items-center justify-between px-3">
              <Text variant="caption" color="muted" className="normal-case tracking-normal">
                {t('nav.theme')}
              </Text>
              <ThemeToggle />
            </View>
          )}

          {collapsed ? (
            <Tooltip label={t('nav.logout')} visible={logoutHovered}>
              <Pressable
                onPress={() => setLogoutVisible(true)}
                onHoverIn={() => setLogoutHovered(true)}
                onHoverOut={() => setLogoutHovered(false)}
                className="mt-2 h-11 w-11 items-center justify-center rounded-xl hover:bg-error/10"
              >
                <Icon name="LogOut" size={20} color={themeColors.status.error} />
              </Pressable>
            </Tooltip>
          ) : (
            <Pressable
              onPress={() => setLogoutVisible(true)}
              className="mt-3 flex-row items-center gap-3 rounded-xl py-2.5 pl-3 pr-4 hover:bg-error/10"
            >
              <Icon name="LogOut" size={19} color={themeColors.status.error} />
              <Text variant="body" className="font-medium" style={{ color: themeColors.status.error }}>
                {t('nav.logout')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <LogoutModal visible={logoutVisible} onClose={() => setLogoutVisible(false)} onConfirm={confirmLogout} />
    </Animated.View>
  );
}
