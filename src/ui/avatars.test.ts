import { describe, expect, it } from 'vitest';
import { AVATARS, POSES, avatarById } from './avatars';

describe('avatars', () => {
  it('ships 40 unique avatars (8 poses × 5 palettes)', () => {
    expect(Object.keys(POSES)).toHaveLength(8);
    expect(AVATARS).toHaveLength(40);
    expect(new Set(AVATARS.map((a) => a.id)).size).toBe(40);
  });

  it('every pose keeps all joints inside the 100×100 canvas', () => {
    for (const [name, pose] of Object.entries(POSES))
      for (const [x, y] of Object.values(pose.joints)) {
        expect(x, name).toBeGreaterThanOrEqual(0);
        expect(x, name).toBeLessThanOrEqual(100);
        expect(y, name).toBeGreaterThanOrEqual(0);
        expect(y, name).toBeLessThanOrEqual(100);
      }
  });

  it('falls back to the first avatar for unknown ids (old saves)', () => {
    expect(avatarById('nope')).toBe(AVATARS[0]);
    expect(avatarById(AVATARS[7].id)).toBe(AVATARS[7]);
  });
});
