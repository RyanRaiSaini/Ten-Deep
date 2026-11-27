/** A player's country (ISO code, lower case) and its flag. Anyone not in the list is American. */
import { NATION } from './nations';

const norm = (n: string) => n.normalize('NFKD').replace(/[^\x00-\x7f]/g, '').toLowerCase().replace(/[^a-z]/g, '');

export function nationOf(p: { name: string; id: string }): string {
  const k = norm(p.name);
  // Two different Jeff Taylors: the 1980s one was American, the 2010s one Swedish.
  if (k === 'jefftaylor') return Number(p.id.match(/-(\d{4})/)?.[1] ?? 0) >= 2010 ? 'se' : 'us';
  return NATION[k] ?? 'us';
}

/** The flag emoji for a country code ("fr" → 🇫🇷). */
export const flagOf = (code: string) => code.toUpperCase().replace(/[A-Z]/g, (c) => String.fromCodePoint(0x1f1a5 + c.charCodeAt(0)));
