import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { colors } from '@/utils/theme';

// tabBarActiveTintColor/tabBarInactiveTintColor above are always plain hex strings, so this
// cast is safe — ColorValue's OpaqueColorValue branch (PlatformColor/DynamicColorIOS) is a
// possibility React Navigation's types defend against generically, not one we ever produce.
function makeTabBarIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Icon name={name} color={color as string} size={size} />
  );
}

// Tab bar is native-only for now — Phase 9 adds a sidebar for web instead.
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand.tideTeal,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle:
          Platform.OS === 'web'
            ? { display: 'none' }
            : { backgroundColor: colors.background.base, borderTopColor: colors.border.subtle },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_500Medium' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: makeTabBarIcon('Home') }} />
      <Tabs.Screen name="timer" options={{ title: 'Timer', tabBarIcon: makeTabBarIcon('Clock') }} />
      <Tabs.Screen name="journal" options={{ title: 'Journal', tabBarIcon: makeTabBarIcon('Book') }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: makeTabBarIcon('BarChart3') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: makeTabBarIcon('User') }} />
    </Tabs>
  );
}
