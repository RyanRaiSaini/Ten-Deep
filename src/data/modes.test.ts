import { describe, expect, it } from 'vitest';
import { affordableSlots, fallbackPick, isComplete, options, pick, pickFallback, spin, startDraft } from '../engine/draft';
import { createRng } from '../engine/rng';
import { POSITIONS } from '../engine/types';
import { MODES, MODE_BY_ID } from './modes';
import { current2026 } from './current2026';
import { leagueFranchises } from '../engine/conference';
import { realLeague } from '../engine/realLeague';

describe('modes', () => {
  it('registers current day, All-Time plus the six eras (older eras kept hidden), and 30 franchises', () => {
    expect(MODES.filter((m) => m.kind === 'current')).toHaveLength(1);
    expect(MODES.filter((m) => m.kind === 'era' && !m.hidden).map((m) => `${m.title} ${m.subtitle}`)).toEqual([
      'All-Time Every era', 'Magic vs. Bird 1984–1991', 'Jordan Era 1991–2003', 'Kobe Era 2003–2010',
      'LeBron Era 2010–2016', 'Steph Era 2016–2020', 'Modern Era 2020–2026',
    ]);
    expect(MODES.filter((m) => m.kind === 'era' && m.hidden).map((m) => m.id)).toEqual(['era-shaq-kobe-duncan', 'era-1980s', 'era-1990s', 'era-2010s']);
    expect(MODES.filter((m) => m.kind === 'franchise')).toHaveLength(30);
  });

  it.each(MODES.map((m) => [m.id, m] as const))('%s: valid ratings, unique ids and names, all positions', (_, m) => {
    const players = m.pool.teams.flatMap((t) => t.players);
    for (const p of players) {
      expect(p.ovr).toBeGreaterThanOrEqual(64);
      expect(p.ovr).toBeLessThanOrEqual(99);
    }
    expect(new Set(players.map((p) => p.id)).size).toBe(players.length);
    // A player can be on several team-seasons (the draft takes each person once), but only once per team.
    for (const t of m.pool.teams) expect(new Set(t.players.map((p) => p.name)).size, t.id).toBe(t.players.length);
    const covered = new Set(players.flatMap((p) => [p.pos, p.pos2]));
    for (const pos of POSITIONS) expect(covered.has(pos)).toBe(true);
  });

  it('every era covers every team of every season, with full rosters; hand-set ratings are kept', () => {
    for (const id of ['era-magic-bird', 'era-jordan', 'era-kobe', 'era-lebron', 'era-steph', 'era-modern']) {
      const m = MODE_BY_ID[id];
      const [from, to] = m.subtitle.split('–').map(Number);
      for (let y = from; y <= Math.min(to, 2025); y++) {
        const teams = m.pool.teams.filter((t) => !t.season.includes('-') && Number(t.season) === y);
        // 23 teams in 1984-85, 30 since 2004-05.
        expect(teams.length, `${id} ${y}`).toBeGreaterThanOrEqual(y >= 2005 ? 30 : 23);
        for (const t of teams) expect(t.players.length, t.id).toBeGreaterThanOrEqual(10);
      }
    }
    const all = MODE_BY_ID['all-time'].pool.teams.flatMap((t) => t.players);
    const mj = all.filter((p) => p.name === 'Michael Jordan');
    expect(mj.length).toBeGreaterThan(10); // every season he played
    expect(Math.max(...mj.map((p) => p.ovr))).toBe(99);
    const bulls96 = MODE_BY_ID['all-time'].pool.teams.find((t) => t.id === 'chi-1996')!;
    expect(bulls96.players.map((p) => p.name)).toEqual(expect.arrayContaining(['Michael Jordan', 'Scottie Pippen', 'Dennis Rodman', 'Toni Kukoč', 'Steve Kerr', 'Luc Longley']));
  });

  it('era players cost their real contract that season (cap share), not a price by rating', async () => {
    const { payOf, contractType } = await import('../engine/cap');
    const bulls96 = MODE_BY_ID['era-jordan'].pool.teams.find((t) => t.id === 'chi-1996')!;
    const pay = (n: string) => payOf(bulls96.players.find((p) => p.name === n)!);
    // 1995-96: Jordan $3.85M and Kukoč $4.38M of a $23M cap; Kukoč out-earned Pippen.
    expect(pay('Michael Jordan')).toBeCloseTo(28.7, 0);
    expect(pay('Toni Kukoč')).toBeGreaterThan(pay('Scottie Pippen'));
    expect(pay('Steve Kerr')).toBeLessThan(10);
    // Players of the same rating are paid what they really were: no single price per rating.
    const players79 = MODE_BY_ID['era-steph'].pool.teams.flatMap((t) => t.players).filter((p) => p.ovr === 79);
    expect(new Set(players79.map(payOf)).size).toBeGreaterThan(15);
    const typed = MODE_BY_ID['era-steph'].pool.teams.flatMap((t) => t.players).map(contractType);
    expect(typed.filter((t) => t === 'rookie').length).toBeGreaterThan(50);
    expect(typed.filter((t) => t === 'max' || t === 'supermax').length).toBeGreaterThan(20);
  });

  it('every franchise pool has at least 40 players', () => {
    for (const m of MODES.filter((x) => x.kind === 'franchise'))
      expect(m.pool.teams.flatMap((t) => t.players).length, m.id).toBeGreaterThanOrEqual(40);
  });

  it('every mode can field a full 29-team AI league', () => {
    for (const m of MODES) {
      // The league the game builds: the 29 other franchises' real team-seasons from this mode's history.
      const seasons = m.kind === 'franchise' ? MODE_BY_ID['all-time'].pool.teams : m.pool.teams;
      const league = realLeague(leagueFranchises(0, `lg-${m.id}`), [], `lg-${m.id}`, seasons, MODE_BY_ID['all-time'].pool.teams, current2026.teams);
      expect(league, m.id).toHaveLength(29);
      for (const r of league) expect(Object.keys(r.slots), r.name).toHaveLength(10);
    }
  }, 60_000);

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
