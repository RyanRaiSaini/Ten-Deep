import { describe, expect, it } from 'vitest';
import { draftLeague } from './aiDraft';
import { capRoom } from './cap';
import { createRng } from './rng';
import { ALL_SLOTS, STARTER_SLOTS } from './types';
import { makePool } from './__fixtures__/pool';

const pool = makePool();

describe('draftLeague', () => {
  const exclude = new Set(pool.teams[0].players.slice(0, 5).map((p) => p.id));
  const league = draftLeague(pool, exclude, 29, createRng('league'));

  it('produces the requested number of full rosters', () => {
    expect(league).toHaveLength(29);
    for (const r of league) for (const s of ALL_SLOTS) expect(r.slots[s]).toBeDefined();
  });

  it('respects the cap for every roster', () => {
    for (const r of league) expect(capRoom(r.slots)).toBeGreaterThanOrEqual(0);
  });

  it('fills starter slots with position-eligible players', () => {
    for (const r of league)
      for (const s of STARTER_SLOTS) {
        const p = r.slots[s];
        expect(p.pos === s || p.pos2 === s).toBe(true);
      }
  });

  it('uses no player twice and none of the excluded players', () => {
    const ids = league.flatMap((r) => ALL_SLOTS.map((s) => r.slots[s].id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(exclude.has(id)).toBe(false);
  });

  it('spreads team strength (good and bad teams)', () => {
    const avgs = league.map((r) => ALL_SLOTS.reduce((s, k) => s + r.slots[k].ovr, 0) / 10);
    const mean = avgs.reduce((a, b) => a + b, 0) / avgs.length;
    const sd = Math.sqrt(avgs.reduce((a, b) => a + (b - mean) ** 2, 0) / avgs.length);
    expect(sd).toBeGreaterThan(1.5);
  });

  it('is deterministic for the same rng seed', () => {
    const again = draftLeague(pool, exclude, 29, createRng('league'));
    expect(again.map((r) => r.slots.PG.id)).toEqual(league.map((r) => r.slots.PG.id));
  });
});
