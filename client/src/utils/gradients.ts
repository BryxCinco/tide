import { colors } from './theme';

/**
 * Tide Light uses solid colors everywhere except progress bars and hero
 * cards/accent lines — `primary` is the one sanctioned gradient.
 */
export const gradients = {
  /** Teal -> ocean blue, 90deg. Progress bars and hero-card accents only. */
  primary: [colors.brand.tideTeal, colors.brand.oceanBlue] as const,
  /** Teal -> cyan -> indigo — TIDE's signature "aurora". Reserved for the few moments that
   * should feel special: the active nav item, the AI Coach identity, the send button. */
  aurora: ['#14B8A6', '#06B6D4', '#6366F1'] as const,
} as const;

/** `start`/`end` points (as fractions of the box) matching `gradients.primary`'s 90deg angle. */
export const gradientDirections = {
  horizontal: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
} as const;

export type GradientName = keyof typeof gradients;
