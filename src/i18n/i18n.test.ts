import { describe, expect, it } from 'vitest';
import { LANGUAGES, type Language } from './languages';
import { resources } from './resources';

const keysOf = (obj: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keysOf(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
const flat = (o: Record<string, unknown>, p = ''): [string, string][] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)]]));

/** i18next plural keys: `key_one`, `key_other`, … — each language has its own set of forms. */
const PLURAL = /_(zero|one|two|few|many|other)$/;
const base = (k: string) => k.replace(PLURAL, '');
const bases = (lng: Language) => [...new Set(keysOf(resources[lng].translation).map(base))].sort();

describe('i18n resources', () => {
  const en = bases('en');
  const pluralBases = [...new Set(keysOf(resources.en.translation).filter((k) => PLURAL.test(k)).map(base))];

  it('ships all 11 languages', () => {
    expect(Object.keys(resources).sort()).toEqual([...LANGUAGES].sort());
  });

  it.each(LANGUAGES.filter((l) => l !== 'en'))('%s has exactly the same keys as English', (lng) => {
    expect(bases(lng)).toEqual(en);
  });

  it.each([...LANGUAGES])('%s has every plural form its grammar needs', (lng) => {
    const want = [...new Intl.PluralRules(lng).resolvedOptions().pluralCategories].sort();
    const keys = keysOf(resources[lng].translation);
    for (const b of pluralBases) {
      const forms = keys.filter((k) => base(k) === b && PLURAL.test(k)).map((k) => k.match(PLURAL)![1]).sort();
      expect(forms, `${lng}:${b}`).toEqual(want);
    }
  });

  it.each([...LANGUAGES])('%s keeps every {{placeholder}} from English', (lng) => {
    const enMap = new Map(flat(resources.en.translation));
    for (const [k, v] of flat(resources[lng].translation)) {
      const plural = PLURAL.test(k);
      const ref = enMap.get(k) ?? enMap.get(`${base(k)}_other`)!;
      // Plural forms may spell the number out ("one game"), so {{count}} is optional there.
      const strip = (xs: string[]) => (plural ? xs.filter((x) => x !== '{{count}}') : xs).sort();
      expect(strip(v.match(/{{\w+}}/g) ?? []), `${lng}:${k}`).toEqual(strip(ref.match(/{{\w+}}/g) ?? []));
    }
  });
});

describe('recap lines for your own team', () => {
  it('read "You take the quarter", not "You takes the quarter"', async () => {
    const { createInstance } = await import('i18next');
    const i18n = createInstance();
    await i18n.init({ resources, lng: 'en', interpolation: { escapeValue: false } });
    expect(i18n.t('recap.run', { team: 'You', n: 9, context: 'you' })).toBe('You take the quarter, +9');
    expect(i18n.t('recap.run', { team: 'Denver Nuggets', n: 9, context: undefined })).toBe('Denver Nuggets takes the quarter, +9');
    expect(i18n.t('recap.blowout', { team: 'You', n: 20, context: 'you' })).toBe('You run away with it, +20');
  });
});
