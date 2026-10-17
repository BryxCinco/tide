import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Fragment, useEffect, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { Pressable } from '../ui/SoundPressable';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../hooks/useAuth';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../i18n';
import { LogoutModal } from '../profile/LogoutModal';
import { useThemeStore } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import { hexToRgba } from '../../utils/color';
import { getSidebarNavPalette } from '../../utils/sidebarNavTheme';
import { Avatar, Icon, Text, ThemeToggle } from '../ui';
import { NAV_SECTIONS, NavItem, NavSectionLabel } from './NavItem';
import { SidebarLogo } from './SidebarLogo';

const MAX_WIDTH = 320;
const GUTTER = 10;
const OPEN_DURATION = 260;
const CLOSE_DURATION = 200;

/**
 * Slide-in mobile nav — a floating rounded panel inset from the screen edges, matching the
 * desktop Sidebar. Its content is only mounted while open, so closing (backdrop tap, nav, or
 * swipe-left) unmounts it. The backdrop's opacity is driven by the same shared value as the
 * panel's position, so dragging the drawer fades the backdrop in lockstep.
 */
export function MobileDrawer() {
  const isOpen = useUiStore((s) => s.isDrawerOpen);
  const closeDrawer = useUiStore((s) => s.closeDrawer);
  const { user, logout } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const { t } = useTranslation();
  const [logoutVisible, setLogoutVisible] = useState(false);

  const drawerWidth = Math.min(screenWidth * 0.84, MAX_WIDTH);
  const hiddenX = -(drawerWidth + GUTTER * 2);
  const translateX = useSharedValue(hiddenX);

  useEffect(() => {
    if (!isOpen) return;
    translateX.value = hiddenX;
    translateX.value = withTiming(0, { duration: OPEN_DURATION, easing: Easing.out(Easing.cubic) });
  }, [isOpen, hiddenX, translateX]);

  const animateClose = () => {
    translateX.value = withTiming(hiddenX, { duration: CLOSE_DURATION, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(closeDrawer)();
    });
  };

  const panGesture = Gesture.Pan()
    // activeOffsetX(-10) only activates on a deliberate leftward (closing) swipe; failOffsetY
    // hands any mostly-vertical touch back to the nav ScrollView so the list still scrolls.
    .activeOffsetX(-10)
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      translateX.value = Math.min(0, event.translationX);
    })
    .onEnd((event) => {
      const pastThreshold = event.translationX < -drawerWidth * 0.3 || event.velocityX < -800;
      if (pastThreshold) {
        translateX.value = withTiming(hiddenX, { duration: CLOSE_DURATION }, (finished) => {
          if (finished) runOnJS(closeDrawer)();
        });
      } else {
        translateX.value = withTiming(0, { duration: CLOSE_DURATION });
      }
    });

  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [hiddenX, 0], [0, 1]),
  }));

  if (!isOpen) return null;

  // Deliberately doesn't closeDrawer() first — the early return above would unmount the
  // confirmation modal along with the drawer the instant isOpen flips false.
  const confirmLogout = async () => {
    setLogoutVisible(false);
    closeDrawer();
    await logout();
    router.replace('/(auth)/login');
  };

  const palette = getSidebarNavPalette(isDark);
  const teal = themeColors.brand.tideTeal;
  let navIndex = 0;

  return (
    <View className="absolute inset-0 z-50" pointerEvents="box-none">
      <Animated.View className="absolute inset-0" style={backdropStyle}>
        <Pressable
          className="absolute inset-0"
          style={{ backgroundColor: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(15, 23, 42, 0.35)' }}
          onPress={animateClose}
          accessibilityLabel="Close menu"
        />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: GUTTER,
              top: insets.top + GUTTER,
              bottom: insets.bottom + GUTTER,
              width: drawerWidth,
              borderRadius: 24,
              borderWidth: 1,
              backgroundColor: palette.background,
              borderColor: palette.borderColor,
            },
            palette.panelShadow,
            drawerStyle,
          ]}
        >
          <View className="absolute inset-x-0 top-0 h-40 overflow-hidden rounded-t-[24px]" pointerEvents="none">
            <LinearGradient
              colors={[hexToRgba(teal, isDark ? 0.16 : 0.09), hexToRgba('#6366F1', isDark ? 0.06 : 0.03), 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ flex: 1 }}
            />
          </View>

          <View className="flex-1">
            {/* FIXED TOP — brand + close, then the account card. */}
            <View className="shrink-0 px-4 pt-5">
              <View className="flex-row items-center justify-between pl-1">
                <SidebarLogo width={96} />
                <Pressable
                  onPress={animateClose}
                  hitSlop={8}
                  accessibilityLabel="Close menu"
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: palette.navHoverBg }}
                >
                  <Icon name="X" size={18} color={palette.navDefaultText} />
                </Pressable>
              </View>

              <Pressable
                onPress={() => {
                  closeDrawer();
                  router.push('/(tabs)/profile');
                }}
                className="mt-5 flex-row items-center gap-3 rounded-2xl border p-3"
                style={{ borderColor: palette.borderColor, backgroundColor: palette.navHoverBg }}
              >
                <Avatar name={user?.name} source={user?.avatar} style={{ width: 42, height: 42 }} />
                <View className="flex-1" style={{ minWidth: 0 }}>
                  <Text variant="body" color="primary" className="font-semibold" numberOfLines={1}>
                    {user?.name ?? 'Demo User'}
                  </Text>
                  <Text variant="body" color="muted" className="text-[12px]" numberOfLines={1}>
                    {user?.email ?? 'Browsing in demo mode'}
                  </Text>
                </View>
                <Icon name="ChevronRight" size={16} color={palette.sectionLabel} />
              </Pressable>
            </View>

            {/* SCROLLABLE MIDDLE */}
            <ScrollView className="flex-1 px-3" contentContainerClassName="gap-0.5 pb-3" showsVerticalScrollIndicator={false}>
              {NAV_SECTIONS.map((section) => (
                <Fragment key={section.label}>
                  <NavSectionLabel label={section.labelKey ? t(section.labelKey) : section.label} />
                  {section.items.map((item) => (
                    <NavItem key={item.href} item={item} onNavigate={closeDrawer} index={navIndex++} animateIn />
                  ))}
                </Fragment>
              ))}
            </ScrollView>

            {/* FIXED BOTTOM */}
            <View className="shrink-0 gap-1 px-3 pb-3 pt-2">
              <View className="mb-1 h-px" style={{ backgroundColor: palette.divider }} />

              <View className="flex-row items-center justify-between px-2.5 py-1.5">
                <Text variant="body" color="muted" className="text-[13px] font-medium">
                  {t('nav.theme')}
                </Text>
                <ThemeToggle />
              </View>

              <Pressable
                onPress={() => setLogoutVisible(true)}
                className="flex-row items-center gap-3 rounded-xl px-2 py-1.5"
              >
                <View className="h-[30px] w-[30px] items-center justify-center rounded-[9px]" style={{ backgroundColor: hexToRgba(themeColors.status.error, 0.1) }}>
                  <Icon name="LogOut" size={16} color={themeColors.status.error} />
                </View>
                <Text variant="body" className="font-medium" style={{ color: themeColors.status.error }}>
                  {t('nav.logout')}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>

      <LogoutModal visible={logoutVisible} onClose={() => setLogoutVisible(false)} onConfirm={confirmLogout} />
    </View>
  );
}
