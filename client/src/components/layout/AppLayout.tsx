import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Pressable } from '../ui/SoundPressable';
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
   * Shows the floating hamburger button on phone. Defaults to true. Every screen needs
   * some way to reach the nav drawer on mobile — screens with their own inline
   * BackButton (Tasks, Activities) keep it, just moved to the opposite corner (see
   * `mobileMenuPosition`) so the two don't overlap.
   */
  showMobileMenuButton?: boolean;
  /**
   * Which corner the floating hamburger sits in on phone. Defaults to `left`. Screens
   * that already render their own inline BackButton at top-left (Tasks, Activities) pass
   * `right`, since BackButton sits in the scrollable content flow while this hamburger is
   * a fixed overlay — at top-left they'd land in almost the same spot on first paint.
   */
  mobileMenuPosition?: 'left' | 'right';
}

/**
 * Central responsive shell: persistent Sidebar on desktop, collapsed icon rail on
 * tablet, hamburger + MobileDrawer on phone. Used by app/(tabs)/_layout.tsx and every
 * non-tabs screen (activities, tasks, the journal editor) so the sidebar/drawer are
 * consistent everywhere rather than only inside the tab group.
 */
export function AppLayout({
  children,
  showMobileMenuButton = true,
  mobileMenuPosition = 'left',
}: AppLayoutProps) {
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
            style={[
              { top: insets.top + 12 },
              mobileMenuPosition === 'right' ? { right: 16 } : { left: 16 },
              shadows.sm,
            ]}
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
