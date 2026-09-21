/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand accents (usable on bg-/text-/border-/ring-)
        'tide-teal': '#14B8A6',
        'tide-teal-dark': '#0D9488',
        'tide-teal-light': '#5EEAD4',
        'ocean-blue': '#0EA5E9',
        // Soft purple — use sparingly, e.g. "Critical" badges/highlights only.
        'deep-purple': '#8B5CF6',
        'purple-dark': '#7C3AED',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#0EA5E9',
      },
      // Neutral tokens read from CSS custom properties (see src/utils/themeVars.ts) so
      // toggling theme re-applies one `vars()` object at the root instead of touching
      // every component with a `dark:` variant. Brand/status colors above are unaffected
      // by theme and stay literal.
      backgroundColor: {
        base: 'var(--color-bg-base)',
        elevated: 'var(--color-bg-elevated)',
        surface: 'var(--color-bg-surface)',
        hover: 'var(--color-bg-hover)',
        glass: 'var(--color-bg-glass)',
        subtle: 'var(--color-bg-surface)',
        default: 'var(--color-bg-hover)',
      },
      textColor: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        muted: 'var(--color-text-muted)',
        disabled: 'var(--color-text-disabled)',
        inverse: 'var(--color-text-inverse)',
      },
      borderColor: {
        DEFAULT: 'var(--color-border-default)',
        subtle: 'var(--color-border-subtle)',
        default: 'var(--color-border-default)',
        hover: 'var(--color-border-hover)',
        accent: '#14B8A6',
        glass: 'var(--color-border-glass)',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
      },
      fontSize: {
        display: '36px',
        h1: '30px',
        h2: '24px',
        h3: '20px',
        'body-lg': '17px',
        body: '15px',
        caption: '13px',
        label: '11px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
  plugins: [],
};
