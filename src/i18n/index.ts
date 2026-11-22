import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';
import { LANGUAGES, RTL_LANGUAGES, type Language } from './languages';
import { resources } from './resources';

export function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return (LANGUAGES as readonly string[]).includes(code) ? (code as Language) : 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Switch language and flip layout direction for right-to-left languages (Arabic). */
export function applyLanguage(lng: Language) {
  if (i18n.language !== lng) i18n.changeLanguage(lng);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.documentElement.dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr';
    document.documentElement.lang = lng;
  }
}

export default i18n;
