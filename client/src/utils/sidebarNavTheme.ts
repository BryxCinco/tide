import type { ViewStyle } from 'react-native';

type GlowStyle = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

export interface SidebarNavPalette {
  /** Sidebar/drawer panel background — distinct from the main content's flat bg-base. */
  background: string;
  borderColor: string;
  edgeGlow: GlowStyle;
  /** Default (non-hover, non-active) nav label/icon color — deliberately `text-secondary`,
   * not the app's `text-muted` token, so idle nav items stay clearly readable rather than
   * fading into the background. */
  navDefaultText: string;
  navAccentText: string;
  navHoverBg: string;
  navHoverGlow: GlowStyle;
  navActiveBg: string;
  navActiveGlow: GlowStyle;
  navAccentBar: string;
  /** Extra glow specifically on the active accent bar — dark mode only, per spec. */
  navAccentBarGlow?: GlowStyle;
}

const TEAL = '#14B8A6';

const LIGHT: SidebarNavPalette = {
  background: '#F8FAFB',
  borderColor: 'rgba(20, 184, 166, 0.12)',
  edgeGlow: { shadowColor: TEAL, shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.06, shadowRadius: 24, elevation: 4 },
  navDefaultText: '#374151',
  navAccentText: TEAL,
  navHoverBg: 'rgba(20, 184, 166, 0.06)',
  navHoverGlow: { shadowColor: TEAL, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 3 },
  navActiveBg: 'rgba(20, 184, 166, 0.1)',
  navActiveGlow: { shadowColor: TEAL, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 18, elevation: 6 },
  navAccentBar: TEAL,
};

const DARK: SidebarNavPalette = {
  background: '#0D1319',
  borderColor: 'rgba(20, 184, 166, 0.18)',
  edgeGlow: { shadowColor: TEAL, shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.12, shadowRadius: 32, elevation: 12 },
  navDefaultText: '#D1D5DB',
  navAccentText: TEAL,
  navHoverBg: 'rgba(20, 184, 166, 0.1)',
  navHoverGlow: { shadowColor: TEAL, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 7 },
  navActiveBg: 'rgba(20, 184, 166, 0.18)',
  navActiveGlow: { shadowColor: TEAL, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 10 },
  navAccentBar: TEAL,
  navAccentBarGlow: { shadowColor: TEAL, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 4 },
};

/** Single source of truth for Sidebar.tsx, NavItem.tsx, and MobileDrawer.tsx — all three
 * need the exact same rgba/hex values, and hardcoding them three times over is exactly
 * how one gets updated later and the others quietly drift out of sync. */
export function getSidebarNavPalette(isDark: boolean): SidebarNavPalette {
  return isDark ? DARK : LIGHT;
}
