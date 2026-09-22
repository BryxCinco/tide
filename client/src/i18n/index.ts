import type { Language } from '../types/settings';
import { useSettingsStore } from '../store/settingsStore';
import { translations, type TranslationKey } from './translations';

export type { TranslationKey } from './translations';

export interface LanguageMeta {
  code: Language;
  /** The language's own name, in its own script — what a picker row leads with. */
  nativeName: string;
  /** Parenthetical, for anyone who doesn't yet read the native script. */
  englishName: string;
  /** Flags are a deliberate exception to this app's "no emojis, Lucide icons only" rule —
   * they're the one place a flag reads as identification rather than decoration. */
  flag: string;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', flag: '🇺🇸' },
  { code: 'fil', nativeName: 'Filipino', englishName: 'Filipino', flag: '🇵🇭' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', flag: '🇪🇸' },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese', flag: '🇯🇵' },
  { code: 'zh', nativeName: '中文', englishName: 'Chinese', flag: '🇨🇳' },
];

export function translate(language: Language, key: TranslationKey): string {
  return translations[language][key] ?? translations.en[key] ?? key;
}

/** Non-hook entry points for call sites outside a component (rare — most translated UI is
 * components, which should use `useTranslation` instead so they re-render on change). */
export function getCurrentLanguage(): Language {
  return useSettingsStore.getState().settings.language;
}

export function setLanguage(language: Language): void {
  useSettingsStore.getState().updateSetting('language', language);
}

/**
 * `language` in `settingsStore` already updates immediately (it's a plain persisted
 * field, not a separate "i18n runtime" to sync) — the only thing this hook adds is
 * subscribing to it, so any component calling `t()` re-renders the instant `setLanguage`
 * is called elsewhere, e.g. from `LanguageModal`.
 */
export function useTranslation() {
  const language = useSettingsStore((s) => s.settings.language);
  const t = (key: TranslationKey): string => translate(language, key);
  return { t, language };
}
