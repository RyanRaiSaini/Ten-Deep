import { describe, expect, it } from 'vitest';
import { draftLeague, fairLeague } from './aiDraft';
import { affordableSlots, fallbackPick, isComplete, options, pick, pickFallback, respin, spin, startDraft, type DraftState } from './draft';
import { createRng } from './rng';
import { advance, createSeason } from './season';
import { current2026 } from '../data/current2026';
import { makePool } from './__fixtures__/pool';
import { ALL_SLOTS, type Player, type Roster, type RosterSlots } from './types';

const pool = makePool();

/** Draft greedily; `respinAt` lists rounds where this player uses a respin first; `skip` picks the n-th best option. */
function draft(seed: string, { respinAt = [] as number[], skip = 0 } = {}): DraftState {
  let s = spin(startDraft(pool, seed), pool);
  while (!isComplete(s)) {
    if (respinAt.includes(s.round) && s.respinsLeft > 0 && (s.attempt ?? 0) === 1) s = respin(s, pool);
    const opts = options(s, pool).filter((o) => o.affordable && o.slots.length > 0);
    const opt = opts[Math.min(skip, opts.length - 1)];
    if (opt) s = pick(s, opt.player.id, opt.slots[0], pool);
    else { const p = fallbackPick(s, pool); s = pickFallback(s, p, affordableSlots(s, p, pool)[0], pool); }
    if (!isComplete(s)) s = spin(s, pool);
  }
  return s;
}

/** The team-season offered first in each round. */
function firstSpins(seed: string, respinAt: number[] = []) {
  const seen: string[] = [];
  let s = spin(startDraft(pool, seed), pool);
  while (!isComplete(s)) {
    seen.push(s.spin!.id);
    if (respinAt.includes(s.round) && s.respinsLeft > 0) s = respin(s, pool);
    const o = options(s, pool).find((x) => x.affordable && x.slots.length > 0);
    if (o) s = pick(s, o.player.id, o.slots[0], pool);
    else { const p = fallbackPick(s, pool); s = pickFallback(s, p, affordableSlots(s, p, pool)[0], pool); }
    if (!isComplete(s)) s = spin(s, pool);
  }
  return seen;
}

const names = (r: Roster) => ALL_SLOTS.map((k) => r.slots[k]!.name);
const user = (slots: RosterSlots): Roster => ({ id: 'user', name: 'You', colors: ['#000', '#fff'], slots: slots as Required<RosterSlots> });

describe('fair spins', () => {
  it('everyone on a seed sees the same team in every round, and a respin never changes later rounds', () => {
    const plain = firstSpins('fair-seed');
    const respun = firstSpins('fair-seed', [0, 3]);
    expect(respun).toEqual(plain);
  });
  it('the respin itself is the same for anyone who uses it in that round', () => {
    const a = spin(startDraft(pool, 'fair-seed'), pool);
    const b = spin(startDraft(pool, 'fair-seed'), pool);
    expect(respin(a, pool).spin!.id).toBe(respin(b, pool).spin!.id);
  });
});

describe('fair league', () => {
  it('the same seed and the same picks give the same league and the same season', () => {
    const a = draft('league-seed');
    const b = draft('league-seed');
    const la = fairLeague(pool, Object.values(a.roster) as Player[], createRng('league-seed:league'));
    const lb = fairLeague(pool, Object.values(b.roster) as Player[], createRng('league-seed:league'));
    expect(la.map(names)).toEqual(lb.map(names));
    const sa = advance(createSeason(user(a.roster), la, 'league-seed'), 82);
    const sb = advance(createSeason(user(b.roster), lb, 'league-seed'), 82);
    expect(sa.records).toEqual(sb.records);
  });

  it('different picks only change the AI slots that held a player you took; nobody else moves', () => {
    const a = draft('league-seed');
    const b = draft('league-seed', { skip: 1 });
    const base = draftLeague(pool, new Set(), 29, createRng('league-seed:league'));
    for (const d of [a, b]) {
      const mine = Object.values(d.roster) as Player[];
      const mineNames = new Set(mine.map((p) => p.name));
      const league = fairLeague(pool, mine, createRng('league-seed:league'));
      league.forEach((r, i) => ALL_SLOTS.forEach((k) => {
        const was = base[i].slots[k]!;
        const now = r.slots[k]!;
        if (mineNames.has(was.name)) expect(now.name).not.toBe(was.name);
        else expect(now.id).toBe(was.id);
        expect(mineNames.has(now.name)).toBe(false);
      }));
      // No player appears twice anywhere.
      const everyone = [...league.flatMap(names), ...mine.map((p) => p.name)];
      expect(new Set(everyone).size).toBe(everyone.length);
    }
  });

  it('a replacement fits the slot and is the closest-rated eligible player', () => {
    const d = draft('league-seed');
    const mine = Object.values(d.roster) as Player[];
    const base = draftLeague(pool, new Set(), 29, createRng('league-seed:league'));
    const league = fairLeague(pool, mine, createRng('league-seed:league'));
    const inUse = new Set([...league.flatMap(names), ...mine.map((p) => p.name)]);
    league.forEach((r, i) => ALL_SLOTS.forEach((k) => {
      const was = base[i].slots[k]!;
      const now = r.slots[k]!;
      if (was.id === now.id) return;
      if (!k.startsWith('B')) expect([now.pos, now.pos2]).toContain(k);
      const fits = (x: Player) => k.startsWith('B') || x.pos === k || x.pos2 === k;
      const closer = pool.teams.flatMap((t) => t.players).filter((x) => !inUse.has(x.name) && fits(x) && Math.abs(x.ovr - was.ovr) < Math.abs(now.ovr - was.ovr));
      expect(closer).toEqual([]);
    }));
  });

  // Taking a star from an AI team weakens that team (the best unused player is a step down); it's the same for
  // everyone who takes him. This only guards against pathological swaps.
  it('on the real 2026 pool, swaps happen and stay within a sane range', () => {
    let s = spin(startDraft(current2026, 'real-seed'), current2026);
    while (!isComplete(s)) {
      const o = options(s, current2026).find((x) => x.affordable && x.slots.length > 0);
      if (o) s = pick(s, o.player.id, o.slots[0], current2026);
      else { const p = fallbackPick(s, current2026); s = pickFallback(s, p, affordableSlots(s, p, current2026)[0], current2026); }
      if (!isComplete(s)) s = spin(s, current2026);
    }
    const base = draftLeague(current2026, new Set(), 29, createRng('real-seed:league'));
    const league = fairLeague(current2026, Object.values(s.roster) as Player[], createRng('real-seed:league'));
    let swaps = 0;
    let worst = 0;
    league.forEach((r, i) => ALL_SLOTS.forEach((k) => {
      if (base[i].slots[k]!.id === r.slots[k]!.id) return;
      swaps++;
      worst = Math.max(worst, Math.abs(base[i].slots[k]!.ovr - r.slots[k]!.ovr));
    }));
    expect(swaps).toBeGreaterThan(0);
    expect(worst).toBeLessThan(20);
  });
});
