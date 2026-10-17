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
  '--color-bg-base': '#F8FAFC',
  '--color-bg-elevated': '#F1F5F9',
  '--color-bg-surface': '#FFFFFF',
  '--color-bg-hover': '#E2E8F0',
  '--color-bg-glass': 'rgba(255, 255, 255, 0.72)',

  '--color-text-primary': '#0F172A',
  '--color-text-secondary': '#334155',
  '--color-text-muted': '#64748B',
  '--color-text-disabled': '#94A3B8',
  '--color-text-inverse': '#FFFFFF',

  '--color-border-subtle': '#E9EEF4',
  '--color-border-default': '#E2E8F0',
  '--color-border-hover': '#CBD5E1',
  '--color-border-glass': 'rgba(15, 23, 42, 0.08)',
});

export const darkVars = vars({
  '--color-bg-base': '#07090F',
  '--color-bg-elevated': '#0E131C',
  '--color-bg-surface': '#121823',
  '--color-bg-hover': '#1B2230',
  '--color-bg-glass': 'rgba(14, 19, 28, 0.72)',

  '--color-text-primary': '#F8FAFC',
  '--color-text-secondary': '#E2E8F0',
  '--color-text-muted': '#94A3B8',
  '--color-text-disabled': '#64748B',
  // NOT flipped — see the matching note on darkColors.text.inverse in theme.ts: every
  // usage is a label on a solid brand-colored surface, which stays brand-colored in dark mode too.
  '--color-text-inverse': '#FFFFFF',

  '--color-border-subtle': 'rgba(255, 255, 255, 0.06)',
  '--color-border-default': 'rgba(255, 255, 255, 0.10)',
  '--color-border-hover': 'rgba(255, 255, 255, 0.16)',
  '--color-border-glass': 'rgba(255, 255, 255, 0.08)',
});
