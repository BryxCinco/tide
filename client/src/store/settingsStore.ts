import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { UserSettings } from '../types/settings';
import { storage } from '../utils/storage';
import { useThemeStore } from './themeStore';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  notifications: true,
  soundEffects: true,
  language: 'en',
  weekStartsOn: 'monday',
  timeFormat: '12h',
};

interface SettingsState {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  resetSettings: () => void;
}

/** `system` resolves through the OS's current scheme; light/dark pass through as-is. */
function resolveTheme(pref: UserSettings['theme']): 'light' | 'dark' {
  if (pref !== 'system') return pref;
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

/**
 * This is the settings/preferences store — themeStore.ts stays the source of truth for
 * which of `light`/`dark` is actually applied (every `bg-base`/`text-primary`/etc.
 * className resolves against its CSS vars), since themeStore predates this store and nothing
 * about "dark mode is opt-in" needed to change. This store adds the one thing themeStore
 * can't express on its own: a `system` preference. Picking `theme` here resolves it
 * immediately via `resolveTheme` and pushes the result into `useThemeStore.setTheme` —
 * there's no dedicated ThemeSync component; the push happens right where the preference is
 * set instead.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      updateSetting: (key, value) => {
        set((state) => ({ settings: { ...state.settings, [key]: value } }));
        if (key === 'theme') {
          useThemeStore.getState().setTheme(resolveTheme(value as UserSettings['theme']));
        }
      },

      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
        useThemeStore.getState().setTheme('light');
      },
    }),
    {
      name: 'tide_settings',
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => (state) => {
        if (state) useThemeStore.getState().setTheme(resolveTheme(state.settings.theme));
      },
    },
  ),
);

// Keeps the applied theme in sync with the OS only while the user has explicitly chosen
// "system" — otherwise an OS-level scheme change would silently override an explicit
// light/dark pick, which is exactly the "always opt-in" behavior themeStore.ts documents.
Appearance.addChangeListener(({ colorScheme }) => {
  if (useSettingsStore.getState().settings.theme !== 'system') return;
  useThemeStore.getState().setTheme(colorScheme === 'dark' ? 'dark' : 'light');
});
