/**
 * Repeated wording across a campaign's drafts. It flags phrases for a person to rewrite; it never swaps
 * words itself (mechanical synonym swaps make messages worse, not more personal).
 */
import { words } from './checks';

export interface Repeat { phrase: string; draftIds: string[] }

const gramsOf = (text: string, n: number, ignore: Set<string>) => {
  const w = words(text.toLowerCase()).filter((x) => !ignore.has(x));
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
};

/**
 * Phrases of `n`+ words that appear in at least `minDrafts` drafts (default: 3, or 2 when there are only 2-3 drafts).
 * Names are ignored so "Hey Sam" and "Hey Jo" don't hide a shared opener. Overlapping phrases are merged to the longest.
 */
export function repeatedPhrases(drafts: { id: string; text: string }[], names: string[] = [], n = 4, minDrafts?: number): Repeat[] {
  if (drafts.length < 2) return [];
  const min = minDrafts ?? (drafts.length <= 3 ? 2 : 3);
  const ignore = new Set(names.flatMap((x) => words(x.toLowerCase())));
  const seen = new Map<string, Set<string>>();
  for (const d of drafts) for (const g of gramsOf(d.text, n, ignore)) {
    const s = seen.get(g) ?? new Set<string>();
    s.add(d.id);
    seen.set(g, s);
  }
  const hits = [...seen.entries()].filter(([, s]) => s.size >= min);
  // Chain overlapping n-grams shared by the same drafts into longer phrases.
  const key = (s: Set<string>) => [...s].sort().join(',');
  const groups = new Map<string, string[]>();
  for (const [g, s] of hits) groups.set(key(s), [...(groups.get(key(s)) ?? []), g]);
  const out: Repeat[] = [];
  for (const [ids, grams] of groups) {
    const set = new Set(grams);
    const used = new Set<string>();
    for (const g of grams) {
      if (used.has(g)) continue;
      // Walk left to the start of the chain, then right to its end.
      let start = g;
      const walked = new Set([g]);
      for (;;) {
        const prev = [...set].find((x) => !used.has(x) && !walked.has(x) && x.split(' ').slice(1).join(' ') === start.split(' ').slice(0, -1).join(' '));
        if (!prev) break;
        walked.add(prev);
        start = prev;
      }
      let phrase = start;
      let cur = start;
      used.add(cur);
      for (;;) {
        const next = [...set].find((x) => !used.has(x) && x.split(' ').slice(0, -1).join(' ') === cur.split(' ').slice(1).join(' '));
        if (!next) break;
        phrase += ` ${next.split(' ').at(-1)}`;
        used.add(next);
        cur = next;
      }
      out.push({ phrase, draftIds: ids.split(',') });
    }
  }
  return out.sort((a, b) => b.draftIds.length - a.draftIds.length || b.phrase.length - a.phrase.length);
}

/** Drafts that open with the same first three words (names ignored). */
export function sameOpeners(drafts: { id: string; text: string }[], names: string[] = []): Repeat[] {
  const ignore = new Set(names.flatMap((x) => words(x.toLowerCase())));
  const by = new Map<string, string[]>();
  for (const d of drafts) {
    const w = words(d.text.toLowerCase()).filter((x) => !ignore.has(x)).slice(0, 3).join(' ');
    if (w) by.set(w, [...(by.get(w) ?? []), d.id]);
  }
  return [...by.entries()].filter(([, ids]) => ids.length >= 2).map(([phrase, draftIds]) => ({ phrase, draftIds }));
}
