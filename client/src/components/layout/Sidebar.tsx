import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Fragment, useEffect, useState } from 'react';
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
import { NAV_SECTIONS, NavItem, NavSectionLabel } from './NavItem';
import { SidebarLogo } from './SidebarLogo';

export interface SidebarProps {
  /** Forced by breakpoint (tablet rail) — always icons-only, no manual toggle. Desktop's
   * own collapse is a separate, user-controlled, persisted preference (see uiStore). */
  collapsed?: boolean;
}

/** Gap between the floating panel and the window's left/top/bottom edges. */
export const SIDEBAR_GUTTER = 12;
/** Outer widths, gutter included — SidebarCollapseToggle sits exactly on the panel's right edge. */
export const SIDEBAR_EXPANDED_WIDTH = SIDEBAR_GUTTER + 248;
export const SIDEBAR_COLLAPSED_WIDTH = SIDEBAR_GUTTER + 68;
export const SIDEBAR_WIDTH_ANIM_DURATION = 240;

/**
 * Persistent left-hand navigation for tablet/desktop — a floating rounded panel inset from
 * the window edge rather than a full-height strip glued to it. Fixed top (brand), a
 * scrolling middle (grouped nav), and a fixed bottom (settings + account card), so at any
 * zoom level or short viewport the nav scrolls instead of overlapping.
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

  const width = useSharedValue(collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH);
  useEffect(() => {
    width.value = withTiming(collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH, {
      duration: SIDEBAR_WIDTH_ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [collapsed, width]);
  const widthStyle = useAnimatedStyle(() => ({ width: width.value }));

  const confirmLogout = async () => {
    setLogoutVisible(false);
    await logout();
    router.replace('/(auth)/login');
  };

  // Single source of truth (shared with NavItem.tsx and MobileDrawer.tsx) — see sidebarNavTheme.ts.
  const palette = getSidebarNavPalette(isDark);
  const teal = themeColors.brand.tideTeal;

  return (
    <Animated.View
      style={[widthStyle, { paddingLeft: SIDEBAR_GUTTER, paddingVertical: SIDEBAR_GUTTER }]}
      className="h-full"
    >
      <View
        className="flex-1 rounded-[22px] border"
        style={[{ backgroundColor: palette.background, borderColor: palette.borderColor }, palette.panelShadow]}
      >
        {/* Aurora wash behind the brand mark — the panel's one decorative flourish. */}
        <View className="absolute inset-x-0 top-0 h-36 overflow-hidden rounded-t-[22px]" pointerEvents="none">
          <LinearGradient
            colors={[hexToRgba(teal, isDark ? 0.14 : 0.08), hexToRgba('#6366F1', isDark ? 0.05 : 0.025), 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>

        {/* FIXED TOP — brand mark. */}
        <View className={cn('shrink-0 pb-2 pt-6', collapsed ? 'items-center' : 'px-5')}>
          {collapsed ? (
            <SidebarLogo collapsed />
          ) : (
            <View>
              <SidebarLogo width={104} />
              <Text variant="label" className="mt-1.5" style={{ color: palette.sectionLabel, letterSpacing: 1.2 }}>
                Productivity Coach
              </Text>
            </View>
          )}
        </View>

        {/* SCROLLABLE MIDDLE — grouped nav. The only section that can overflow. */}
        <ScrollView
          className={cn('sidebar-scrollbar flex-1', collapsed ? 'px-0' : 'px-3')}
          contentContainerClassName={cn('gap-0.5 pb-3', collapsed && 'items-center')}
          showsVerticalScrollIndicator={false}
        >
          {NAV_SECTIONS.map((section) => (
            <Fragment key={section.label}>
              <NavSectionLabel label={section.labelKey ? t(section.labelKey) : section.label} collapsed={collapsed} />
              {section.items.map((item) => (
                <NavItem key={item.href} item={item} collapsed={collapsed} />
              ))}
            </Fragment>
          ))}
        </ScrollView>

        {/* FIXED BOTTOM — settings, then the account card (profile, theme, log out). */}
        <View className={cn('shrink-0 gap-2 pb-3 pt-2', collapsed ? 'items-center px-0' : 'px-3')}>
          <View className="mb-1 h-px" style={{ backgroundColor: palette.divider, width: collapsed ? 32 : undefined }} />

          <NavItem item={{ href: '/profile', label: 'Settings', labelKey: 'nav.settings', icon: 'Settings', noActiveState: true }} collapsed={collapsed} />

          {collapsed ? (
            <View className="items-center gap-2 pt-1">
              <ThemeToggle collapsed />
              <Tooltip label={t('nav.logout')} visible={logoutHovered}>
                <Pressable
                  onPress={() => setLogoutVisible(true)}
                  onHoverIn={() => setLogoutHovered(true)}
                  onHoverOut={() => setLogoutHovered(false)}
                  accessibilityLabel={t('nav.logout')}
                  className="h-10 w-10 items-center justify-center rounded-xl hover:bg-error/10"
                >
                  <Icon name="LogOut" size={18} color={themeColors.status.error} />
                </Pressable>
              </Tooltip>
              <Pressable onPress={() => router.push('/(tabs)/profile')} className="mt-1">
                <Avatar name={user?.name} source={user?.avatar} style={{ width: 36, height: 36 }} />
              </Pressable>
            </View>
          ) : (
            <View className="rounded-2xl border p-2.5" style={{ borderColor: palette.borderColor, backgroundColor: palette.navHoverBg }}>
              <View className="flex-row items-center gap-2.5">
                <Pressable
                  onPress={() => router.push('/(tabs)/profile')}
                  className="flex-1 flex-row items-center gap-2.5"
                  style={{ minWidth: 0 }}
                >
                  <Avatar name={user?.name} source={user?.avatar} style={{ width: 36, height: 36 }} />
                  <View className="flex-1" style={{ minWidth: 0 }}>
                    <Text variant="body" color="primary" className="text-[14px] font-semibold" numberOfLines={1}>
                      {user?.name ?? 'Demo User'}
                    </Text>
                    <Text variant="body" color="muted" className="text-[12px]" numberOfLines={1}>
                      {user?.email ?? 'Browsing in demo mode'}
                    </Text>
                  </View>
                </Pressable>
                <Tooltip label={t('nav.logout')} visible={logoutHovered}>
                  <Pressable
                    onPress={() => setLogoutVisible(true)}
                    onHoverIn={() => setLogoutHovered(true)}
                    onHoverOut={() => setLogoutHovered(false)}
                    accessibilityLabel={t('nav.logout')}
                    className="h-8 w-8 items-center justify-center rounded-lg hover:bg-error/10"
                  >
                    <Icon name="LogOut" size={16} color={themeColors.text.muted} />
                  </Pressable>
                </Tooltip>
              </View>

              <View className="mt-2.5 flex-row items-center justify-between border-t pl-1 pt-2.5" style={{ borderColor: palette.divider }}>
                <Text variant="body" color="muted" className="text-[12px] font-medium">
                  {t('nav.theme')}
                </Text>
                <ThemeToggle />
              </View>
            </View>
          )}
        </View>
      </View>

      <LogoutModal visible={logoutVisible} onClose={() => setLogoutVisible(false)} onConfirm={confirmLogout} />
    </Animated.View>
  );
}
