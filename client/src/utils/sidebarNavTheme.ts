import type { ViewStyle } from 'react-native';

type ShadowStyle = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

export interface SidebarNavPalette {
  /** The floating sidebar/drawer panel itself — white "island" on the slate canvas in light
   * mode, a slightly lifted ink panel in dark mode. */
  background: string;
  borderColor: string;
  /** Soft neutral lift under the panel — no colored glow, so it reads calm, not flashy. */
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

const LIGHT: SidebarNavPalette = {
  background: '#FFFFFF',
  borderColor: 'rgba(15, 23, 42, 0.06)',
  panelShadow: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4 },
  navDefaultText: '#475569',
  navActiveText: '#0F172A',
  navHoverBg: 'rgba(15, 23, 42, 0.04)',
  navActiveBg: 'rgba(20, 184, 166, 0.08)',
  navActiveBorder: 'rgba(20, 184, 166, 0.18)',
  sectionLabel: '#94A3B8',
  divider: 'rgba(15, 23, 42, 0.06)',
};

const DARK: SidebarNavPalette = {
  background: '#0C1119',
  borderColor: 'rgba(255, 255, 255, 0.06)',
  panelShadow: { shadowColor: '#000000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.45, shadowRadius: 32, elevation: 8 },
  navDefaultText: '#94A3B8',
  navActiveText: '#F8FAFC',
  navHoverBg: 'rgba(255, 255, 255, 0.04)',
  navActiveBg: 'rgba(20, 184, 166, 0.12)',
  navActiveBorder: 'rgba(20, 184, 166, 0.22)',
  sectionLabel: '#64748B',
  divider: 'rgba(255, 255, 255, 0.06)',
};

/** Single source of truth for Sidebar.tsx, NavItem.tsx, and MobileDrawer.tsx — all three
 * need the exact same rgba/hex values, and hardcoding them three times over is exactly
 * how one gets updated later and the others quietly drift out of sync. */
export function getSidebarNavPalette(isDark: boolean): SidebarNavPalette {
  return isDark ? DARK : LIGHT;
}
