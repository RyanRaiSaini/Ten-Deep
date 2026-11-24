/**
 * Build src/data/contracts.ts from the cached Basketball Reference pages (scripts/contracts/fetch.mts).
 *   npx tsx scripts/contracts/build.mts <cacheDir>
 *
 * Every real salary becomes a share of that season's salary cap, then game dollars:
 *   game $M = salary / cap × 171.4   (so a 35% supermax = $60M, a 30% max ≈ $51M, a 25% max ≈ $43M)
 * Types: supermax (≥34% of cap), max (≥24.5%, from 1999-00 when max contracts began), rookie scale
 * (first 4 years, between minimum and 9% of cap, from 1995-96 when the rookie scale began), two-way (marked TW),
 * minimum (≤ the 10-year veteran minimum), standard otherwise.
 * Seasons before the cap (pre-1984-85) use an implied cap: the season's real top salary / 0.35.
 * Players with no salary on record keep a rating-based estimate fitted to the real data (reported as coverage).
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { current2026 } from '../../src/data/current2026';
import { HISTORY } from '../../src/data/modes';
import { endYear } from './teams';

const dir = process.argv[2];
export const K = 60 / 0.35;

const text = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const money = (s: string) => { const n = Number(s.replace(/[$,]/g, '')); return Number.isFinite(n) && n > 0 ? n : null; };
/** "Nikola Jokić" → "nikola jokic"; drops Jr./Sr./II/III and punctuation. */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\(tw\)/g, '').replace(/[.'’,-]/g, ' ').replace(/\b(jr|sr|ii|iii|iv)\b/g, '').replace(/\s+/g, ' ').trim();

function rows(html: string, tableId: string): Record<string, { text: string; cls: string }>[] {
  // Tables after the first few are wrapped in HTML comments; unwrap them.
  const s = html.replace(/<!--/g, '').replace(/-->/g, '');
  const i = s.indexOf(`id="${tableId}"`);
  if (i < 0) return [];
  const seg = s.slice(i, s.indexOf('</table>', i));
  return [...seg.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => {
    const out: Record<string, { text: string; cls: string }> = {};
    for (const c of m[1].matchAll(/<t[dh]([^>]*)data-stat="([^"]+)"([^>]*)>([\s\S]*?)<\/t[dh]>/g)) {
      out[c[2]] = { text: text(c[4]), cls: `${c[1]} ${c[3]} ${c[4].match(/class="([^"]+)"/)?.[1] ?? ''}` };
    }
    return out;
  });
}

// ---- caps by season end year ----
const caps = new Map<number, number>();
for (const r of rows(readFileSync(join(dir, 'caphist.html'), 'utf8'), 'salary_cap_history')) {
  const y = r.year_id?.text; const c = r.cap && money(r.cap.text);
  if (y && /^\d{4}-\d{2}$/.test(y) && c) caps.set(Number(y.slice(0, 4)) + 1, c);
}
if (!caps.get(2027)) throw new Error('no 2026-27 cap');

type Real = { salary: number; exp: number | null; tw: boolean; option: boolean };
/** Season end year → normalized name → real contract info. */
const bySeason = new Map<number, Map<string, Real>>();
const put = (y: number, name: string, r: Real) => {
  const m = bySeason.get(y) ?? new Map(); bySeason.set(y, m);
  const k = norm(name); const old = m.get(k);
  m.set(k, old ? { ...old, ...r, salary: Math.max(old.salary, r.salary), exp: r.exp ?? old.exp, tw: old.tw || r.tw } : r);
};

const files = readdirSync(dir);
for (const f of files) {
  const html = readFileSync(join(dir, f), 'utf8');
  let m: RegExpMatchArray | null;
  if ((m = f.match(/^team-([A-Z]+)-(\d{4})\.html$/))) {
    const y = Number(m[2]);
    const exp = new Map<string, { exp: number | null; tw: boolean }>();
    for (const r of rows(html, 'roster')) {
      if (!r.player) continue;
      const e = r.years_experience?.text;
      exp.set(norm(r.player.text), { exp: e === 'R' ? 0 : e && /^\d+$/.test(e) ? Number(e) : null, tw: /\(TW\)/.test(r.player.text) });
    }
    for (const r of rows(html, 'salaries2')) {
      const s = r.salary && money(r.salary.text);
      if (!r.player || !s) continue;
      const x = exp.get(norm(r.player.text));
      put(y, r.player.text, { salary: s, exp: x?.exp ?? null, tw: !!x?.tw, option: false });
    }
    // Two-way players are on the roster but often not in the salary table.
    for (const [k, x] of exp) if (x.tw && !bySeason.get(y)?.has(k)) put(y, k, { salary: caps.get(y)! * 0.0047, exp: x.exp, tw: true, option: false });
    for (const [k, x] of exp) { const cur = bySeason.get(y)?.get(k); if (cur) cur.exp = cur.exp ?? x.exp; }
  } else if ((m = f.match(/^con-([A-Z]+)\.html$/))) {
    for (const r of rows(html, `contracts_${m[1].toLowerCase()}`)) {
      const s = r.y1 && money(r.y1.text);
      if (!r.player || !s) continue;
      const option = /salary-tm/.test(r.y2?.cls ?? '') || /salary-tm/.test(r.y3?.cls ?? '');
      put(2027, r.player.text, { salary: s, exp: null, tw: false, option });
    }
  }
}

// ---- implied caps before the real cap existed ----
for (const [y, m] of bySeason) if (!caps.has(y) && m.size) caps.set(y, Math.max(...[...m.values()].map((r) => r.salary)) / 0.35);

export type ContractType = 'supermax' | 'max' | 'rookie' | 'twoWay' | 'min' | 'standard' | 'est';
const VET_MIN_SHARE = 0.0225; // ≈ the 10-year veteran minimum as a share of the cap (2026-27: ~$3.7M of $165M)

function classify(y: number, r: Real): ContractType {
  const pct = r.salary / caps.get(y)!;
  if (r.tw) return 'twoWay';
  if (y >= 2000 && pct >= 0.34) return 'supermax';
  if (y >= 2000 && pct >= 0.245) return 'max';
  if (y >= 1996 && r.exp !== null && r.exp <= 3 && pct > 0.012 && pct <= 0.09 && (r.option || r.exp <= 3)) {
    // Rookie scale: first four seasons, paid on the scale (between the minimum and ~9% of the cap).
    if (pct > VET_MIN_SHARE * 0.6) return 'rookie';
  }
  if (y >= 1985 && pct <= VET_MIN_SHARE) return 'min';
  return 'standard';
}

const gameDollars = (y: number, salary: number) => Math.min(60, Math.max(0.5, Math.round((salary / caps.get(y)!) * K * 10) / 10));

// ---- match our players ----
type Row = { id: string; name: string; ovr: number; season: string; y: number };
const ours: Row[] = [
  ...HISTORY.filter((t) => !t.season.includes('-')).flatMap((t) => t.players.map((p) => ({ id: p.id, name: p.name, ovr: p.ovr, season: t.season, y: endYear(t.season) }))),
  ...current2026.teams.flatMap((t) => t.players.map((p) => ({ id: p.id, name: p.name, ovr: p.ovr, season: '2026-27', y: 2027 }))),
];
const out: Record<string, [number, ContractType]> = {};
const missing: Row[] = [];
for (const p of ours) {
  const r = bySeason.get(p.y)?.get(norm(p.name));
  if (r) out[p.id] = [gameDollars(p.y, r.salary), classify(p.y, r)];
  else missing.push(p);
}

// ---- rating fallback, fitted to the real data: median game $ by rating, made non-decreasing ----
const byOvr = new Map<number, number[]>();
for (const p of ours) {
  const c = out[p.id];
  if (!c || c[1] === 'rookie' || c[1] === 'twoWay') continue; // rookie deals and two-ways aren't market prices
  const k = Math.max(60, Math.min(99, p.ovr));
  byOvr.set(k, [...(byOvr.get(k) ?? []), c[0]]);
}
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const curve: [number, number][] = [];
let floor = 0.5;
for (let o = 60; o <= 99; o++) {
  const window = [o - 2, o - 1, o, o + 1, o + 2].flatMap((k) => byOvr.get(k) ?? []);
  const v = window.length >= 5 ? median(window) : null;
  if (v !== null) { floor = Math.max(floor, Math.round(v * 10) / 10); curve.push([o, floor]); }
}
for (const p of missing) {
  const pt = [...curve].reverse().find(([o]) => o <= p.ovr) ?? curve[0];
  out[p.id] = [pt[1], 'est'];
}

const counts: Record<string, number> = {};
for (const [, t] of Object.values(out)) counts[t] = (counts[t] ?? 0) + 1;
const curMissing = missing.filter((p) => p.y === 2027);
console.log(`players ${ours.length}; real ${ours.length - missing.length} (${Math.round((1 - missing.length / ours.length) * 100)}%); estimated ${missing.length} (current season: ${curMissing.length})`);
console.log('types', counts);
console.log('market curve (rating → game $M):', curve.filter(([o]) => o % 5 === 0).map(([o, v]) => `${o}:${v}`).join(' '));
console.log('current-season players without a real contract:', curMissing.map((p) => p.name).join(', '));

const lines = [
  '/**',
  ' * Real contracts, as game dollars ($M): real salary ÷ that season\'s salary cap × 171.4 (a 35% supermax = $60M).',
  ' * Generated by scripts/contracts/build.mts from Basketball Reference team and contract pages. Do not edit by hand.',
  " * Types: supermax, max, rookie (rookie scale), twoWay, min (minimum), standard, est (no salary on record: rating estimate).",
  ' */',
  "export type ContractType = 'supermax' | 'max' | 'rookie' | 'twoWay' | 'min' | 'standard' | 'est';",
  '',
  '/** Rating → typical game $M for a veteran deal, fitted to the real contracts below (free agency in Career mode). */',
  `export const MARKET_CURVE: [number, number][] = ${JSON.stringify(curve)};`,
  '',
  'export const CONTRACTS: Record<string, [number, ContractType]> = {',
  ...Object.entries(out).sort(([a], [b]) => a.localeCompare(b)).map(([id, [s, t]]) => `  ${JSON.stringify(id)}: [${s}, '${t}'],`),
  '};',
  '',
];
writeFileSync('src/data/contracts.ts', lines.join('\n'));
console.log(`wrote src/data/contracts.ts (${Object.keys(out).length} players)`);
