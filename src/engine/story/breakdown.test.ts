import { describe, expect, it } from 'vitest';
import { draftLeague } from '../aiDraft';
import { createRng } from '../rng';
import { SEASON_GAMES, advance, createSeason } from '../season';
import { makePool } from '../__fixtures__/pool';
import { seasonBreakdown } from './breakdown';

const pool = makePool();
const teams = draftLeague(pool, new Set(), 30, createRng('bd'));
const done = advance(advance({ ...createSeason(teams[0], teams.slice(1), 'bd-season'), deadlineUsed: true }, SEASON_GAMES), SEASON_GAMES);

describe('season breakdown', () => {
  const b = seasonBreakdown(done);

  it('adds up: record, close games, streak, luck against the point-differential expectation', () => {
    expect(b.wins + b.losses).toBe(82);
    expect(b.close.w + b.close.l).toBeLessThanOrEqual(82);
    expect(b.longestStreak).toBeLessThanOrEqual(b.wins);
    expect(b.luck).toBe(b.wins - b.expected);
    expect(b.expected).toBeGreaterThanOrEqual(0);
    expect(b.expected).toBeLessThanOrEqual(82);
    // A positive margin means a winning expectation, and the other way round.
    if (b.diff > 1) expect(b.expected).toBeGreaterThan(41);
    if (b.diff < -1) expect(b.expected).toBeLessThan(41);
  });

  it('rates you against the league', () => {
    expect(b.srRank).toBeGreaterThanOrEqual(1);
    expect(b.srRank).toBeLessThanOrEqual(30);
    expect(b.teams).toBe(30);
    expect(b.leagueSr).toBeGreaterThan(60);
  });

  it('counts injury games once each, never past the end of the season', () => {
    const userInjuries = done.log.filter((e) => e.kind === 'injury' && e.team === 0);
    expect(b.injuries.games).toBeLessThanOrEqual(userInjuries.reduce((n, e) => n + (e.kind === 'injury' ? e.games : 0), 0));
    expect(b.injuries.starterGames).toBeLessThanOrEqual(b.injuries.games);
    if (b.injuries.games > 0) expect(b.injuries.worst!.games).toBeGreaterThan(0);
  });
});
