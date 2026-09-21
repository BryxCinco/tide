import { colorScheme } from 'nativewind';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { storage } from '../utils/storage';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Dark mode is opt-in (never follows system preference) — `colorScheme.set(...)` is
 * NativeWind's own runtime switch, called here alongside our persisted `theme` value so
 * both stay in sync: `dark:` classNames (if any) respond via NativeWind's mechanism,
 * while the CSS custom properties applied in app/_layout.tsx (see themeVars.ts) do the
 * actual re-theming of bg/text/border tokens app-wide.
 *
 * The web circular-reveal transition (see utils/themeTransition.ts) calls `setTheme`
 * directly with an explicit target rather than `toggleTheme`, since it needs to know
 * which theme it's revealing toward before the swap happens.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',

      // A single `set()` call — every subscriber (the root's CSS-var swap, any future
      // `dark:` usage) re-renders in the same React 18 batch, so the theme change is
      // atomic: there's no intermediate render where only some components have flipped.
      setTheme: (theme) => {
        colorScheme.set(theme);
        set({ theme });
      },

      toggleTheme: () => {
        const next: Theme = get().theme === 'light' ? 'dark' : 'light';
        colorScheme.set(next);
        set({ theme: next });
      },
    }),
    {
      name: 'tide_theme',
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => (state) => {
        if (state) colorScheme.set(state.theme);
      },
    },
  ),
);
