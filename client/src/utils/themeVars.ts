import { vars } from 'nativewind';

/**
 * NativeWind CSS-custom-property theming: tailwind.config.js points the neutral
 * bg/text/border tokens (bg-base, text-primary, border-subtle, ...) at `var(--color-*)`
 * instead of literal hex, so re-applying one of these two objects as the root View's
 * `style` re-themes every component that already uses those tokens — no per-component
 * `dark:` classes needed. Brand/status colors (teal, error, ...) are NOT included here
 * because they're identical in both themes (see theme.ts's `colors`/`darkColors`).
 */
export const lightVars = vars({
  '--color-bg-base': '#FFFFFF',
  '--color-bg-elevated': '#F9FAFB',
  '--color-bg-surface': '#F3F4F6',
  '--color-bg-hover': '#E5E7EB',
  '--color-bg-glass': 'rgba(255, 255, 255, 0.7)',

  '--color-text-primary': '#111827',
  '--color-text-secondary': '#374151',
  '--color-text-muted': '#6B7280',
  '--color-text-disabled': '#9CA3AF',
  '--color-text-inverse': '#FFFFFF',

  '--color-border-subtle': '#F3F4F6',
  '--color-border-default': '#E5E7EB',
  '--color-border-hover': '#D1D5DB',
  '--color-border-glass': 'rgba(17, 24, 39, 0.08)',
});

export const darkVars = vars({
  '--color-bg-base': '#0A0E14',
  '--color-bg-elevated': '#111721',
  '--color-bg-surface': '#161D2A',
  '--color-bg-hover': '#1E2633',
  '--color-bg-glass': 'rgba(17, 23, 33, 0.7)',

  '--color-text-primary': '#FFFFFF',
  '--color-text-secondary': '#E5E7EB',
  '--color-text-muted': '#9CA3AF',
  '--color-text-disabled': '#6B7280',
  // NOT flipped — see the matching note on darkColors.text.inverse in theme.ts: every
  // usage is a label on a solid brand-colored surface, which stays brand-colored in dark mode too.
  '--color-text-inverse': '#FFFFFF',

  '--color-border-subtle': 'rgba(255, 255, 255, 0.06)',
  '--color-border-default': 'rgba(255, 255, 255, 0.10)',
  '--color-border-hover': 'rgba(255, 255, 255, 0.16)',
  '--color-border-glass': 'rgba(255, 255, 255, 0.08)',
});
