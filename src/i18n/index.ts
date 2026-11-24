// Plural forms need Intl.PluralRules; load a small polyfill only on engines that lack it.
import { getLocales } from 'expo-localization';
import i18n, { changeLanguage, use as addPlugin } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';
import { LANGUAGES, RTL_LANGUAGES, type Language } from './languages';
import { resources } from './resources';
// A conditional require keeps the polyfill out of engines that don't need it (an import would always load it).
// eslint-disable-next-line @typescript-eslint/no-require-imports
if (typeof Intl === 'undefined' || typeof Intl.PluralRules === 'undefined') require('intl-pluralrules');

export function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return (LANGUAGES as readonly string[]).includes(code) ? (code as Language) : 'en';
}

addPlugin(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export const isRTL = (lng: string) => RTL_LANGUAGES.includes(lng as Language);

/**
 * Switch language and flip layout direction for right-to-left languages (Arabic).
 * Web flips immediately via <html dir>. iOS/Android flip through I18nManager, which React Native
 * applies on the next app launch.
 */
export function applyLanguage(lng: Language) {
  if (i18n.language !== lng) changeLanguage(lng);
  const rtl = isRTL(lng);
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;
    }
  } else if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }
}

export default i18n;
