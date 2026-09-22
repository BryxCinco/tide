import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../hooks/useAuth';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../i18n';
import { useThemeStore } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import { hexToRgba } from '../../utils/color';
import { getSidebarNavPalette } from '../../utils/sidebarNavTheme';
import { Avatar, Icon, Text, ThemeToggle } from '../ui';
import { NAV_ITEMS, NavItem } from './NavItem';

const MAX_WIDTH = 320;
const CLOSE_DURATION = 200;

/**
 * Slide-in mobile nav — the drawer's own content is only mounted while open, so closing
 * it (backdrop tap, nav, or the swipe below) is an instant unmount rather than an
 * animated exit, matching how Modal.tsx already behaves in this codebase. Shares the
 * Sidebar's signature teal glow (dramatic in dark mode) on its trailing edge.
 */
export function MobileDrawer() {
  const isOpen = useUiStore((s) => s.isDrawerOpen);
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const { user, logout } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const { t } = useTranslation();

  const drawerWidth = Math.min(screenWidth * 0.8, MAX_WIDTH);
  const translateX = useSharedValue(-drawerWidth);

  useEffect(() => {
    if (!isOpen) return;
    translateX.value = -drawerWidth;
    translateX.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });
  }, [isOpen, drawerWidth, translateX]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only allow dragging left (toward closed) — the drawer is already fully open at 0.
      translateX.value = Math.min(0, event.translationX);
    })
    .onEnd((event) => {
      const pastThreshold = event.translationX < -drawerWidth * 0.3 || event.velocityX < -800;
      if (pastThreshold) {
        translateX.value = withTiming(-drawerWidth, { duration: CLOSE_DURATION }, (finished) => {
          if (finished) runOnJS(closeDrawer)();
        });
      } else {
        translateX.value = withTiming(0, { duration: CLOSE_DURATION });
      }
    });

  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  if (!isOpen) return null;

  const handleLogout = () => {
    closeDrawer();
    logout();
    router.replace('/(auth)/login');
  };

  // Same shared palette as Sidebar.tsx/NavItem.tsx — see sidebarNavTheme.ts.
  const palette = getSidebarNavPalette(isDark);

  return (
    <View className="absolute inset-0 z-50" pointerEvents="box-none">
      <Pressable className="absolute inset-0" style={{ backgroundColor: 'rgba(17, 24, 39, 0.4)' }} onPress={closeDrawer} />

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            { width: drawerWidth, height: '100%' },
            drawerStyle,
            { backgroundColor: palette.background, borderRightWidth: 1, borderRightColor: palette.borderColor },
            palette.edgeGlow,
          ]}
        >
          <SafeAreaView className="flex-1" edges={['top', 'left', 'bottom']}>
            <View className="flex-1 flex-col">
              {/* FIXED TOP */}
              <View className="shrink-0 px-3 pt-6">
                <Pressable
                  onPress={() => {
                    closeDrawer();
                    router.push('/(tabs)/profile');
                  }}
                  className="flex-row items-center gap-3 rounded-xl px-1 py-2 hover:bg-elevated"
                >
                  <Avatar name={user?.name} source={user?.avatar} size="lg" ring ringColor="teal" />
                  <View className="flex-1">
                    <Text variant="h3" color="primary" numberOfLines={1}>
                      {user?.name ?? 'Guest'}
                    </Text>
                    <Text variant="caption" color="muted" className="normal-case tracking-normal" numberOfLines={1}>
                      {user?.email ?? 'Browsing as guest'}
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* SCROLLABLE MIDDLE */}
              <ScrollView
                className="mt-3 flex-1 px-3"
                contentContainerClassName="gap-1 pb-4"
                showsVerticalScrollIndicator={false}
              >
                {NAV_ITEMS.map((item) => (
                  <NavItem key={item.href} item={item} onNavigate={closeDrawer} />
                ))}
              </ScrollView>

              {/* FIXED BOTTOM */}
              <View className="shrink-0 px-3 pb-4 pt-2">
                <View className="mb-2 h-px" style={{ backgroundColor: hexToRgba(themeColors.brand.tideTeal, 0.1) }} />

                <NavItem item={{ href: '/profile', label: 'Settings', labelKey: 'nav.settings', icon: 'Settings' }} onNavigate={closeDrawer} />

                <View className="mt-2 flex-row items-center justify-between px-3 py-1">
                  <Text variant="caption" color="muted" className="normal-case tracking-normal">
                    {t('nav.theme')}
                  </Text>
                  <ThemeToggle />
                </View>

                <Pressable onPress={handleLogout} className="flex-row items-center gap-3 rounded-xl py-2.5 pl-3 pr-4">
                  <Icon name="LogOut" size={19} color={themeColors.status.error} />
                  <Text variant="body" className="font-medium" style={{ color: themeColors.status.error }}>
                    {t('nav.logout')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
