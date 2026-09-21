import { useThemeStore } from '../store/themeStore';
import { colors, darkColors } from '../utils/theme';

/**
 * Theme-reactive counterpart to importing `colors` directly — for anything that needs a
 * plain JS color value (an Icon's `color` prop, an RN shadow* color) rather than a
 * Tailwind className. Class-based styling re-themes automatically via the CSS custom
 * properties in themeVars.ts; this hook is only needed where a component can't express
 * the color as a className.
 */
export function useThemeColors() {
  const theme = useThemeStore((s) => s.theme);
  return theme === 'dark' ? darkColors : colors;
}
