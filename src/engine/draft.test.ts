import { describe, expect, it } from 'vitest';
import { canAfford } from './cap';
import {
  eligibleSlots, fallbackPick, isComplete, options, pick, pickFallback, respin, spin, startDraft,
} from './draft';
import { makePool } from './__fixtures__/pool';
import type { Player } from './types';

const pool = makePool();

function autoDraft(seed: string) {
  let s = spin(startDraft(pool, seed), pool);
  while (!isComplete(s)) {
    const opt = options(s).find((o) => o.affordable && o.slots.length > 0);
    if (opt) s = pick(s, opt.player.id, opt.slots[0]);
    else {
      const p = fallbackPick(s, pool);
      s = pickFallback(s, p, eligibleSlots(s, p)[0]);
    }
    if (!isComplete(s)) s = spin(s, pool);
  }
  return s;
}

describe('draft', () => {
  it('completes a full 10-pick draft', () => {
    const s = autoDraft('full');
    expect(isComplete(s)).toBe(true);
    expect(Object.keys(s.roster)).toHaveLength(10);
    expect(s.round).toBe(10);
  });

  it('never picks the same player twice', () => {
    const s = autoDraft('dupes');
    const ids = Object.values(s.roster).map((p) => p!.id);
    expect(new Set(ids).size).toBe(10);
  });

  it('is deterministic for the same seed', () => {
    expect(spin(startDraft(pool, 'x'), pool).spin!.id).toBe(spin(startDraft(pool, 'x'), pool).spin!.id);
    const a = autoDraft('same');
    const b = autoDraft('same');
    expect(Object.values(a.roster).map((p) => p!.id)).toEqual(Object.values(b.roster).map((p) => p!.id));
  });

  it('a C-only player cannot take the PG slot but can take a bench slot', () => {
    const s = startDraft(pool, 'slots');
    const center: Player = { ...pool.teams[0].players[4], pos: 'C', pos2: undefined };
    const slots = eligibleSlots(s, center);
    expect(slots).not.toContain('PG');
    expect(slots).toContain('C');
    expect(slots).toContain('B1');
  });

  it('rejects picking a used player, a wrong slot, or no active spin', () => {
    const s = spin(startDraft(pool, 'reject'), pool);
    const p = s.spin!.players.find((x) => x.pos !== 'PG' && x.pos2 !== 'PG')!;
    expect(() => pick(s, p.id, 'PG')).toThrow();
    const s2 = pick(s, p.id, 'B1');
    expect(() => pick(s2, p.id, 'B2')).toThrow();
  });

  it('rejects an unaffordable pick', () => {
    let s = spin(startDraft(pool, 'cap'), pool);
    const star = { ...pool.teams[0].players[0], ovr: 99, id: 'star' };
    s = { ...s, roster: { PG: { ...star, id: 's1' }, SG: { ...star, id: 's2' } }, round: 2 };
    s = { ...s, spin: { ...s.spin!, players: [{ ...star, id: 's3', pos: 'SF' }] } };
    expect(options(s)[0].affordable).toBe(false);
    expect(() => pick(s, 's3', 'SF')).toThrow(/cap/i);
  });

  it('respins decrement and then throw when exhausted', () => {
    let s = spin(startDraft(pool, 'respin'), pool);
    expect(s.respinsLeft).toBe(2);
    s = respin(s, pool);
    s = respin(s, pool);
    expect(s.respinsLeft).toBe(0);
    expect(() => respin(s, pool)).toThrow();
  });

  it('fallbackPick returns an affordable, eligible, unused player', () => {
    const s = autoDraft('fb-base');
    // rewind: drop the last two picks so two slots are open
    const roster = { ...s.roster };
    delete roster.B4; delete roster.B5;
    const used = Object.values(roster).map((p) => p!.id);
    const open = { ...s, roster, used, round: 8, spin: null };
    const p = fallbackPick(open, pool);
    expect(used).not.toContain(p.id);
    expect(eligibleSlots(open, p).length).toBeGreaterThan(0);
    expect(canAfford(roster, p)).toBe(true);
  });
});
