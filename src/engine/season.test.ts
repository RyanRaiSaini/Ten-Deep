import { describe, expect, it } from 'vitest';
import { draftLeague } from './aiDraft';
import { rollInjury } from './injuries';
import { champion, playNextGame, simPlayoffsToEnd, startPlayoffs } from './playoffs';
import { createRng } from './rng';
import { DEADLINE_GAME, LOG_BOX_GAMES, SEASON_GAMES, advance, createSeason, modAt, standings, tradeSwap } from './season';
import type { Player } from './types';
import { makePool } from './__fixtures__/pool';

const pool = makePool();
const teams = draftLeague(pool, new Set(), 30, createRng('s'));
const fresh = () => createSeason(teams[0], teams.slice(1), 'season-seed');

describe('injuries', () => {
  const p: Player = { ...pool.teams[0].players[0], dur: 50 };
  it('fragile players in heavy minutes get hurt more often than durable ones', () => {
    const N = 100000;
    const rf = createRng('inj-fragile');
    const rd = createRng('inj-durable');
    let fragile = 0;
    let durable = 0;
    for (let i = 0; i < N; i++) {
      if (rollInjury({ ...p, dur: 40 }, 36, rf)) fragile++;
      if (rollInjury({ ...p, dur: 95 }, 36, rd)) durable++;
    }
    // expected ratio (1.6 − 0.40) / (1.6 − 0.95) ≈ 1.85
    expect(fragile).toBeGreaterThan(durable * 1.5);
    expect(fragile / N).toBeLessThan(0.02);
  });
  it('returns a positive games-out count and a severity label', () => {
    const rng = createRng('inj2');
    let inj = null;
    while (!inj) inj = rollInjury(p, 40, rng);
    expect(inj.games).toBeGreaterThan(0);
    expect(['Day-to-day', 'Short-term', 'Long-term', 'Season-ending']).toContain(inj.label);
  });
});

describe('season', () => {
  it('every team plays exactly 82 games', () => {
    const s = advance(advance(fresh(), SEASON_GAMES), SEASON_GAMES);
    expect(s.round).toBe(SEASON_GAMES);
    for (const r of s.records) expect(r.w + r.l).toBe(82);
  });

  it('advance stops at the trade deadline, then continues', () => {
    const s = advance(fresh(), 100);
    expect(s.round).toBe(DEADLINE_GAME);
    expect(DEADLINE_GAME).toBe(50);
    expect(advance(s, 100).round).toBe(82);
  });

  it('injured players miss games and come back', () => {
    const s = advance(advance(fresh(), 100), 100);
    // injuries happen across the league over a season (the log only records the user's own)
    expect(Object.keys(s.injuries).length).toBeGreaterThan(5);
    for (const [, left] of Object.entries(s.injuries)) expect(left).toBeGreaterThanOrEqual(0);
  });

  it('a player injured for N games misses exactly N games', () => {
    const s0 = advance(fresh(), 10);
    const id = s0.teams[0].slots.PG.id;
    const played = (s: typeof s0, round: number) =>
      s.log.some((e) => e.kind === 'game' && e.round === round && e.result.box.some((b) => b.playerId === id));
    // as if he got hurt in the game just played, for 2 games
    let s = { ...s0, injuries: { ...s0.injuries, [id]: 2 } };
    s = advance(s, 1);
    expect(played(s, 10)).toBe(false);
    s = advance(s, 1);
    expect(played(s, 11)).toBe(false);
    s = advance(s, 1);
    expect(played(s, 12)).toBe(true);
  });

  it('the schedule is identical regardless of the JS engine sort algorithm', () => {
    const v8 = createSeason(teams[0], teams.slice(1), 'engine-check').schedule;
    const native = Array.prototype.sort;
    // A different, valid sort (insertion sort) — like JavaScriptCore/Hermes differing from V8.
    Array.prototype.sort = function <T>(this: T[], cmp?: (a: T, b: T) => number) {
      const c = cmp ?? ((a: T, b: T) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0));
      for (let i = 1; i < this.length; i++) {
        const x = this[i];
        let j = i - 1;
        while (j >= 0 && c(this[j], x) > 0) { this[j + 1] = this[j]; j--; }
        this[j + 1] = x;
      }
      return this;
    };
    try {
      expect(createSeason(teams[0], teams.slice(1), 'engine-check').schedule).toEqual(v8);
    } finally {
      Array.prototype.sort = native;
    }
  });

  it('is deterministic for the same seed', () => {
    const a = advance(fresh(), 30);
    const b = advance(fresh(), 30);
    expect(a.records).toEqual(b.records);
  });

  it('standings are sorted by wins', () => {
    const s = advance(advance(fresh(), 100), 100);
    const st = standings(s);
    for (let i = 1; i < st.length; i++) expect(st[i - 1].w).toBeGreaterThanOrEqual(st[i].w);
  });

  it('tradeSwap cannot add a third superstar', () => {
    const s = advance(fresh(), 100);
    const star = (id: string) => ({ ...pool.teams[0].players[0], id, name: `Star ${id}`, ovr: 96, pos: 'SF' as const });
    const user = { ...s.teams[0], slots: { ...s.teams[0].slots, PG: { ...star('a'), pos: 'PG' as const }, SG: { ...star('b'), pos: 'SG' as const } } };
    const withStars = { ...s, teams: [user, ...s.teams.slice(1)] };
    expect(() => tradeSwap(withStars, user.slots.B5.id, star('c'))).toThrow(/superstar/i);
  });

  it('keeps saved seasons small: box scores only for the most recent games', () => {
    const s = advance(advance(fresh(), 100), 100);
    const withBox = s.log.filter((e) => e.kind === 'game' && e.result.box.length > 0);
    expect(withBox.length).toBeLessThanOrEqual(LOG_BOX_GAMES);
    expect(s.log.filter((e) => e.kind === 'game')).toHaveLength(82);
  });

  it('advance also pauses at extra stops (crisis cards), then continues', () => {
    let s: ReturnType<typeof fresh> = { ...fresh(), stops: [20, 45, 70] };
    s = advance(s, 100);
    expect(s.round).toBe(20);
    s = advance(s, 100);
    expect(s.round).toBe(45);
    s = advance(s, 100);
    expect(s.round).toBe(DEADLINE_GAME);
    s = advance(s, 100);
    expect(s.round).toBe(70);
    expect(advance(s, 100).round).toBe(82);
  });

  it('team modifiers apply only inside their window', () => {
    expect(modAt([{ amount: 3, fromRound: 10, toRound: 20 }, { amount: 1, fromRound: 15, toRound: 82 }], 9)).toBe(0);
    expect(modAt([{ amount: 3, fromRound: 10, toRound: 20 }, { amount: 1, fromRound: 15, toRound: 82 }], 15)).toBe(4);
    expect(modAt([{ amount: 3, fromRound: 10, toRound: 20 }, { amount: 1, fromRound: 15, toRound: 82 }], 20)).toBe(1);
    // a huge boost for the first 10 games wins nearly all of them
    const boosted = advance({ ...fresh(), mods: [{ amount: 40, fromRound: 0, toRound: 10 }] }, 10);
    expect(boosted.records[0].w).toBeGreaterThanOrEqual(9);
  });

  it('exact standings ties do not always favor the user', () => {
    let userFirst = 0;
    for (let i = 0; i < 20; i++) {
      const s = createSeason(teams[0], teams.slice(1), `tie-${i}`);
      // everyone tied: same record and point differential
      const tied = { ...s, records: s.records.map(() => ({ w: 41, l: 41, pf: 9000, pa: 9000 })) };
      if (standings(tied)[0].team === 0) userFirst++;
    }
    expect(userFirst).toBeLessThan(5);
  });

  it('tradeSwap rejects a player who is already on a roster', () => {
    const s = advance(fresh(), 100);
    const someoneElse = s.teams[5].slots.PG;
    expect(() => tradeSwap(s, s.teams[0].slots.PG.id, someoneElse)).toThrow(/already/i);
  });

  it('tradeSwap replaces a user player in the same slot', () => {
    const s = advance(fresh(), 100);
    const outId = s.teams[0].slots.B5.id;
    // A made-up free agent (any real pool player might already be on an AI roster).
    const incoming = { ...pool.teams[29].players[12], id: 'incoming', name: 'Test Free Agent', ovr: 64 };
    const t = tradeSwap(s, outId, incoming);
    expect(t.teams[0].slots.B5.id).toBe('incoming');
    expect(t.deadlineUsed).toBe(true);
    expect(() => tradeSwap(t, 'incoming', { ...incoming, id: 'again' })).toThrow();
  });
});

describe('playoffs', () => {
  const done = advance(advance(fresh(), 100), 100);

  it('seeds 16 teams into 8 first-round series', () => {
    const ps = startPlayoffs(done);
    expect(ps.rounds[0]).toHaveLength(8);
  });

  it('a series ends when one side reaches 4 wins', () => {
    let ps = startPlayoffs(done);
    for (let i = 0; i < 7; i++) ps = playNextGame(ps);
    for (const s of ps.rounds[0]) {
      expect(Math.max(s.winsHi, s.winsLo)).toBe(4);
      expect(Math.min(s.winsHi, s.winsLo)).toBeLessThan(4);
    }
  });

  it('playing a playoff game does not mutate the previous state or the season totals', () => {
    const ps = startPlayoffs(done);
    const before = JSON.stringify(ps);
    const seasonTotals = JSON.stringify(done.totals);
    const after = playNextGame(ps);
    expect(JSON.stringify(ps)).toBe(before);
    expect(JSON.stringify(after.season.totals)).toBe(seasonTotals);
    expect(Object.keys(after.totals).length).toBeGreaterThan(0);
  });

  it('playoff injuries also last exactly N games', () => {
    const ps0 = startPlayoffs(done);
    const s = ps0.rounds[0][0];
    const id = ps0.season.teams[s.hi].slots.PG.id;
    const playedIn = (ps: typeof ps0, g: number) => ps.rounds[0][0].games[g]?.result.box.some((b) => b.playerId === id);
    let ps = { ...ps0, injuries: { ...ps0.injuries, [id]: 1 } };
    ps = playNextGame(ps);
    expect(playedIn(ps, 0)).toBe(false);
    ps = playNextGame(ps);
    expect(playedIn(ps, 1)).toBe(true);
  });

  it('crowns exactly one champion', () => {
    const ps = simPlayoffsToEnd(startPlayoffs(done));
    expect(ps.rounds).toHaveLength(4);
    expect(champion(ps)).toBeTruthy();
    expect(champion(startPlayoffs(done))).toBeNull();
  });
});
