export const LANGUAGES = ['en', 'fr', 'es', 'pt', 'tr', 'it', 'nl', 'de', 'ja', 'ko', 'ar'] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English', fr: 'Français', es: 'Español', pt: 'Português', tr: 'Türkçe', it: 'Italiano',
  nl: 'Nederlands', de: 'Deutsch', ja: '日本語', ko: '한국어', ar: 'العربية',
};

export const RTL_LANGUAGES: Language[] = ['ar'];
