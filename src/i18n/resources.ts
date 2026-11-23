import ar from './locales/ar.json';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import nl from './locales/nl.json';
import pt from './locales/pt.json';
import tr from './locales/tr.json';
import type { Language } from './languages';

/** Nested string table. Languages differ only in plural forms (`key_one`, `key_few`, …), which the i18n test checks. */
export interface Strings { [key: string]: string | Strings }

/** Non-English strings are first-pass translations, flagged for native-speaker review. */
export const resources: Record<Language, { translation: Strings }> = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
  pt: { translation: pt },
  tr: { translation: tr },
  it: { translation: it },
  nl: { translation: nl },
  de: { translation: de },
  ja: { translation: ja },
  ko: { translation: ko },
  ar: { translation: ar },
};
