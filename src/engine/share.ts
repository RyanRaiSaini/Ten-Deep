/** Spoiler-free share text (colored squares, no names) and challenge links. Pure, so it's testable. */

export interface ShareRun {
  wins: number;
  losses: number;
  /** 'champion' | 'finals' | ... | 'missed' */
  result: string;
  resultLabel: string;
  mode: string;
  ovrs: number[];
  seed: string;
  poolId: string;
  name: string;
  url: string;
  /** Your friend PIN, so a friend's result counts toward your head-to-head. */
  pin?: string;
  /** Playoff series played (0–4), the tiebreak. */
  depth?: number;
}

/** Rating squares: 🟨 95+, 🟩 88+, 🟦 80+, ⬜ below. */
const square = (o: number) => (o >= 95 ? '🟨' : o >= 88 ? '🟩' : o >= 80 ? '🟦' : '⬜');

export function challengeLink(r: Pick<ShareRun, 'url' | 'seed' | 'poolId' | 'wins' | 'losses' | 'name' | 'pin' | 'depth'>): string {
  const q = new URLSearchParams({ s: r.seed, p: r.poolId, w: String(r.wins), l: String(r.losses), n: r.name.slice(0, 18) });
  if (r.pin) q.set('f', r.pin);
  if (r.depth !== undefined) q.set('d', String(r.depth));
  return `${r.url}/c?${q.toString()}`;
}

export function runShareText(r: ShareRun): string {
  const trophy = r.result === 'champion' ? ' 🏆' : '';
  const starters = r.ovrs.slice(0, 5).map(square).join('');
  const bench = r.ovrs.slice(5).map(square).join('');
  return [
    `TEN DEEP 🏀 ${r.mode}`,
    `${r.wins}-${r.losses} · ${r.resultLabel}${trophy}`,
    `${starters} | ${bench}`,
    `Beat my draft: ${challengeLink(r)}`,
  ].join('\n');
}

/** Parse a challenge link's params; null if anything is missing or malformed. */
export function parseChallenge(p: Record<string, string | string[] | undefined>): { seed: string; poolId: string; w: number; l: number; name: string; pin?: string; depth?: number } | null {
  const one = (k: string) => (Array.isArray(p[k]) ? p[k]![0] : p[k]) as string | undefined;
  const seed = one('s'); const poolId = one('p'); const w = Number(one('w')); const l = Number(one('l'));
  const name = (one('n') ?? '').trim().slice(0, 18) || 'A friend';
  if (!seed || !poolId || !/^[\w:.-]{1,64}$/.test(seed) || !Number.isInteger(w) || !Number.isInteger(l) || w < 0 || l < 0 || w + l > 82) return null;
  const pin = one('f');
  const depth = Number(one('d'));
  return {
    seed, poolId, w, l, name,
    ...(pin && /^[A-HJKMNP-Z2-9]{6}$/.test(pin) ? { pin } : {}),
    ...(Number.isInteger(depth) && depth >= 0 && depth <= 4 ? { depth } : {}),
  };
}
