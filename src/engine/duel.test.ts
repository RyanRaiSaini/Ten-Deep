import { describe, expect, it } from 'vitest';
import { current2026 } from '../data/current2026';
import { capRoom } from './cap';
import { duelOptions, duelPick, duelFallback, isDuelComplete, rosterOf, startDuel, type DuelState } from './duel';
import { createRng } from './rng';
import { bestOf7 } from './series';
import { ALL_SLOTS } from './types';

const pool = current2026;

function playOut(seed: string): { s: DuelState; turns: ('a' | 'b')[] } {
  let s = startDuel(pool, seed);
  const rng = createRng(`${seed}:bot`);
  const turns: ('a' | 'b')[] = [];
  while (!isDuelComplete(s)) {
    turns.push(s.turn);
    const opts = duelOptions(s, pool).filter((o) => o.affordable);
    if (opts.length) {
      const o = rng.pick(opts);
      s = duelPick(s, o.player.id, o.slots[0], pool);
    } else s = duelFallback(s, pool);
  }
  return { s, turns };
}

describe('duel draft', () => {
  it('completes two full, legal, disjoint rosters', () => {
    for (let i = 0; i < 20; i++) {
      const { s } = playOut(`duel-${i}`);
      const a = ALL_SLOTS.map((k) => s.a.roster[k]!.name);
      const b = ALL_SLOTS.map((k) => s.b.roster[k]!.name);
      expect(new Set([...a, ...b]).size).toBe(20);
      expect(capRoom(s.a.roster)).toBeGreaterThanOrEqual(0);
      expect(capRoom(s.b.roster)).toBeGreaterThanOrEqual(0);
    }
  });

  it('snake order: A picks first in round 1, B first in round 2', () => {
    const { turns } = playOut('snake');
    expect(turns.slice(0, 4)).toEqual(['a', 'b', 'b', 'a']);
    expect(turns).toHaveLength(20);
  });

  it('both players pick from the same spin each round', () => {
    let s = startDuel(pool, 'shared');
    const spinA = s.spin!.id;
    const o = duelOptions(s, pool).find((x) => x.affordable)!;
    s = duelPick(s, o.player.id, o.slots[0], pool);
    expect(s.turn).toBe('b');
    expect(s.spin!.id).toBe(spinA);
    expect(duelOptions(s, pool).some((x) => x.player.id === o.player.id)).toBe(false);
  });

  it('same seed, same spins', () => {
    expect(startDuel(pool, 'x').spin!.id).toBe(startDuel(pool, 'x').spin!.id);
  });
});

describe('bestOf7', () => {
  it('ends when one side reaches 4 and is deterministic', () => {
    const { s } = playOut('series');
    const r = bestOf7(rosterOf(s.a, 'A'), rosterOf(s.b, 'B'), createRng('ser'));
    expect(Math.max(r.winsA, r.winsB)).toBe(4);
    expect(r.games).toHaveLength(r.winsA + r.winsB);
    expect(bestOf7(rosterOf(s.a, 'A'), rosterOf(s.b, 'B'), createRng('ser'))).toEqual(r);
  });
});
