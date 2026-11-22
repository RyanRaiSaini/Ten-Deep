/** Calibration report: how hard is Ten Deep? `npx tsx scripts/calibrate.ts [seasons]` */
import { draftLeague } from '../src/engine/aiDraft';
import { affordableSlots, isComplete, options, pick, spin, startDraft } from '../src/engine/draft';
import { champion, simPlayoffsToEnd, startPlayoffs } from '../src/engine/playoffs';
import { createRng } from '../src/engine/rng';
import { lineupMinutes, teamStrength } from '../src/engine/rotation';
import { advance, createSeason } from '../src/engine/season';
import { ALL_SLOTS, type Pool, type Roster, type RosterSlots, type SlotId } from '../src/engine/types';
import { current2026 } from '../src/data';

export function bestRoster(pool: Pool): Roster {
  // Greedy over the whole pool: best player that still lets the roster complete.
  let state = { ...startDraft(pool, 'best'), spin: null } as ReturnType<typeof startDraft>;
  const all = pool.teams.flatMap((t) => t.players).sort((a, b) => b.ovr - a.ovr);
  while (!isComplete(state)) {
    for (const p of all) {
      if (state.used.includes(p.id)) continue;
      const slots = affordableSlots(state, p, pool);
      if (slots.length) {
        state = { ...state, roster: { ...state.roster, [slots[0]]: p }, used: [...state.used, p.id], round: state.round + 1 };
        break;
      }
    }
  }
  return { id: 'user', name: 'Best', colors: ['#fff', '#000'], slots: state.roster as Required<RosterSlots> };
}

export function spinDraft(pool: Pool, seed: string): Roster {
  // A sensible player: take the best affordable player each spin, using a respin if the spin offers nothing.
  let s = spin(startDraft(pool, seed), pool);
  while (!isComplete(s)) {
    const o = options(s, pool).find((x) => x.affordable);
    if (o) s = pick(s, o.player.id, o.slots[0] as SlotId, pool);
    if (!isComplete(s)) s = spin(s, pool);
  }
  return { id: 'user', name: 'Spin', colors: ['#fff', '#000'], slots: s.roster as Required<RosterSlots> };
}

export function runSeasons(user: Roster | ((i: number) => Roster), pool: Pool, n: number, tag: string) {
  const wins: number[] = [];
  let titles = 0;
  for (let i = 0; i < n; i++) {
    const u = typeof user === 'function' ? user(i) : user;
    const exclude = new Set(ALL_SLOTS.map((s) => u.slots[s].id));
    const league = draftLeague(pool, exclude, 29, createRng(`${tag}-league-${i}`));
    let season = createSeason(u, league, `${tag}-season-${i}`);
    season = advance(advance(season, 82), 82);
    wins.push(season.records[0].w);
    if (champion(simPlayoffsToEnd(startPlayoffs(season))) === 0) titles++;
  }
  const avg = wins.reduce((a, b) => a + b, 0) / n;
  return { avg, max: Math.max(...wins), min: Math.min(...wins), p70: wins.filter((w) => w >= 70).length / n, perfect: wins.filter((w) => w === 82).length, titleRate: titles / n };
}

if (process.argv[1]?.endsWith('calibrate.ts')) {
  const n = Number(process.argv[2] ?? 40);
  const t0 = Date.now();
  const best = bestRoster(current2026);
  console.log('best roster:', ALL_SLOTS.map((s) => `${best.slots[s].name} ${best.slots[s].ovr}`).join(', '));
  console.log('best net', teamStrength(lineupMinutes(best, new Set())).net.toFixed(1));
  console.log('BEST   ', runSeasons(best, current2026, n, 'best'));
  console.log('SPIN   ', runSeasons((i) => spinDraft(current2026, `spin-${i}`), current2026, n, 'spin'));
  const avgUser = (i: number) => {
    const lg = draftLeague(current2026, new Set(), 30, createRng(`avg-${i}`));
    const sorted = lg.sort((a, b) => teamStrength(lineupMinutes(a, new Set())).net - teamStrength(lineupMinutes(b, new Set())).net);
    return { ...sorted[15], id: 'user' };
  };
  console.log('AVERAGE', runSeasons(avgUser, current2026, n, 'avg'));
  console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
