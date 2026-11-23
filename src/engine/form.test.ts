import { describe, expect, it } from 'vitest';
import { addGame, calibrate, computeForm, gameScore, normName, type Production, type RatedPlayer } from './form';

const line = (pts: number, min = 32) => ({ min, pts, fgm: pts / 2.4, fga: pts / 1.1, ftm: 3, fta: 4, oreb: 1, dreb: 4, ast: 4, stl: 1, blk: 0.5, tov: 2, pf: 2 });

/** A league where rating and production line up: rating = 60 + 1.5 × Game Score. */
function league(): { players: RatedPlayer[]; season: Map<string, Production> } {
  const players: RatedPlayer[] = [];
  const season = new Map<string, Production>();
  for (let i = 0; i < 60; i++) {
    const g = 4 + i * 0.3;
    players.push({ name: `Player ${i}`, ovr: Math.round(60 + 1.5 * g), age: 27 });
    season.set(normName(`Player ${i}`), { gp: 20, min: 20 * 28, gmsc: g });
  }
  return { players, season };
}

describe('form', () => {
  it('normalises names across sources', () => {
    expect(normName('Kristaps Porziņģis')).toBe(normName('Kristaps Porzingis'));
    expect(normName("Jaren Jackson Jr.")).toBe('jaren jackson');
    expect(normName('Nikola Jokić')).toBe('nikola jokic');
  });

  it('game score is higher for a better line', () => {
    expect(gameScore(line(30))).toBeGreaterThan(gameScore(line(10)));
  });

  it('calibrates rating against production', () => {
    const { a, b } = calibrate(Array.from({ length: 40 }, (_, i) => ({ gmsc: i, ovr: 60 + 1.5 * i })));
    expect(b).toBeCloseTo(1.5, 5);
    expect(a).toBeCloseTo(60, 5);
  });

  it('a rookie having a big year climbs (up to +9); players matching their rating stay put', () => {
    const { players, season } = league();
    players.push({ name: 'Darius Acuff Jr.', ovr: 76, age: 20 });
    season.set(normName('Darius Acuff'), { gp: 18, min: 18 * 33, gmsc: 17 }); // plays like an 85
    const out = computeForm(players, season, new Map());
    expect(out[normName('Darius Acuff')].d).toBeGreaterThanOrEqual(4);
    expect(out[normName('Darius Acuff')].d).toBeLessThanOrEqual(9);
    expect(out[normName('Player 30')]).toBeUndefined();
  });

  it('a hot week adds on top; a cold one takes away; tiny samples are ignored', () => {
    const { players, season } = league();
    const recent = new Map<string, Production>([
      [normName('Player 20'), { gp: 3, min: 96, gmsc: 10 + 12 }],
      [normName('Player 40'), { gp: 3, min: 96, gmsc: 16 - 10 }],
    ]);
    season.set(normName('Player 50'), { gp: 2, min: 60, gmsc: 30 });
    const out = computeForm(players, season, recent);
    expect(out[normName('Player 20')].d).toBeGreaterThan(0);
    expect(out[normName('Player 40')].d).toBeLessThan(0);
    expect(out[normName('Player 50')]).toBeUndefined();
  });

  it('accumulates games into a per-game average', () => {
    const p = addGame(addGame(undefined, line(20)), line(30));
    expect(p.gp).toBe(2);
    expect(p.gmsc).toBeCloseTo((gameScore(line(20)) + gameScore(line(30))) / 2, 5);
  });
});
