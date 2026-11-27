/**
 * Career development (src/engine/career/development.ts) for every Current Day player: the range of his rating change
 * next season and his projected peak, for the owner's review page.
 *   npx tsx scripts/career/progression.mts [out.json]

 */
import { writeFileSync } from 'node:fs';
import { current2026 } from '../../src/data/current2026';
import { createRng } from '../../src/engine/rng';
import type { Player } from '../../src/engine/types';
import { MEAN, developDelta, outlookOf } from '../../src/engine/career/development';

const N = 20000;
/** One offseason through the game's own model, kept inside 64–99. */
const change = (p: Player, age: number, ovr: number, rng: { next: () => number; normal: (m: number, s: number) => number }, first: boolean) =>
  Math.max(64 - ovr, Math.min(99 - ovr, developDelta({ name: p.name, age, ovr, dur: p.dur, rookie: first && p.rookie }, rng)));

const pct = (xs: number[], q: number) => xs[Math.min(xs.length - 1, Math.max(0, Math.floor(q * xs.length)))];
const r1 = (n: number) => Math.round(n * 10) / 10;

const rows = current2026.teams.flatMap((t) => t.players.map((p) => ({ p, team: `${t.city} ${t.name}` })))
  .filter(({ p }) => p.age !== undefined)
  .map(({ p, team }) => {
    const age = p.age!;
    const rng = createRng(`dev:${p.id}`);
    const deltas: number[] = [];
    for (let i = 0; i < N; i++) deltas.push(change(p, age, p.ovr, rng, true));
    const up = deltas.filter((d) => d >= 0.5).sort((a, b) => a - b);
    const down = deltas.filter((d) => d <= -0.5).map((d) => -d).sort((a, b) => a - b);
    const all = [...deltas].sort((a, b) => a - b);
    // Peak: run careers to age 27 (or one season for players already 27+) and take the best rating reached.
    const peaks: number[] = [];
    const runs = 4000;
    for (let i = 0; i < runs; i++) {
      let ovr = p.ovr, best = p.ovr;
      for (let a = age; a < Math.max(age + 1, 27); a++) { ovr = Math.round(ovr + change(p, a, ovr, rng, a === age)); best = Math.max(best, ovr); }
      peaks.push(best);
    }
    peaks.sort((a, b) => a - b);
    const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
    return {
      name: p.name, team, outlook: outlookOf(p), pos: [p.pos, p.pos2, ...(p.more ?? [])].filter(Boolean).join('/'), age, ovr: p.ovr, rookie: !!p.rookie, dur: p.dur,
      improveChance: Math.round((up.length / N) * 100),
      progression: { low: up.length ? Math.max(1, Math.round(pct(up, 0.1))) : 0, avg: r1(avg(up)), max: up.length ? Math.round(pct(up, 0.95)) : 0 },
      regression: { low: down.length ? -Math.max(1, Math.round(pct(down, 0.1))) : 0, avg: -r1(avg(down)), max: down.length ? -Math.round(pct(down, 0.95)) : 0 },
      nextSeason: { worst: Math.round(p.ovr + pct(all, 0.1)), typical: Math.round(p.ovr + pct(all, 0.5)), best: Math.round(p.ovr + pct(all, 0.9)) },
      peak: age >= 27 ? null : { low: pct(peaks, 0.1), avg: pct(peaks, 0.5), high: pct(peaks, 0.9) },
    };
  })
  .sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name));

const out = process.argv[2] ?? 'docs/career/progression-2026-27.json';
writeFileSync(out, JSON.stringify({ model: { mean: MEAN }, players: rows }, null, 1));
console.error(`wrote ${out}: ${rows.length} players`);
