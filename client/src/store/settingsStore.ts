import { Appearance } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getApiErrorMessage } from '../services/api';
import { settingsService } from '../services/settings.service';
import type { UserSettings } from '../types/settings';
import { isGuestMode } from '../utils/authFlags';
import { storage } from '../utils/storage';
import { showToast } from './toastStore';
import { useThemeStore } from './themeStore';

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  notifications: true,
  soundEffects: true,
  typingSounds: true,
  language: 'en',
  weekStartsOn: 'monday',
  timeFormat: '12h',
};

interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  resetSettings: () => void;
  clearError: () => void;
}

/** `system` resolves through the OS's current scheme; light/dark pass through as-is. */
function resolveTheme(pref: UserSettings['theme']): 'light' | 'dark' {
  if (pref !== 'system') return pref;
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

const SETTINGS_DEBOUNCE_MS = 500;
let pendingUpdate: Partial<UserSettings> = {};
let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

function flushPendingSettings(): void {
  if (Object.keys(pendingUpdate).length === 0) return;
  const toSend = pendingUpdate;
  pendingUpdate = {};
  // Guests have no backend account/JWT — this store persists to localStorage/SecureStore
  // regardless of account type, so the local `set()` in updateSetting is already the whole
  // story for a guest; there's nothing to sync.
  if (isGuestMode()) return;
  settingsService.update(toSend).catch((err) => {
    showToast(getApiErrorMessage(err), 'error');
  });
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
 *
 * `updateSetting` applies locally and to the persisted local cache immediately (so the UI
 * never waits on the network for a toggle to visually flip), then debounces a PATCH to the
 * server — several settings flipped in quick succession collapse into one request instead
 * of one per toggle.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      error: null,

      fetchSettings: async () => {
        // Guests have no backend account/JWT — this store persists to
        // localStorage/SecureStore regardless of account type, so whatever's already
        // loaded there (or DEFAULT_SETTINGS, for a brand-new guest) is already correct.
        if (isGuestMode()) return;

        set({ isLoading: true, error: null });
        try {
          const settings = await settingsService.get();
          set({ settings, isLoading: false });
          useThemeStore.getState().setTheme(resolveTheme(settings.theme));
        } catch (err) {
          set({ error: getApiErrorMessage(err), isLoading: false });
        }
      },

      updateSetting: (key, value) => {
        set((state) => ({ settings: { ...state.settings, [key]: value } }));
        if (key === 'theme') {
          useThemeStore.getState().setTheme(resolveTheme(value as UserSettings['theme']));
        }

        pendingUpdate = { ...pendingUpdate, [key]: value };
        if (pendingTimeout) clearTimeout(pendingTimeout);
        pendingTimeout = setTimeout(flushPendingSettings, SETTINGS_DEBOUNCE_MS);
      },

      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
        useThemeStore.getState().setTheme('light');
        pendingUpdate = {};
        if (pendingTimeout) clearTimeout(pendingTimeout);
        if (isGuestMode()) return;
        settingsService.update(DEFAULT_SETTINGS).catch((err) => {
          showToast(getApiErrorMessage(err), 'error');
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'tide_settings',
      storage: createJSONStorage(() => storage),
      // Deep-merges `settings` instead of the persist middleware's default shallow merge,
      // so a field added to DEFAULT_SETTINGS after a user's store was already persisted
      // (e.g. typingSounds) actually gets its default instead of coming back `undefined`.
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<SettingsState>),
        settings: { ...current.settings, ...(persisted as Partial<SettingsState>)?.settings },
      }),
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
