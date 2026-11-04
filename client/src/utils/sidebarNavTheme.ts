import { Platform, type ViewStyle } from 'react-native';

type ShadowStyle = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

export interface SidebarNavPalette {
  /** The floating sidebar/drawer/tab-bar panel — frosted Tide Ocean glass over the app's
   * OceanBackdrop on web; a solid, ocean-tinted equivalent on native, which has no
   * backdrop-filter (a see-through tab bar there would show content scrolling under it). */
  background: string;
  borderColor: string;
  /** The blur behind `background` on web; empty on native. Spread into the panel's style. */
  panelBlur: ViewStyle;
  /** Soft lift under the panel — deep-sea tinted, never a colored glow. */
  panelShadow: ShadowStyle;
  /** Idle nav label/icon color — `text-secondary`-ish rather than muted, so idle items stay
   * clearly readable. */
  navDefaultText: string;
  /** Active nav label color — full-strength primary text; the icon chip carries the brand
   * color instead, so the label itself doesn't have to. */
  navActiveText: string;
  navHoverBg: string;
  navActiveBg: string;
  navActiveBorder: string;
  /** Small uppercase group headings ("Workspace", "Growth"). */
  sectionLabel: string;
  divider: string;
}

const isWeb = Platform.OS === 'web';
const GLASS_BLUR: ViewStyle = isWeb
  ? ({ backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)' } as unknown as ViewStyle)
  : {};

const LIGHT: SidebarNavPalette = {
  background: isWeb ? 'rgba(255, 255, 255, 0.66)' : '#FAFDFD',
  borderColor: 'rgba(5, 42, 48, 0.07)',
  panelBlur: GLASS_BLUR,
  panelShadow: { shadowColor: '#052A30', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4 },
  navDefaultText: '#3E5560',
  navActiveText: '#05262C',
  navHoverBg: 'rgba(5, 42, 48, 0.045)',
  navActiveBg: 'rgba(20, 184, 166, 0.10)',
  navActiveBorder: 'rgba(20, 184, 166, 0.22)',
  sectionLabel: '#8AA3AB',
  divider: 'rgba(5, 42, 48, 0.07)',
};

const DARK: SidebarNavPalette = {
  background: isWeb ? 'rgba(8, 30, 37, 0.62)' : '#071C22',
  borderColor: 'rgba(94, 234, 212, 0.08)',
  panelBlur: GLASS_BLUR,
  panelShadow: { shadowColor: '#000000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.45, shadowRadius: 32, elevation: 8 },
  navDefaultText: '#9DB4BB',
  navActiveText: '#F0FDFA',
  navHoverBg: 'rgba(94, 234, 212, 0.05)',
  navActiveBg: 'rgba(20, 184, 166, 0.14)',
  navActiveBorder: 'rgba(94, 234, 212, 0.22)',
  sectionLabel: '#5E7A82',
  divider: 'rgba(94, 234, 212, 0.08)',
};

/** Single source of truth for Sidebar.tsx, NavItem.tsx, MobileDrawer.tsx and MobileTabBar.tsx
 * — all need the exact same values, and hardcoding them in each is exactly how one gets
 * updated later and the others quietly drift out of sync. */
export function getSidebarNavPalette(isDark: boolean): SidebarNavPalette {
  return isDark ? DARK : LIGHT;
}
