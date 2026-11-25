import { goodDraft, runSeasons } from './calibrate';
import { current2026 } from '../src/data';
import { squadRating } from '../src/engine/rotation';
import { SIM } from '../src/engine/simConfig';
import { ALL_SLOTS, type Roster } from '../src/engine/types';
// Overrides: npx tsx scripts/_tune.mts k=0.008 formSd=3
for (const a of process.argv.slice(2)) { const [k, v] = a.split('='); (SIM as Record<string, number>)[k] = Number(v); }
const N = Number(process.env.N ?? 30);
const bases = Array.from({ length: N }, (_, i) => goodDraft(current2026, `tune${i}`));
const shift = (r: Roster, d: number): Roster => ({ ...r, slots: Object.fromEntries(ALL_SLOTS.map((k) => {
  const p = r.slots[k]; const c = (x: number) => Math.max(40, Math.min(99, x + d));
  return [k, { ...p, ovr: c(p.ovr), off: c(p.off), def: c(p.def) }];
})) as Roster['slots'] });
const targets = (process.env.T ?? '83,85,87,89,91,93').split(',').map(Number);
for (const t of targets) {
  const res = runSeasons((i) => { const b = bases[i % N]; return shift(b, Math.round(t - squadRating(b))); }, current2026, N, `t${t}`);
  console.log(`SR ${t}: avg ${res.avg} min ${res.min} max ${res.max} 70+ ${(res.p70 * 100).toFixed(0)}% 82-0 ${res.perfect}/${N} titles ${(res.titleRate * 100).toFixed(0)}%`);
}
