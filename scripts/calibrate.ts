/**
 * Calibration report: how hard is Ten Deep?
 *   npx tsx scripts/calibrate.ts [seasons] [k=0.012 star=0.05 scoreSd=10 ...]
 */
import { draftLeague } from '../src/engine/aiDraft';
import { affordableSlots, fallbackPick, isComplete, options, pick, pickFallback, spin, startDraft, type DraftState } from '../src/engine/draft';
import { champion, simPlayoffsToEnd, startPlayoffs } from '../src/engine/playoffs';
import { createRng } from '../src/engine/rng';
import { lineupMinutes, teamStrength } from '../src/engine/rotation';
import { advance, createSeason } from '../src/engine/season';
import { SIM } from '../src/engine/simConfig';
import { ALL_SLOTS, type Pool, type Roster, type RosterSlots } from '../src/engine/types';
import { current2026 } from '../src/data';

const net = (r: Roster) => teamStrength(lineupMinutes(r, new Set())).net;
const asRoster = (slots: RosterSlots, name: string): Roster => ({
  id: 'user', name, colors: ['#fff', '#000'], slots: slots as Required<RosterSlots>,
});

/** Randomized greedy search over the whole pool for the strongest legal roster. */
export function bestRoster(pool: Pool, tries = 150): Roster {
  const all = pool.teams.flatMap((t) => t.players);
  const rng = createRng('best-search');
  let best: Roster | null = null;
  for (let t = 0; t < tries; t++) {
    const noise = t === 0 ? 0 : 6;
    const order = [...all].map((p) => ({ p, v: p.ovr + rng.normal(0, noise) })).sort((a, b) => b.v - a.v).map((x) => x.p);
    let s: DraftState = startDraft(pool, 'best');
    while (!isComplete(s)) {
      const p = order.find((x) => !s.used.includes(x.id) && affordableSlots(s, x, pool).length);
      if (!p) break;
      const slot = affordableSlots(s, p, pool)[0];
      s = { ...s, roster: { ...s.roster, [slot]: p }, used: [...s.used, p.id], round: s.round + 1 };
    }
    if (!isComplete(s)) continue;
    const r = asRoster(s.roster, 'Best');
    if (!best || net(r) > net(best)) best = r;
  }
  return best!;
}

/** A sensible casual player: best affordable player each spin. */
export function spinDraft(pool: Pool, seed: string): Roster {
  let s = spin(startDraft(pool, seed), pool);
  while (!isComplete(s)) {
    const o = options(s, pool).find((x) => x.affordable);
    if (o) s = pick(s, o.player.id, o.slots[0], pool);
    else {
      // Nothing on this spin fits: take the cheapest signing that does (the draft screen offers the same).
      const fb = fallbackPick(s, pool);
      s = pickFallback(s, fb, affordableSlots(s, fb, pool)[0], pool);
    }
    if (!isComplete(s)) s = spin(s, pool);
  }
  return asRoster(s.roster, 'Spin');
}

/** A good drafter: best of 6 spin drafts (stands in for a player who uses respins and plans the cap). */
export function goodDraft(pool: Pool, seed: string): Roster {
  return Array.from({ length: 6 }, (_, i) => spinDraft(pool, `${seed}-${i}`)).sort((a, b) => net(b) - net(a))[0];
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
  return {
    avg: Number(avg.toFixed(1)), min: Math.min(...wins), max: Math.max(...wins),
    p70: wins.filter((w) => w >= 70).length / n, perfect: wins.filter((w) => w === 82).length,
    titleRate: titles / n,
  };
}

export function averageUser(pool: Pool, i: number): Roster {
  const lg = draftLeague(pool, new Set(), 30, createRng(`avg-${i}`)).sort((a, b) => net(a) - net(b));
  return { ...lg[15], id: 'user' };
}

if (process.argv[1]?.endsWith('calibrate.ts')) {
  const n = Number(process.argv[2] ?? 40);
  for (const arg of process.argv.slice(3)) {
    const [k, v] = arg.split('=');
    (SIM as Record<string, number>)[k] = Number(v);
  }
  console.log('SIM', SIM);
  const t0 = Date.now();
  const best = bestRoster(current2026);
  console.log('best:', ALL_SLOTS.map((s) => `${best.slots[s].name} ${best.slots[s].ovr}`).join(', '));
  console.log('BEST   ', JSON.stringify(runSeasons(best, current2026, n, 'best')));
  console.log('GOOD   ', JSON.stringify(runSeasons((i) => goodDraft(current2026, `good-${i}`), current2026, n, 'good')));
  console.log('SPIN   ', JSON.stringify(runSeasons((i) => spinDraft(current2026, `spin-${i}`), current2026, n, 'spin')));
  console.log('AVERAGE', JSON.stringify(runSeasons((i) => averageUser(current2026, i), current2026, n, 'avg')));
  console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
