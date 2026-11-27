/**
 * Proposed career development model (for review, not wired into the game yet): for every Current Day player, the
 * range of his rating change next season and his projected peak.
 *   npx tsx scripts/career/progression.mts [out.json]
 *
 * Mean change by age follows published NBA aging curves (peak ~26-27, fastest growth at 19-21, decline speeding up
 * after 30), converted at about 1.75 rating points per BPM point. Spread per age, the elite-young upside cut, the
 * cliff risk after 32 and injury risk from durability are estimates on top of that.
 */
import { writeFileSync } from 'node:fs';
import { current2026 } from '../../src/data/current2026';
import { createRng } from '../../src/engine/rng';
import type { Player } from '../../src/engine/types';

/** Average change in overall rating over one offseason, by age (age at the start of the season). */
const MEAN: Record<number, number> = {
  19: 2.6, 20: 2.4, 21: 2.0, 22: 1.6, 23: 1.1, 24: 0.7, 25: 0.4, 26: 0.2, 27: 0, 28: -0.3, 29: -0.6,
  30: -0.9, 31: -1.0, 32: -1.1, 33: -1.3, 34: -1.6, 35: -2.0, 36: -2.3, 37: -2.6, 38: -2.8, 39: -3.0, 40: -3.2,
};
/** Spread (standard deviation) of that change: young players swing the most. */
const SD = (age: number) => (age <= 22 ? 3.2 : age <= 24 ? 2.7 : age <= 29 ? 2.2 : age <= 32 ? 2.4 : 2.8);
const mean = (age: number) => MEAN[Math.max(19, Math.min(40, age))];

function normal(rng: { next: () => number }) {
  const u = 1 - rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng.next());
}

/** One offseason for one player: age curve, spread, elite-young cap, cliff years, injuries. */
function change(p: Player, age: number, ovr: number, rng: { next: () => number }) {
  let d = mean(age) + (p.rookie ? 0.5 : 0) + SD(age) * normal(rng);
  // Already elite and young: less room to grow (a 90 at 22 rarely adds 7).
  if (d > 0 && ovr >= 85 && age <= 24) d *= 0.75;
  // Cliff seasons after 32: about 1 in 10 lose 4-8 more.
  if (age >= 32 && rng.next() < 0.1) d -= 4 + 4 * rng.next();
  // A serious injury (more likely for low durability): 3-7 off.
  if (rng.next() < 0.03 + (100 - (p.dur ?? 80)) / 100 * 0.12) d -= 3 + 4 * rng.next();
  return Math.max(64 - ovr, Math.min(99 - ovr, d));
}

const pct = (xs: number[], q: number) => xs[Math.min(xs.length - 1, Math.max(0, Math.floor(q * xs.length)))];
const r1 = (n: number) => Math.round(n * 10) / 10;
const N = 20000;

const rows = current2026.teams.flatMap((t) => t.players.map((p) => ({ p, team: `${t.city} ${t.name}` })))
  .filter(({ p }) => p.age !== undefined)
  .map(({ p, team }) => {
    const age = p.age!;
    const rng = createRng(`dev:${p.id}`);
    const deltas: number[] = [];
    for (let i = 0; i < N; i++) deltas.push(change(p, age, p.ovr, rng));
    const up = deltas.filter((d) => d >= 0.5).sort((a, b) => a - b);
    const down = deltas.filter((d) => d <= -0.5).map((d) => -d).sort((a, b) => a - b);
    const all = [...deltas].sort((a, b) => a - b);
    // Peak: run careers to age 27 (or one season for players already 27+) and take the best rating reached.
    const peaks: number[] = [];
    const runs = 4000;
    for (let i = 0; i < runs; i++) {
      let ovr = p.ovr, best = p.ovr;
      for (let a = age; a < Math.max(age + 1, 27); a++) { ovr = Math.round(ovr + change(p, a, ovr, rng)); best = Math.max(best, ovr); }
      peaks.push(best);
    }
    peaks.sort((a, b) => a - b);
    const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
    return {
      name: p.name, team, pos: [p.pos, p.pos2, ...(p.more ?? [])].filter(Boolean).join('/'), age, ovr: p.ovr, rookie: !!p.rookie, dur: p.dur,
      improveChance: Math.round((up.length / N) * 100),
      progression: { low: up.length ? Math.max(1, Math.round(pct(up, 0.1))) : 0, avg: r1(avg(up)), max: up.length ? Math.round(pct(up, 0.95)) : 0 },
      regression: { low: down.length ? -Math.max(1, Math.round(pct(down, 0.1))) : 0, avg: -r1(avg(down)), max: down.length ? -Math.round(pct(down, 0.95)) : 0 },
      nextSeason: { worst: Math.round(p.ovr + pct(all, 0.1)), typical: Math.round(p.ovr + pct(all, 0.5)), best: Math.round(p.ovr + pct(all, 0.9)) },
      peak: age >= 27 ? null : { low: pct(peaks, 0.1), avg: pct(peaks, 0.5), high: pct(peaks, 0.9) },
    };
  })
  .sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name));

const out = process.argv[2] ?? 'docs/career/progression-2026-27.json';
writeFileSync(out, JSON.stringify({ model: { mean: MEAN, sd: { '19-22': 3.2, '23-24': 2.7, '25-29': 2.2, '30-32': 2.4, '33+': 2.8 } }, players: rows }, null, 1));
console.error(`wrote ${out}: ${rows.length} players`);
