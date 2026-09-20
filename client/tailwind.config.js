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
      backgroundColor: {
        base: '#FFFFFF',
        elevated: '#F9FAFB',
        surface: '#F3F4F6',
        hover: '#E5E7EB',
        glass: 'rgba(255, 255, 255, 0.7)',
        subtle: '#F3F4F6',
        default: '#E5E7EB',
      },
      textColor: {
        primary: '#111827',
        secondary: '#374151',
        muted: '#6B7280',
        disabled: '#9CA3AF',
        inverse: '#FFFFFF',
      },
      borderColor: {
        DEFAULT: '#E5E7EB',
        subtle: '#F3F4F6',
        default: '#E5E7EB',
        hover: '#D1D5DB',
        accent: '#14B8A6',
        glass: 'rgba(17, 24, 39, 0.08)',
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
