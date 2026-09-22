export type ThemePreference = 'light' | 'dark' | 'system';
export type Language = 'en' | 'fil' | 'es' | 'ja' | 'zh';
export type WeekStart = 'monday' | 'sunday';
export type TimeFormat = '12h' | '24h';

export interface UserSettings {
  theme: ThemePreference;
  notifications: boolean;
  soundEffects: boolean;
  language: Language;
  weekStartsOn: WeekStart;
  timeFormat: TimeFormat;
}

/**
 * No separate `UserProfile` type here — userStore.ts already made this call for the same
 * reason: this app has exactly one local profile, and `User` (types/user.ts) already
 * covers id/name/email/bio/avatar/createdAt/isGuest. A second identity type would just be
 * a copy that can drift out of sync with authStore.user.
 */
