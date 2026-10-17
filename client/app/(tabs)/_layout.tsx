import { Tabs } from 'expo-router';

import type { ColorValue } from 'react-native';

import { AppLayout, MobileTabBar } from '@/components/layout';
import { Icon, type IconName } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeColors } from '@/hooks/useThemeColors';

// tabBarActiveTintColor/tabBarInactiveTintColor above are always plain hex strings, so this
// cast is safe — ColorValue's OpaqueColorValue branch (PlatformColor/DynamicColorIOS) is a
// possibility React Navigation's types defend against generically, not one we ever produce.
function makeTabBarIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Icon name={name} color={color as string} size={size} />
  );
}

/**
 * Tablet/desktop get AppLayout's persistent left Sidebar instead of the bottom tab bar
 * (see Sidebar.tsx). Phone keeps the native bottom tab bar for the 5 primary
 * destinations, plus AppLayout's hamburger button opening MobileDrawer for the items
 * the tab bar has no room for (Tasks, Activities, Settings, Log Out).
 */
export default function TabsLayout() {
  const { isPhone } = useResponsive();
  const themeColors = useThemeColors();

  return (
    <AppLayout>
      <Tabs
        // One shared custom bar (MobileTabBar.tsx) instead of React Navigation's default
        // chrome, so these 5 tabs look identical to the bar on Tasks/Activities/AI Coach.
        // It renders nothing above phone width, where the Sidebar takes over.
        tabBar={() => (isPhone ? <MobileTabBar /> : null)}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: themeColors.brand.tideTeal,
          tabBarInactiveTintColor: themeColors.text.muted,
          sceneStyle: { backgroundColor: themeColors.background.base },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: makeTabBarIcon('Home') }} />
        <Tabs.Screen name="timer" options={{ title: 'Timer', tabBarIcon: makeTabBarIcon('Clock') }} />
        <Tabs.Screen name="journal" options={{ title: 'Journal', tabBarIcon: makeTabBarIcon('Book') }} />
        <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: makeTabBarIcon('BarChart3') }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: makeTabBarIcon('User') }} />
      </Tabs>
    </AppLayout>
  );
}
