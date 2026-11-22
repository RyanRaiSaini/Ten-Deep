import { describe, expect, it } from 'vitest';
import { draftLeague } from '../engine/aiDraft';
import { affordableSlots, fallbackPick, isComplete, options, pick, pickFallback, spin, startDraft } from '../engine/draft';
import { createRng } from '../engine/rng';
import { POSITIONS } from '../engine/types';
import { MODES, MODE_BY_ID, leaguePoolFor } from './modes';

describe('modes', () => {
  it('registers current day, 6 eras and 10 franchises', () => {
    expect(MODES.filter((m) => m.kind === 'current')).toHaveLength(1);
    expect(MODES.filter((m) => m.kind === 'era')).toHaveLength(6);
    expect(MODES.filter((m) => m.kind === 'franchise')).toHaveLength(10);
  });

  it.each(MODES.map((m) => [m.id, m] as const))('%s: valid ratings, unique ids and names, all positions', (_, m) => {
    const players = m.pool.teams.flatMap((t) => t.players);
    for (const p of players) {
      expect(p.ovr).toBeGreaterThanOrEqual(64);
      expect(p.ovr).toBeLessThanOrEqual(99);
    }
    expect(new Set(players.map((p) => p.id)).size).toBe(players.length);
    if (m.kind !== 'current') expect(new Set(players.map((p) => p.name)).size).toBe(players.length);
    const covered = new Set(players.flatMap((p) => [p.pos, p.pos2]));
    for (const pos of POSITIONS) expect(covered.has(pos)).toBe(true);
  });

  it('All-Time has at least 400 unique players and keeps prime versions', () => {
    const all = MODE_BY_ID['all-time'].pool.teams.flatMap((t) => t.players);
    expect(all.length).toBeGreaterThanOrEqual(400);
    const mj = all.filter((p) => p.name === 'Michael Jordan');
    expect(mj).toHaveLength(1);
    expect(mj[0].ovr).toBe(99);
  });

  it('every franchise pool has at least 40 players', () => {
    for (const m of MODES.filter((x) => x.kind === 'franchise'))
      expect(m.pool.teams.flatMap((t) => t.players).length, m.id).toBeGreaterThanOrEqual(40);
  });

  it('every mode can field a full 29-team AI league', () => {
    for (const m of MODES) {
      const league = MODE_BY_ID[leaguePoolFor(m)].pool;
      expect(() => draftLeague(league, new Set(), 29, createRng(`lg-${m.id}`)), m.id).not.toThrow();
    }
  });

  it.each(MODES.filter((m) => m.kind !== 'current').map((m) => [m.id, m] as const))(
    '%s: 50 random drafts never dead-end',
    (_, m) => {
      for (let d = 0; d < 50; d++) {
        const rng = createRng(`fz-${m.id}-${d}`);
        let s = spin(startDraft(m.pool, `fz-${m.id}-${d}`), m.pool);
        while (!isComplete(s)) {
          const ok = options(s, m.pool).filter((o) => o.affordable);
          if (ok.length) {
            const o = d % 2 ? rng.pick(ok) : ok[0];
            s = pick(s, o.player.id, rng.pick(o.slots), m.pool);
          } else {
            const p = fallbackPick(s, m.pool);
            s = pickFallback(s, p, affordableSlots(s, p, m.pool)[0], m.pool);
          }
          if (!isComplete(s)) s = spin(s, m.pool);
        }
      }
    },
    60_000,
  );
});
