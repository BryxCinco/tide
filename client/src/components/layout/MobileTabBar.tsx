import { router, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '../ui/SoundPressable';

import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation, type TranslationKey } from '../../i18n';
import { useThemeStore } from '../../store/themeStore';
import { hexToRgba } from '../../utils/color';
import { getSidebarNavPalette } from '../../utils/sidebarNavTheme';
import { Icon, Text, type IconName } from '../ui';

interface TabDef {
  href: '/' | '/timer' | '/journal' | '/insights' | '/profile';
  label: string;
  labelKey: TranslationKey;
  icon: IconName;
}

const TABS: TabDef[] = [
  { href: '/', label: 'Home', labelKey: 'nav.dashboard', icon: 'Home' },
  { href: '/timer', label: 'Timer', labelKey: 'nav.timer', icon: 'Clock' },
  { href: '/journal', label: 'Journal', labelKey: 'nav.journal', icon: 'Book' },
  { href: '/insights', label: 'Insights', labelKey: 'nav.insights', icon: 'BarChart3' },
  { href: '/profile', label: 'Profile', labelKey: 'nav.profile', icon: 'User' },
];

/**
 * The one phone bottom tab bar, used everywhere: (tabs)/_layout.tsx renders it through the
 * native <Tabs> `tabBar` prop, and Tasks/Activities/AI Coach (top-level routes outside the
 * (tabs) group) render it directly — so the bar looks and behaves identically on every phone
 * screen. Navigation uses router.navigate (not push) so hopping between tabs never stacks
 * duplicate screens. The active tab gets a soft tinted pill behind its icon — a static color
 * change, no sliding indicator, so nothing jumps around while switching.
 */
export function MobileTabBar() {
  const { isPhone } = useResponsive();
  const pathname = usePathname();
  const themeColors = useThemeColors();
  const isDark = useThemeStore((s) => s.theme === 'dark');
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  if (!isPhone) return null;

  const palette = getSidebarNavPalette(isDark);
  const teal = themeColors.brand.tideTeal;

  return (
    <View
      className="flex-row border-t px-2 pt-1.5"
      style={{
        backgroundColor: palette.background,
        borderTopColor: palette.borderColor,
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      {TABS.map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        const label = t(tab.labelKey) || tab.label;
        return (
          <Pressable
            key={tab.href}
            onPress={() => {
              if (!active) router.navigate(tab.href);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            className="flex-1 items-center gap-1 py-1"
          >
            <View
              className="h-8 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: active ? hexToRgba(teal, isDark ? 0.18 : 0.12) : 'transparent' }}
            >
              <Icon name={tab.icon} size={20} strokeWidth={active ? 2.3 : 2} color={active ? teal : palette.navDefaultText} />
            </View>
            <Text
              variant="body"
              numberOfLines={1}
              className={active ? 'font-semibold' : 'font-medium'}
              style={{ fontSize: 11, color: active ? palette.navActiveText : palette.navDefaultText }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
