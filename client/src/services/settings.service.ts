import type { Language, TimeFormat, ThemePreference, UserSettings, WeekStart } from '../types/settings';
import { api } from './api';

export interface ApiUserSettings {
  user_id: string;
  theme: string;
  notifications: boolean;
  sound_effects: boolean;
  typing_sounds: boolean;
  language: string;
  week_starts_on: string;
  time_format: string;
  dashboard_widgets: unknown[];
  updated_at: string;
}

/** dashboard_widgets isn't part of UserSettings — dashboardStore owns widget layout locally
 * and isn't wired to the backend in this pass, so that column is read/written as-is but
 * never surfaced here. */
function mapApiSettings(row: ApiUserSettings): UserSettings {
  return {
    theme: row.theme as ThemePreference,
    notifications: row.notifications,
    soundEffects: row.sound_effects,
    typingSounds: row.typing_sounds,
    language: row.language as Language,
    weekStartsOn: row.week_starts_on as WeekStart,
    timeFormat: row.time_format as TimeFormat,
  };
}

export const settingsService = {
  async get(): Promise<UserSettings> {
    const { data } = await api.get<{ settings: ApiUserSettings }>('/api/settings');
    return mapApiSettings(data.settings);
  },

  async update(payload: Partial<UserSettings>): Promise<UserSettings> {
    const { data } = await api.patch<{ settings: ApiUserSettings }>('/api/settings', {
      theme: payload.theme,
      notifications: payload.notifications,
      sound_effects: payload.soundEffects,
      typing_sounds: payload.typingSounds,
      language: payload.language,
      week_starts_on: payload.weekStartsOn,
      time_format: payload.timeFormat,
    });
    return mapApiSettings(data.settings);
  },
};
