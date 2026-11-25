import { describe, expect, it } from 'vitest';
import { canAfford } from './cap';
import {
  MAX_SUPERSTARS, affordableSlots, eligibleSlots, fallbackPick, isComplete, options, pick, pickFallback, respin, spin, startDraft,
} from './draft';
import { makePool } from './__fixtures__/pool';
import type { Player } from './types';

const pool = makePool();

function autoDraft(seed: string) {
  let s = spin(startDraft(pool, seed), pool);
  while (!isComplete(s)) {
    const opt = options(s, pool).find((o) => o.affordable && o.slots.length > 0);
    if (opt) s = pick(s, opt.player.id, opt.slots[0], pool);
    else {
      const p = fallbackPick(s, pool);
      s = pickFallback(s, p, affordableSlots(s, p, pool)[0], pool);
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
    expect(() => pick(s, p.id, 'PG', pool)).toThrow();
    const s2 = pick(s, p.id, 'B1', pool);
    expect(() => pick(s2, p.id, 'B2', pool)).toThrow();
  });

  it('rejects an unaffordable pick', () => {
    let s = spin(startDraft(pool, 'cap'), pool);
    // 94s are below the superstar line, so only the cap can block the fifth one ($39.5M each, $200M cap).
    const star = { ...pool.teams[0].players[0], ovr: 94, id: 'star', pos2: undefined };
    s = {
      ...s,
      roster: {
        PG: { ...star, id: 's1', name: 'Star 1', pos: 'PG' }, SG: { ...star, id: 's2', name: 'Star 2', pos: 'SG' }, SF: { ...star, id: 's3', name: 'Star 3', pos: 'SF' },
        PF: { ...star, id: 's4', name: 'Star 4', pos: 'PF' },
      },
      used: ['s1', 's2', 's3', 's4'],
      round: 4,
    };
    s = { ...s, spin: { ...s.spin!, players: [{ ...star, id: 's5', name: 'Star 5', pos: 'C' }] } };
    expect(options(s, pool)[0].affordable).toBe(false);
    expect(() => pick(s, 's5', 'C', pool)).toThrow(/cap/i);
  });

  it('the same person can\'t be drafted twice, even from another of his seasons', () => {
    let s = spin(startDraft(pool, 'dupe'), pool);
    const o = options(s, pool).find((x) => x.affordable)!;
    s = pick(s, o.player.id, o.slots[0], pool);
    const twin = { ...o.player, id: `${o.player.id}-another-season` };
    s = { ...s, spin: { ...s.spin ?? pool.teams[0], id: 'twin-team', players: [twin, ...pool.teams[1].players] } };
    expect(options(s, pool).some((x) => x.player.name === o.player.name)).toBe(false);
    expect(() => pick(s, twin.id, 'B5', pool)).toThrow(/already/);
  });

  it('one respin per draft, then respinning throws', () => {
    let s = spin(startDraft(pool, 'respin'), pool);
    expect(s.respinsLeft).toBe(1);
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
    expect(affordableSlots(open, p, pool).length).toBeGreaterThan(0);
    expect(canAfford(roster, p)).toBe(true);
  });
});

describe('draft on the real 2026 pool', async () => {
  const { current2026 } = await import('../data/current2026');
  const { createRng } = await import('./rng');

  it('random affordable picks (incl. greedy star-hunting) never dead-end across 300 drafts', () => {
    for (let d = 0; d < 300; d++) {
      const rng = createRng(`fuzz-${d}`);
      let s = spin(startDraft(current2026, `fuzz-${d}`), current2026);
      while (!isComplete(s)) {
        const ok = options(s, current2026).filter((o) => o.affordable);
        if (ok.length) {
          const o = d % 2 === 0 ? ok[0] : rng.pick(ok); // even drafts: always take the best player offered
          s = pick(s, o.player.id, rng.pick(o.slots), current2026);
        } else {
          const p = fallbackPick(s, current2026);
          s = pickFallback(s, p, affordableSlots(s, p, current2026)[0], current2026);
        }
        if (!isComplete(s)) s = spin(s, current2026);
      }
      expect(isComplete(s)).toBe(true);
    }
  });
});

describe('superstar limit', () => {
  it('blocks a third player rated 95+ even when the cap would allow it', () => {
    let s = spin(startDraft(pool, 'stars'), pool);
    const star = (id: string, pos: 'PG' | 'SG' | 'SF') => ({ ...pool.teams[0].players[0], id, name: `Star ${id}`, pos, pos2: undefined, ovr: 95 });
    s = { ...s, roster: { PG: star('a', 'PG'), SG: star('b', 'SG') }, used: ['a', 'b'], round: 2 };
    s = { ...s, spin: { ...s.spin!, players: [star('c', 'SF')] } };
    expect(MAX_SUPERSTARS).toBe(2);
    expect(options(s, pool)[0].affordable).toBe(false);
    expect(() => pick(s, 'c', 'SF', pool)).toThrow(/superstar/i);
  });
});
