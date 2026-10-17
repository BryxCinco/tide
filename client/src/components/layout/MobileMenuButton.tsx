import { useResponsive } from '../../hooks/useResponsive';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useUiStore } from '../../store/uiStore';
import { Icon } from '../ui';
import { Pressable } from '../ui/SoundPressable';

/**
 * Inline hamburger-menu trigger for phone headers that already render their own top-right
 * action button (Activities/Tasks's "New"). AppLayout's usual floating overlay hamburger is
 * absolutely positioned at the same `top`/`right` corner those headers' own button already
 * occupies in normal flow, landing almost exactly on top of it instead of beside it. This
 * renders as an ordinary flex-row sibling instead, so spacing comes from the row's own `gap`
 * like everything else in it. Pair with `showMobileMenuButton={false}` on that screen's
 * AppLayout so the floating one doesn't also render and double up.
 */
export function MobileMenuButton() {
  const { isPhone } = useResponsive();
  const openDrawer = useUiStore((s) => s.openDrawer);
  const themeColors = useThemeColors();

  // Only phone has a drawer to open at all — tablet/desktop use the persistent Sidebar.
  if (!isPhone) return null;

  return (
    <Pressable
      onPress={openDrawer}
      hitSlop={6}
      accessibilityLabel="Open menu"
      className="h-10 w-10 items-center justify-center rounded-xl border border-subtle bg-surface"
    >
      <Icon name="Menu" size={19} color={themeColors.text.primary} />
    </Pressable>
  );
}
