/**
 * Friend codes: a compact, self-contained snapshot of a player (name, avatar, PIN, lineup, best cards, last
 * drafted team) that travels in a link. Works offline; a server can later map a short PIN to the latest code.
 * Pure so it's testable.
 */
import { CARD_BY_ID } from '../../data/cards';
import { FINISHES, finishRank, type Finish } from '../collect/finishes';
import { HISTORY } from '../../data/modes';
import { ALL_SLOTS, type Player, type Pos, type SlotId } from '../types';

export interface FriendSnapshot {
  pin: string;
  name: string;
  avatar: string;
  stats: { drafts: number; titles: number; streak: number; cards: number; tier: number };
  /** Card lineup: slot → card id and level. */
  lineup: Partial<Record<SlotId, { id: string; lv: number }>>;
  /** Their best cards, best first (capped). */
  showcase: string[];
  /** Best finish owned for each showcase card (missing = base). Older codes have none. */
  finishes?: Record<string, Finish>;
  /** Their last drafted team, for a Finals showdown. */
  team: { mode: string; w: number; l: number; result: string; players: Partial<Record<SlotId, Player>> } | null;
}

export const SHOWCASE_MAX = 60;
const PIN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** A fresh 6-character PIN without look-alike characters (no 0/O, 1/I/L). */
export function newPin(random: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += PIN_ALPHABET[Math.floor(random() * PIN_ALPHABET.length)];
  return s;
}
/** "K7Q2XM" → "K7Q-2XM". */
export const formatPin = (pin: string) => `${pin.slice(0, 3)}-${pin.slice(3)}`;
/** Normalise what someone typed ("k7q 2xm", "K7Q-2XM") to a PIN, or null. */
export function parsePin(text: string): string | null {
  const p = text.toUpperCase().replace(/[\s-]/g, '');
  return p.length === 6 && [...p].every((c) => PIN_ALPHABET.includes(c)) ? p : null;
}

/** 30-bit FNV-1a of an id as 5 base64url characters. */
export function idHash(id: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  h &= 0x3fffffff;
  let s = '';
  for (let i = 0; i < 5; i++) { s += B64[h & 63]; h >>>= 6; }
  return s;
}

let players: Map<string, Player> | null = null;
let cards: Map<string, string> | null = null;
/** hash → player (every historic and current player), built on first use. */
function playerIndex(): Map<string, Player> {
  if (!players) {
    players = new Map();
    for (const t of HISTORY) for (const p of t.players) players.set(idHash(p.id), p);
  }
  return players;
}
function cardIndex(): Map<string, string> {
  if (!cards) {
    cards = new Map();
    for (const id of Object.keys(CARD_BY_ID)) cards.set(idHash(id), id);
  }
  return cards;
}

// --- UTF-8 base64url (names can be any script) ------------------------------------------------------
function toB64(text: string): string {
  const bytes = utf8(text);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += B64[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += B64[n & 63];
  }
  return out;
}
function fromB64(s: string): string | null {
  const bytes: number[] = [];
  let buf = 0;
  let bits = 0;
  for (const ch of s) {
    const v = B64.indexOf(ch);
    if (v < 0) return null;
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) { bits -= 8; bytes.push((buf >> bits) & 255); }
  }
  try { return decodeURIComponent(bytes.map((b) => `%${b.toString(16).padStart(2, '0')}`).join('')); } catch { return null; }
}
function utf8(s: string): number[] {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

const PREFIX = 'TD1';
const num = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const POS: Pos[] = ['PG', 'SG', 'SF', 'PF', 'C'];

type PlayerTuple = [string, Pos, number, number, number, number, number, number, number];
const tuple = (p: Player): PlayerTuple => [p.name, p.pos, p.ovr, p.off, p.def, p.reb, p.ast, p.three, p.dur];

export function encodeFriend(s: FriendSnapshot): string {
  const lineup = ALL_SLOTS.map((k) => { const e = s.lineup[k]; return e ? idHash(e.id) + Math.min(3, e.lv) : '------'; }).join('');
  const known = playerIndex();
  const team = s.team && [
    s.team.mode, s.team.w, s.team.l, s.team.result,
    ALL_SLOTS.map((k) => { const p = s.team!.players[k]; if (!p) return 0; const h = idHash(p.id); return known.get(h)?.id === p.id ? h : tuple(p); }),
  ];
  const st = s.stats;
  const shown = s.showcase.slice(0, SHOWCASE_MAX);
  // One digit per showcase card: its finish rank (0 = base). Appended last so older apps ignore it.
  const fin = shown.map((id) => finishRank(s.finishes?.[id] ?? 'base')).join('');
  const payload = [1, s.pin, s.name.slice(0, 18), s.avatar, [st.drafts, st.titles, st.streak, st.cards, st.tier], lineup, shown.map(idHash).join(''), team ?? 0, fin];
  return `${PREFIX}${toB64(JSON.stringify(payload))}`;
}

/** Pull a code out of whatever was pasted: the raw code or a link with ?c=. */
export function extractCode(text: string): string | null {
  const m = text.match(/TD1[A-Za-z0-9_-]{8,}/);
  return m ? m[0] : null;
}

export function decodeFriend(text: string): FriendSnapshot | null {
  const code = extractCode(text);
  if (!code || code.length > 6000) return null;
  const json = fromB64(code.slice(PREFIX.length));
  if (!json) return null;
  let a: unknown;
  try { a = JSON.parse(json); } catch { return null; }
  if (!Array.isArray(a) || a[0] !== 1) return null;
  const pin = parsePin(str(a[1], 6));
  if (!pin) return null;
  const cardsByHash = cardIndex();
  const stats = Array.isArray(a[4]) ? a[4] : [];
  const lineup: FriendSnapshot['lineup'] = {};
  const ls = str(a[5], 60);
  ALL_SLOTS.forEach((k, i) => {
    const chunk = ls.slice(i * 6, i * 6 + 6);
    const id = cardsByHash.get(chunk.slice(0, 5));
    if (id) lineup[k] = { id, lv: num(Number(chunk[5]), 3) };
  });
  const sc = str(a[6], SHOWCASE_MAX * 5);
  const fin = str(a[8], SHOWCASE_MAX);
  const showcase: string[] = [];
  const finishes: Record<string, Finish> = {};
  for (let i = 0; i + 5 <= sc.length; i += 5) {
    const id = cardsByHash.get(sc.slice(i, i + 5));
    if (!id) continue;
    showcase.push(id);
    const f = FINISHES[Number(fin[i / 5])];
    if (f && f !== 'base') finishes[id] = f;
  }
  let team: FriendSnapshot['team'] = null;
  if (Array.isArray(a[7]) && Array.isArray(a[7][4])) {
    const [mode, w, l, result, list] = a[7] as [unknown, unknown, unknown, unknown, unknown[]];
    const known = playerIndex();
    const ps: Partial<Record<SlotId, Player>> = {};
    ALL_SLOTS.forEach((k, i) => {
      const e = list[i];
      if (typeof e === 'string') { const p = known.get(e); if (p) ps[k] = p; }
      else if (Array.isArray(e) && typeof e[0] === 'string') {
        const pos = POS.includes(e[1] as Pos) ? (e[1] as Pos) : 'SF';
        ps[k] = { id: `friend-${k}`, name: str(e[0], 30), pos, ovr: num(e[2], 99), off: num(e[3], 99), def: num(e[4], 99), reb: num(e[5], 99), ast: num(e[6], 99), three: num(e[7], 99), dur: num(e[8], 100) };
      }
    });
    team = { mode: str(mode, 40), w: num(w, 82), l: num(l, 82), result: str(result, 20), players: ps };
  }
  return {
    pin,
    name: str(a[2], 18).trim() || 'Friend',
    avatar: str(a[3], 40),
    stats: { drafts: num(stats[0], 1e6), titles: num(stats[1], 1e6), streak: num(stats[2], 1e5), cards: num(stats[3], 1e5), tier: num(stats[4], 9) },
    lineup, showcase, team, finishes,
  };
}
