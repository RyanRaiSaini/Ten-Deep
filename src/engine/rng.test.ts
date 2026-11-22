import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = createRng('ten-deep');
    const b = createRng('ten-deep');
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng('seed-a');
    const b = createRng('seed-b');
    const sa = Array.from({ length: 20 }, () => a.next());
    const sb = Array.from({ length: 20 }, () => b.next());
    expect(sa).not.toEqual(sb);
  });

  it('next() stays in [0, 1)', () => {
    const r = createRng(42);
    for (let i = 0; i < 5000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(1, 6) covers exactly 1..6', () => {
    const r = createRng('dice');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(r.int(1, 6));
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('normal() has roughly the requested mean and sd', () => {
    const r = createRng('gauss');
    const xs = Array.from({ length: 20000 }, () => r.normal(10, 2));
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length);
    expect(mean).toBeCloseTo(10, 1);
    expect(sd).toBeGreaterThan(1.9);
    expect(sd).toBeLessThan(2.1);
  });

  it('fork(salt) is deterministic and independent of the parent', () => {
    const p1 = createRng('parent');
    const p2 = createRng('parent');
    const f1 = p1.fork('child');
    const f2 = p2.fork('child');
    const s1 = Array.from({ length: 10 }, () => f1.next());
    expect(Array.from({ length: 10 }, () => f2.next())).toEqual(s1);
    expect(Array.from({ length: 10 }, () => createRng('parent').next())).not.toEqual(s1);
  });

  it('pick() returns an element of the array', () => {
    const r = createRng('pick');
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) expect(arr).toContain(r.pick(arr));
  });
});
