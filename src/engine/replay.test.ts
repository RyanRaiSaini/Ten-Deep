import { describe, expect, it } from 'vitest';
import { canRunItBack, compareFinish, finishOf, nextMark } from './replay';

describe('run it back', () => {
  it('ranks finishes by wins, then playoff depth, then fewer losses', () => {
    expect(compareFinish({ w: 60, l: 22, depth: 1 }, { w: 58, l: 24, depth: 5 })).toBeGreaterThan(0);
    expect(compareFinish({ w: 60, l: 22, depth: 5 }, { w: 60, l: 22, depth: 3 })).toBeGreaterThan(0);
    expect(compareFinish({ w: 60, l: 21, depth: 3 }, { w: 60, l: 22, depth: 3 })).toBeGreaterThan(0);
    expect(compareFinish({ w: 60, l: 22, depth: 3 }, { w: 60, l: 22, depth: 3 })).toBe(0);
  });

  it('keeps the best finish and counts the tries', () => {
    const first = finishOf({ wins: 47, losses: 35, champion: false, round: 0 });
    expect(first).toEqual({ w: 47, l: 35, depth: 1 });
    const m1 = nextMark(null, first);
    expect(m1).toEqual({ w: 47, l: 35, depth: 1, tries: 2 });
    const m2 = nextMark(m1, { w: 41, l: 41, depth: 0 }); // a worse try keeps the old best
    expect(m2).toEqual({ w: 47, l: 35, depth: 1, tries: 3 });
    const m3 = nextMark(m2, { w: 61, l: 21, depth: 5 });
    expect(m3).toEqual({ w: 61, l: 21, depth: 5, tries: 4 });
  });

  it('is offered for plain runs only', () => {
    const plain = { daily: null, weekly: null, challenge: null, crisis: null, career: false, draft: { seed: 'abc' } };
    expect(canRunItBack(plain)).toBe(true);
    expect(canRunItBack({ ...plain, daily: '2026-11-26' })).toBe(false);
    expect(canRunItBack({ ...plain, weekly: '2026-11-23' })).toBe(false);
    expect(canRunItBack({ ...plain, challenge: { name: 'Sam', w: 50, l: 32 } })).toBe(false);
    expect(canRunItBack({ ...plain, crisis: {} })).toBe(false);
    expect(canRunItBack({ ...plain, career: true })).toBe(false);
    expect(canRunItBack({ ...plain, draft: { seed: 'race-AAA-BBB-x' } })).toBe(false);
    expect(canRunItBack({ ...plain, draft: null })).toBe(false);
  });
});
