export const colors = {
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
} as const;

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
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
} as const;

export type Theme = typeof theme;
