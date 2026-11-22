import { describe, expect, it } from 'vitest';
import { LANGUAGES } from './languages';
import { resources } from './resources';

const keysOf = (obj: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keysOf(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

describe('i18n resources', () => {
  const en = keysOf(resources.en.translation).sort();

  it('ships all 11 languages', () => {
    expect(Object.keys(resources).sort()).toEqual([...LANGUAGES].sort());
  });

  it.each(LANGUAGES.filter((l) => l !== 'en'))('%s has exactly the same keys as English', (lng) => {
    expect(keysOf(resources[lng].translation).sort()).toEqual(en);
  });

  it.each([...LANGUAGES])('%s keeps every {{placeholder}} from English', (lng) => {
    const flat = (o: Record<string, unknown>, p = ''): [string, string][] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? flat(v as Record<string, unknown>, `${p}${k}.`) : [[`${p}${k}`, String(v)]]));
    const enMap = new Map(flat(resources.en.translation));
    for (const [k, v] of flat(resources[lng].translation)) {
      const want = (enMap.get(k)!.match(/{{\w+}}/g) ?? []).sort();
      expect((v.match(/{{\w+}}/g) ?? []).sort(), `${lng}:${k}`).toEqual(want);
    }
  });
});
