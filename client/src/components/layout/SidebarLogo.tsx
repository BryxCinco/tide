import { Image } from 'react-native';

// Fixed aspect ratios for these bundled, never-changing assets — see AuthLogo.tsx's matching
// comment for why this is hardcoded rather than measured via Image.getSize().
const MARK_ASPECT = 950 / 958; // assets/logo-mark.png
const WORDMARK_ASPECT = 961 / 400; // assets/logo-wordmark.png

export interface SidebarLogoProps {
  /** Rail mode (Sidebar's icon-only collapsed state, 72px wide) — too narrow for the
   * wordmark, so this swaps to the circular mark alone instead of just shrinking the same
   * image illegibly small. */
  collapsed?: boolean;
  /** Rendered width in px when expanded — ignored when collapsed, which sizes itself to fit
   * the icon-only rail instead. */
  width?: number;
}

/**
 * Brand mark for Sidebar.tsx's fixed top section, replacing the old plain "TIDE" text (and,
 * collapsed, a single "T" letter). Two different bundled images rather than one image scaled
 * two ways: logo-wordmark.png's "TiDE" lettering would be illegible shrunk down to rail width,
 * so the collapsed state uses logo-mark.png (the circular icon alone, no text) instead.
 */
export function SidebarLogo({ collapsed = false, width = 120 }: SidebarLogoProps) {
  if (collapsed) {
    return (
      <Image
        source={require('../../../assets/logo-mark.png')}
        style={{ width: 32, height: 32 / MARK_ASPECT, alignSelf: 'center' }}
        resizeMode="contain"
        accessibilityLabel="TIDE"
      />
    );
  }

  return (
    <Image
      source={require('../../../assets/logo-wordmark.png')}
      style={{ width, height: width / WORDMARK_ASPECT }}
      resizeMode="contain"
      accessibilityLabel="TIDE"
    />
  );
}
