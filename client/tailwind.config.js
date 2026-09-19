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
        primary: '#6366F1',
        secondary: '#10B981',
        accent: '#F59E0B',
        'bg-light': '#F9FAFB',
        'bg-dark': '#111827',
        'text-primary': '#111827',
        'text-secondary': '#6B7280',
      },
    },
  },
  plugins: [],
};
