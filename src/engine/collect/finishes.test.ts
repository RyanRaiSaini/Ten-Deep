import { describe, expect, it } from 'vitest';
import { FINISHES, ONE_IN, bestFinish, finishFor, finishFromRoll } from './finishes';

describe('card finishes', () => {
  it('rolls the rarest finishes at their published odds', () => {
    const n = 400_000;
    const counts = Object.fromEntries(FINISHES.map((f) => [f, 0])) as Record<string, number>;
    for (let i = 0; i < n; i++) counts[finishFor(`p${i}`, 'card')]++;
    for (const [f, oneIn] of Object.entries(ONE_IN)) {
      const expected = n / oneIn;
      // Within ±25% (rainbow ~400 expected, cosmic ~80).
      expect(counts[f]).toBeGreaterThan(expected * 0.75);
      expect(counts[f]).toBeLessThan(expected * 1.25);
    }
  });

  it('is fixed per pick and card', () => {
    expect(finishFor('daily:2026-11-23', 'x')).toBe(finishFor('daily:2026-11-23', 'x'));
  });

  it('maps the roll edges', () => {
    expect(finishFromRoll(0)).toBe('cosmic');
    expect(finishFromRoll(0.9999)).toBe('base');
  });

  it('best finish of owned copies', () => {
    expect(bestFinish(undefined)).toBe('base');
    expect(bestFinish({ base: 3, gold: 1, holo: 2 })).toBe('gold');
  });
});
