interface ColorPalette {
  background: { base: string; elevated: string; surface: string; hover: string };
  brand: { tideTeal: string; tideTealDark: string; tideTealLight: string; oceanBlue: string; deepPurple: string };
  text: { primary: string; secondary: string; muted: string; disabled: string; inverse: string };
  border: { subtle: string; default: string; hover: string; accent: string };
  status: { success: string; warning: string; error: string; info: string };
  glass: { background: string; border: string };
}

export const colors: ColorPalette = {
  background: {
    base: '#FFFFFF',
    elevated: '#F9FAFB',
    surface: '#F3F4F6',
    hover: '#E5E7EB',
  },

  brand: {
    tideTeal: '#14B8A6',
    tideTealDark: '#0D9488',
    tideTealLight: '#5EEAD4',
    oceanBlue: '#0EA5E9',
    /** Soft purple accent — use sparingly, e.g. "Critical" badges/highlights only. */
    deepPurple: '#8B5CF6',
  },

  text: {
    primary: '#111827',
    secondary: '#374151',
    muted: '#6B7280',
    disabled: '#9CA3AF',
    /** For text placed on solid teal/dark backgrounds. */
    inverse: '#FFFFFF',
  },

  border: {
    subtle: '#F3F4F6',
    default: '#E5E7EB',
    hover: '#D1D5DB',
    accent: '#14B8A6',
  },

  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#0EA5E9',
  },

  glass: {
    background: 'rgba(255, 255, 255, 0.7)',
    border: 'rgba(17, 24, 39, 0.08)',
  },
};

/**
 * Dark counterpart to `colors` — same shape, so `useThemeColors()` can swap between
 * them for anything that needs a JS color value (Icon `color` props, RN shadow colors)
 * rather than a Tailwind className. Brand/status hues are intentionally identical to
 * `colors` (teal etc. don't change with theme); only the neutrals shift.
 */
export const darkColors: ColorPalette = {
  background: {
    base: '#0A0E14',
    elevated: '#111721',
    surface: '#161D2A',
    hover: '#1E2633',
  },

  brand: colors.brand,

  text: {
    primary: '#FFFFFF',
    secondary: '#E5E7EB',
    muted: '#9CA3AF',
    disabled: '#6B7280',
    // NOT flipped: every current usage is text on a solid brand-colored surface (a teal/red
    // button, a gradient card) — that surface stays brand-colored in both themes, so its
    // label should stay white in both, not flip to near-black.
    inverse: '#FFFFFF',
  },

  border: {
    subtle: 'rgba(255, 255, 255, 0.06)',
    default: 'rgba(255, 255, 255, 0.10)',
    hover: 'rgba(255, 255, 255, 0.16)',
    accent: '#14B8A6',
  },

  status: colors.status,

  glass: {
    background: 'rgba(17, 23, 33, 0.7)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  size: {
    display: 36,
    h1: 30,
    h2: 24,
    h3: 20,
    bodyLg: 17,
    body: 15,
    caption: 13,
    label: 11,
  },
} as const;

/**
 * RN-native shadow tokens (shadowColor/shadowOffset/shadowOpacity/shadowRadius
 * for iOS, elevation for Android). Tide Light uses soft neutral shadows only —
 * no colored glows.
 */
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  /**
   * Deliberately heavier than `lg` — Modal.tsx's own dedicated shadow (spec: "0 20px 60px
   * rgba(0,0,0,0.15)"). RN's shadowRadius becomes the CSS blur radius verbatim once
   * react-native-web translates it, so shadowRadius: 60 here really does produce a 60px
   * blur, not half of it — a bigger, softer lift than any of the other tiers, appropriate
   * for a modal floating above a darkened backdrop rather than a card sitting on the page.
   */
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 60,
    elevation: 24,
  },
  /**
   * Colored "glow" shadows for premium CTAs (primary button, danger button, FAB).
   * RN shadow* props (not CSS box-shadow) so the tint renders on native too —
   * react-native-web already translates these into an equivalent box-shadow on web.
   */
  glowTeal: {
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  glowError: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  /** Soft, centered halo for focused inputs — approximates a CSS focus ring since RN's
   * shadow* props have no "spread" control, only blur (shadowRadius). */
  focusRing: {
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  /**
   * Dark-mode glows read as dramatically more luminous against the near-black
   * background — same shadowColor, higher opacity/radius. Picked at the call site via
   * `useThemeStore`, not a `dark:` className, since these are RN shadow* props.
   */
  glowTealDark: {
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  glowErrorDark: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  focusRingDark: {
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
} as const;

/**
 * Dedicated dark-mode surface for modal chrome (Modal.tsx, ChatPanel.tsx, SearchModal.tsx)
 * — a true neutral grey rather than `colors.background.surface`'s navy-tinted `#161D2A`.
 * Explicit design feedback asked for modals to read as grey, not near-black, in dark mode;
 * the rest of the app's dark palette stays navy-tinted, this is scoped to modal surfaces
 * only. `hover` is the matching neutral-grey chip background for things like the close
 * button, instead of `colors.background.hover`'s navy `#1E2633`, which would look
 * mismatched against this lighter grey. Light mode is unchanged (solid white).
 */
export const modalSurface = { light: '#FFFFFF', dark: '#27272A' } as const;
export const modalHover = { light: '#F3F4F6', dark: '#3A3A3F' } as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
} as const;

export type Theme = typeof theme;
