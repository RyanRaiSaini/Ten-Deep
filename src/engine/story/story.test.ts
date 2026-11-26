import { describe, expect, it } from 'vitest';
import { draftLeague } from '../aiDraft';
import { createRng } from '../rng';
import { SEASON_GAMES, advance, createSeason, type SeasonState } from '../season';
import { ALL_SLOTS, BENCH_SLOTS } from '../types';
import { makePool } from '../__fixtures__/pool';
import { awardRace, leaders } from './leaders';
import { roundNews, type Headline } from './news';
import { recap } from './recap';

const pool = makePool();
const teams = draftLeague(pool, new Set(), 30, createRng('story'));
const full = advance(advance({ ...createSeason(teams[0], teams.slice(1), 'story-seed'), deadlineUsed: true }, SEASON_GAMES), SEASON_GAMES);

describe('leaders', () => {
  it('ranks per-game averages, highest first, among players with enough games', () => {
    const top = leaders(full, 'pts', 5);
    expect(top).toHaveLength(5);
    for (let i = 1; i < top.length; i++) expect(top[i - 1].value).toBeGreaterThanOrEqual(top[i].value);
    for (const x of top) expect(full.totals[x.player.id].gp).toBeGreaterThanOrEqual(SEASON_GAMES * 0.6);
    expect(top[0].value).toBeCloseTo(full.totals[top[0].player.id].pts / full.totals[top[0].player.id].gp, 5);
  });

  it('works early in the season and on a season with no games', () => {
    const early = advance(createSeason(teams[0], teams.slice(1), 'early'), 3);
    expect(leaders(early, 'ast', 3)).toHaveLength(3);
    expect(leaders(createSeason(teams[0], teams.slice(1), 'zero'), 'reb', 3)).toEqual([]);
  });
});

describe('award races', () => {
  it('MVP goes to a productive player on a winning team', () => {
    const [mvp] = awardRace(full, 'mvp', 5);
    const rec = full.records[mvp.team];
    expect(rec.w).toBeGreaterThan(rec.l);
  });

  it('Sixth Man only considers bench players; ROY only young players', () => {
    for (const x of awardRace(full, 'smoy', 5)) {
      const slot = ALL_SLOTS.find((s) => full.teams[x.team].slots[s].id === x.player.id)!;
      expect(BENCH_SLOTS).toContain(slot);
    }
    for (const x of awardRace(full, 'roy', 5)) expect(x.player.age ?? 99).toBeLessThanOrEqual(21);
    const kid = { ...full.teams[3].slots.SG, age: 20 };
    const withKid = { ...full, teams: full.teams.map((t, i) => (i === 3 ? { ...t, slots: { ...t.slots, SG: kid } } : t)) };
    expect(awardRace(withKid, 'roy', 5).map((x) => x.player.id)).toContain(kid.id);
  });

  it('DPOY favors defenders', () => {
    const top = awardRace(full, 'dpoy', 3);
    const avgDef = Object.values(full.teams).flatMap((t) => ALL_SLOTS.map((s) => t.slots[s].def));
    const mean = avgDef.reduce((a, b) => a + b, 0) / avgDef.length;
    expect(top[0].player.def).toBeGreaterThan(mean);
  });
});

describe('news', () => {
  const s0 = createSeason(teams[0], teams.slice(1), 'news');
  const game = (s: SeasonState, round: number, us: number, them: number, box: { id: string; pts: number; reb?: number; ast?: number }[] = []) => ({
    kind: 'game' as const, round, home: 0, away: 1,
    result: { homeScore: us, awayScore: them, ot: 0, box: box.map((b) => ({ playerId: b.id, name: s.teams[0].slots.PG.name, pts: b.pts, reb: b.reb ?? 0, ast: b.ast ?? 0, min: 36 })) },
  });

  it('a five-game win streak makes the news; a 40-point night does too', () => {
    let s: SeasonState = { ...s0, records: s0.records.map((r) => ({ ...r })), log: [] };
    let news: Headline[] = [];
    for (let r = 0; r < 5; r++) {
      const e = game(s, r, 110, 100, r === 4 ? [{ id: s.teams[0].slots.PG.id, pts: 44 }] : []);
      s.log.push(e);
      s.records[0].w++;
      news = [...news, ...roundNews(s, r)];
    }
    expect(news.map((h) => h.kind)).toEqual(expect.arrayContaining(['streakW', 'big']));
    expect(news.find((h) => h.kind === 'streakW')!.n).toBe(5);
    expect(news.find((h) => h.kind === 'big')!.n).toBe(44);
  });

  it('a triple-double and a win milestone', () => {
    const s: SeasonState = { ...s0, records: s0.records.map((r, i) => (i === 0 ? { ...r, w: 50, l: 10 } : { ...r })), log: [] };
    s.log.push(game(s, 59, 120, 99, [{ id: s.teams[0].slots.PG.id, pts: 21, reb: 11, ast: 12 }]));
    const kinds = roundNews(s, 59).map((h) => h.kind);
    expect(kinds).toContain('triple');
    expect(kinds).toContain('wins');
  });

  it('taking first place is news once, not every few games while you hold it', async () => {
    const { POOLS } = await import('../../data');
    const lg = draftLeague(POOLS['current-2026'], new Set(), 30, createRng('n35'));
    const s = advance(advance({ ...createSeason(lg[0], lg.slice(1), 'n35'), deadlineUsed: true }, SEASON_GAMES), SEASON_GAMES);
    const firsts = (s.news ?? []).filter((h) => h.kind === 'first').map((h) => h.round);
    for (let i = 1; i < firsts.length; i++) expect(firsts[i] - firsts[i - 1], firsts.join()).not.toBe(11);
  });

  it('a full season produces a handful of headlines, stored on the season', () => {
    expect(full.news?.length ?? 0).toBeGreaterThan(3);
    expect(full.news!.length).toBeLessThanOrEqual(40);
  });
});

describe('recap', () => {
  const g = full.log.find((e) => e.kind === 'game' && e.result.box.length)!;
  if (g.kind !== 'game') throw new Error();

  it('quarter scores add up to the final, and replays identically', () => {
    const r = recap(g.result, full.teams[g.home], full.teams[g.away], 'seed');
    expect(r.periods[0].reduce((a, b) => a + b, 0)).toBe(g.result.homeScore);
    expect(r.periods[1].reduce((a, b) => a + b, 0)).toBe(g.result.awayScore);
    expect(r.periods[0]).toHaveLength(4 + g.result.ot);
    expect(recap(g.result, full.teams[g.home], full.teams[g.away], 'seed')).toEqual(r);
    expect(r.moments.length).toBeGreaterThan(1);
  });

  it('overtime games are tied after regulation and decided in the last OT', () => {
    const ot = { ...g.result, homeScore: 121, awayScore: 117, ot: 2 };
    const r = recap(ot, full.teams[g.home], full.teams[g.away], 'ot');
    const reg = (p: number[]) => p.slice(0, 4).reduce((a, b) => a + b, 0);
    expect(reg(r.periods[0])).toBe(reg(r.periods[1]));
    expect(r.periods[0][4]).toBe(r.periods[1][4]);
    expect(r.periods[0][5] - r.periods[1][5]).toBe(4);
    expect(r.moments.map((m) => m.kind)).toContain('ot');
  });
});

describe('box-score realism', () => {
  it('the scoring leader of a current-day season averages a modern 28–36 points', async () => {
    const { POOLS } = await import('../../data');
    const lg = draftLeague(POOLS['current-2026'], new Set(), 30, createRng('realism'));
    const s = advance(advance({ ...createSeason(lg[0], lg.slice(1), 'realism'), deadlineUsed: true }, SEASON_GAMES), SEASON_GAMES);
    const [top] = leaders(s, 'pts', 1);
    expect(top.ppg).toBeGreaterThanOrEqual(28);
    expect(top.ppg).toBeLessThan(36);
  });
});
