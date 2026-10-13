import { router, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '../ui/SoundPressable';

import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { Icon, Text, type IconName } from '../ui';

interface TabDef {
  href: '/' | '/timer' | '/journal' | '/insights' | '/profile';
  label: string;
  icon: IconName;
}

// Same 5 destinations and order as (tabs)/_layout.tsx's native <Tabs> — this is a second,
// hand-built copy of that same tab bar rather than a shared one, because the native <Tabs>
// navigator (and the tab bar chrome it renders) only exists for screens that are actually
// inside the (tabs) route group. Tasks/Activities/Chat are top-level routes outside that
// group, so they render this instead, to keep the tab bar visible (and navigable) from
// every phone screen rather than only the 5 screens that are themselves tabs.
const TABS: TabDef[] = [
  { href: '/', label: 'Dashboard', icon: 'Home' },
  { href: '/timer', label: 'Timer', icon: 'Clock' },
  { href: '/journal', label: 'Journal', icon: 'Book' },
  { href: '/insights', label: 'Insights', icon: 'BarChart3' },
  { href: '/profile', label: 'Profile', icon: 'User' },
];

/**
 * Bottom tab bar for phone screens that live outside the (tabs) route group (Tasks,
 * Activities, AI Coach) — keeps the same 5 primary destinations one tap away regardless
 * of which screen the user is currently on, instead of those three screens being a
 * navigational dead end reachable only via the drawer. None of these 3 screens are
 * themselves one of the 5 tabs, so nothing here ever renders as "active" — that's
 * expected, not a bug.
 */
export function MobileTabBar() {
  const { isPhone } = useResponsive();
  const pathname = usePathname();
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();

  if (!isPhone) return null;

  return (
    <View
      className="flex-row border-t border-subtle bg-base"
      style={{ paddingBottom: insets.bottom }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const color = active ? themeColors.brand.tideTeal : themeColors.text.muted;
        return (
          <Pressable
            key={tab.href}
            onPress={() => router.push(tab.href)}
            className="flex-1 items-center gap-1 py-2"
          >
            <Icon name={tab.icon} size={22} color={color} />
            <Text variant="caption" style={{ color }} className="normal-case tracking-normal">
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
