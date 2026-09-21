import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useUiStore } from '../../store/uiStore';
import { shadows } from '../../utils/theme';
import { Icon } from '../ui';
import { MobileDrawer } from './MobileDrawer';
import { Sidebar } from './Sidebar';
import { SidebarCollapseToggle } from './SidebarCollapseToggle';

export interface AppLayoutProps {
  children: ReactNode;
  /**
   * Shows the floating hamburger button on phone. Defaults to true for top-level
   * destinations (Dashboard, Timer, Journal list, ...). Screens that already render
   * their own BackButton header (Tasks, Activities, the Journal editor) pass `false` —
   * the Back affordance already gets them out, and a second nav control top-left would
   * collide visually with it.
   */
  showMobileMenuButton?: boolean;
}

/**
 * Central responsive shell: persistent Sidebar on desktop, collapsed icon rail on
 * tablet, hamburger + MobileDrawer on phone. Used by app/(tabs)/_layout.tsx and every
 * non-tabs screen (activities, tasks, the journal editor) so the sidebar/drawer are
 * consistent everywhere rather than only inside the tab group.
 */
export function AppLayout({ children, showMobileMenuButton = true }: AppLayoutProps) {
  const { isPhone, isTablet } = useResponsive();
  const openDrawer = useUiStore((s) => s.openDrawer);
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();

  if (isPhone) {
    return (
      <View className="flex-1 bg-base">
        {children}

        {showMobileMenuButton && (
          <Pressable
            onPress={openDrawer}
            className="absolute h-10 w-10 items-center justify-center rounded-full border border-subtle bg-base"
            style={[{ left: 16, top: insets.top + 12 }, shadows.sm]}
          >
            <Icon name="Menu" size={20} color={themeColors.text.primary} />
          </Pressable>
        )}

        <MobileDrawer />
      </View>
    );
  }

  return (
    <View className="flex-1 flex-row bg-base">
      <Sidebar collapsed={isTablet} />
      {/* minWidth: 0 overrides flexbox's default "never shrink below content's intrinsic
          width" — without it, a wide child (a long unbroken table/text) can force this
          pane past its fair share and push the whole row wider than the viewport. */}
      <View className="flex-1" style={{ minWidth: 0 }}>
        {children}
      </View>
      {/* Desktop only — the tablet rail is a fixed icons-only width with nothing to
          collapse. Lives here (a sibling of Sidebar and the content pane), not inside
          Sidebar — see SidebarCollapseToggle.tsx for why that matters. */}
      {!isTablet && <SidebarCollapseToggle />}
    </View>
  );
}
