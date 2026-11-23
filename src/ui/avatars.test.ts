import { describe, expect, it } from 'vitest';
import { AVATARS, avatarById } from './avatars';
import { SKINS, portraitSvg } from './portraits';

describe('avatars', () => {
  it('ships 40 unique illustrated portraits covering every skin tone', () => {
    expect(AVATARS).toHaveLength(40);
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(40);
    expect(new Set(AVATARS.map((a) => a.skin)).size).toBe(SKINS.length);
    expect(new Set(AVATARS.map((a) => a.hair)).size).toBeGreaterThanOrEqual(12);
  });

  it('each portrait is a self-contained SVG with ids unique to it (many render on one screen)', () => {
    const a = portraitSvg(AVATARS[0], AVATARS[0].id);
    const b = portraitSvg(AVATARS[1], AVATARS[1].id);
    const ids = (svg: string) => [...svg.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids(a).length).toBeGreaterThan(0);
    expect(ids(a).filter((x) => ids(b).includes(x))).toEqual([]);
    expect(a.startsWith('<svg')).toBe(true);
  });

  it('old saved ids map to a stable portrait instead of all becoming the first one', () => {
    expect(avatarById('floor-general-hardwood')).toBe(avatarById('floor-general-hardwood'));
    const olds = ['floor-general-hardwood', 'legend-gold', 'rookie-neon', 'dunker-royal', 'big-man-crimson'];
    expect(new Set(olds.map((o) => avatarById(o).id)).size).toBeGreaterThan(1);
    expect(avatarById(AVATARS[7].id)).toBe(AVATARS[7]);
  });
});
