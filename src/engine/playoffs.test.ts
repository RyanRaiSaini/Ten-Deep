import { describe, expect, it } from 'vitest';
import { draftLeague } from './aiDraft';
import { ALWAYS_SWEEP_WINS, SWEEP_WINS, forcedWinner, seriesWinner, simPlayoffsToEnd, startPlayoffs, type Series } from './playoffs';
import { createRng } from './rng';
import { SEASON_GAMES, advance, createSeason, type SeasonState } from './season';
import { ALL_SLOTS } from './types';
import { makePool } from './__fixtures__/pool';

const pool = makePool();
const teams = draftLeague(pool, new Set(), 30, createRng('po'));

/** A finished season where team 0 is a juggernaut (big rating lift) and its record is set to `w` wins. */
function seasonWith(w: number, seed: string): SeasonState {
  // A season-long lift (a plain `mod` is reset each round by the season's mods).
  const lifted = { ...createSeason(teams[0], teams.slice(1), seed), mods: [{ amount: 25, fromRound: 0, toRound: SEASON_GAMES }] };
  const s = advance(advance(lifted, SEASON_GAMES), SEASON_GAMES);
  const records = s.records.map((r, i) => (i === 0 ? { ...r, w, l: SEASON_GAMES - w } : r));
  return { ...s, records };
}

const series = (o: Partial<Series>): Series => ({ hi: 0, lo: 1, seedHi: 1, seedLo: 8, winsHi: 0, winsLo: 0, games: [], ...o });

describe('realistic playoff series', () => {
  it('forcedWinner: a sub-79-win team up 3-0 has to drop game 4; 81+ always wins; otherwise free', () => {
    const wins = (w0: number, w1: number) => (t: number) => (t === 0 ? w0 : w1);
    expect(forcedWinner(series({ winsHi: 3 }), wins(70, 40))).toBe(1);
    expect(forcedWinner(series({ winsLo: 3 }), wins(70, 50))).toBe(0);
    expect(forcedWinner(series({ winsHi: 3 }), wins(SWEEP_WINS, 40))).toBe(null);
    expect(forcedWinner(series({ winsHi: 3, winsLo: 1 }), wins(70, 40))).toBe(null);
    expect(forcedWinner(series({ winsHi: 1 }), wins(70, 40))).toBe(null);
    expect(forcedWinner(series({}), wins(ALWAYS_SWEEP_WINS, 40))).toBe(0);
    expect(forcedWinner(series({ winsHi: 2 }), wins(40, 82))).toBe(1);
  });

  for (const w of [70, 76, 80, 81, 82]) {
    it(`a ${w}-win juggernaut: ${w >= ALWAYS_SWEEP_WINS ? 'sweeps every round' : w >= SWEEP_WINS ? 'may sweep' : 'never sweeps'}; nobody under ${SWEEP_WINS} wins sweeps`, () => {
      for (let i = 0; i < 6; i++) {
        const ps = simPlayoffsToEnd(startPlayoffs(seasonWith(w, `po-${w}-${i}`)));
        for (const round of ps.rounds) for (const s of round) {
          const winner = seriesWinner(s)!;
          const swept = Math.min(s.winsHi, s.winsLo) === 0;
          const ww = ps.season.records[winner].w;
          if (swept) expect(ww, `${winner} swept with ${ww} wins`).toBeGreaterThanOrEqual(SWEEP_WINS);
          // Any 81+ team in a series (the higher seed if both are) wins it 4-0.
          const lock = [s.hi, s.lo].find((t) => ps.season.records[t].w >= ALWAYS_SWEEP_WINS);
          if (lock !== undefined) {
            expect(winner, 'an 81+ team lost a series').toBe(lock);
            expect(s.games.length, 'an 81+ team dropped a game').toBe(4);
          }
        }
        // Box scores stay real: every game has a winner and stats only for the two teams in it.
        const last = ps.rounds[ps.rounds.length - 1][0].games.at(-1)!.result;
        expect(last.homeScore).not.toBe(last.awayScore);
        expect(last.box.every((b) => ps.season.teams.some((t) => ALL_SLOTS.some((k) => t.slots[k].id === b.playerId)))).toBe(true);
      }
    });
  }
});
