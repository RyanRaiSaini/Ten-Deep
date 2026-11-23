/**
 * Live Party: up to 8 friends draft at the same time from the same spins, then watch one shared season.
 *
 * The server only stores the room (host, seed, start time) and each player's own picks with server timestamps.
 * Everything else is derived here, identically on every phone and on the server:
 *   - each round's spin (shared, from the seed),
 *   - when each round opened and closed (all picked, or the pick clock ran out),
 *   - automatic picks for anyone who didn't pick in time,
 *   - the league, the season and the playoffs.
 * Players are exclusive: once someone drafts a player, nobody else can. Seat order (join order) breaks ties.
 */
import { CARD_BY_ID } from '../data/cards';
import { FINISHES, type Finish } from './collect/finishes';
import { affordableSlots, fallbackPick, options, type DraftState } from './draft';
import { draftLeague } from './aiDraft';
import { simPlayoffsToEnd, startPlayoffs, champion, seriesFor, type PlayoffState } from './playoffs';
import { createRng, shuffle } from './rng';
import { advance, createSeason, type SeasonState } from './season';
import { ALL_SLOTS, type Player, type Pool, type Roster, type RosterSlots, type SlotId, type TeamSeason } from './types';

export const PARTY_MAX = 8;
export const PARTY_ROUNDS = ALL_SLOTS.length;
/** Pick clock per round, and the pause after each round while the next spin lands. */
export const PICK_MS = 30_000;
export const SPIN_MS = 3_500;
/** Season reveal pacing (shared by everyone watching). */
export const SEASON_REVEAL_MS = 45_000;
export const PLAYOFF_REVEAL_MS = 20_000;
export const LEAGUE_SIZE = 30;

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ';
export const newRoomCode = (random: () => number = Math.random) =>
  Array.from({ length: 5 }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join('');
export const parseRoomCode = (text: string): string | null => {
  const c = text.toUpperCase().replace(/[^A-Z]/g, '');
  return c.length === 5 && [...c].every((x) => CODE_ALPHABET.includes(x)) ? c : null;
};

export interface PartyMeta {
  code: string;
  host: string;
  seed: string;
  poolId: string;
  created: number;
  /** Server time the draft began (unset while in the lobby). */
  started?: number;
  /** The day's live form, frozen at room creation (name → rating nudge) so every device agrees. */
  form?: Record<string, number>;
}

export interface PartyPick { r: number; pid: string; slot: SlotId; t: number }

export interface PartyMember {
  pin: string;
  name: string;
  avatar: string;
  joined: number;
  picks: PartyPick[];
  /** Their rarest pull, "cardId:finish" (gold or better), shown on their seat. */
  flex?: string;
}

/** Parse a seat's flex ("cardId:finish"); null unless the card exists and the finish is real and not base. */
export function parseFlex(flex: unknown): { id: string; finish: Finish } | null {
  if (typeof flex !== 'string' || flex.length > 90) return null;
  const [id, f] = flex.split(':');
  if (!id || !CARD_BY_ID[id] || !FINISHES.includes(f as Finish) || f === 'base') return null;
  return { id, finish: f as Finish };
}

/** Seat order: join order, then PIN (stable everywhere). */
export const seats = (members: PartyMember[]) => [...members].sort((a, b) => a.joined - b.joined || a.pin.localeCompare(b.pin));

/** Round r's spin, the same for everyone: any team in the pool that still has an undrafted player. */
export function partySpin(pool: Pool, seed: string, round: number, taken: Set<string>): TeamSeason {
  const rng = createRng(`${seed}:party-spin:${round}`);
  const cands = pool.teams.filter((t) => t.players.some((p) => !taken.has(p.id)));
  return rng.pick(cands.length ? cands : pool.teams);
}

export interface Resolved {
  phase: 'lobby' | 'draft' | 'season';
  /** Current round (0–9) while drafting; PARTY_ROUNDS when the draft is done. */
  round: number;
  /** When the current round's pick clock started and runs out (server time). */
  roundStart: number;
  deadline: number;
  spin: TeamSeason | null;
  /** Each seat's roster so far, in seat order. */
  rosters: RosterSlots[];
  /** Who has locked in a pick this round. */
  picked: boolean[];
  /** Picks the clock made for someone, as "round:pin". */
  autos: string[];
  taken: Set<string>;
  draftEnd: number | null;
}

/** A seat's draft state for this round (rivals = everyone else, so cap checks keep every roster fillable). */
export function seatState(pool: Pool, seat: number, rosters: RosterSlots[], taken: Set<string>, spin: TeamSeason | null, seed: string): DraftState {
  return {
    poolId: pool.id, seed, round: Object.keys(rosters[seat]).length, respinsLeft: 0, spins: 0,
    roster: rosters[seat], used: [...taken], spin, rivals: rosters.filter((_, i) => i !== seat), seat,
  };
}

/** The clock's pick for a seat: best affordable player from the spin, else the cheapest fallback. */
export function autoPick(st: DraftState, pool: Pool): { player: Player; slot: SlotId } {
  const best = options(st, pool).find((o) => o.affordable);
  if (best) return { player: best.player, slot: best.slots[0] };
  const player = fallbackPick(st, pool);
  return { player, slot: affordableSlots(st, player, pool)[0] };
}

/** Replay the room from its picks to "now". Pure and deterministic. */
export function resolve(meta: PartyMeta, membersIn: PartyMember[], pool: Pool, now: number): Resolved {
  const members = seats(membersIn);
  const rosters: RosterSlots[] = members.map(() => ({}));
  const taken = new Set<string>();
  const autos: string[] = [];
  const byId = new Map(pool.teams.flatMap((t) => t.players).map((p) => [p.id, p]));
  if (!meta.started) {
    return { phase: 'lobby', round: 0, roundStart: 0, deadline: 0, spin: null, rosters, picked: members.map(() => false), autos, taken, draftEnd: null };
  }
  let start = meta.started;
  for (let r = 0; r < PARTY_ROUNDS; r++) {
    const deadline = start + PICK_MS;
    const spin = partySpin(pool, meta.seed, r, taken);
    // Real picks that arrived in time, applied in time order (first come, first served). A seat can have several
    // for a round: if someone beat them to a player they pick again, and their first valid pick is the one that counts.
    const real = members
      .flatMap((m, seat) => m.picks.filter((x) => x.r === r && x.t <= deadline).map((p) => ({ seat, p })))
      .sort((a, b) => a.p.t - b.p.t || a.seat - b.seat);
    const done = new Set<number>();
    for (const { seat, p } of real) {
      const player = byId.get(p.pid);
      if (done.has(seat) || !player || taken.has(player.id) || rosters[seat][p.slot]) continue;
      rosters[seat] = { ...rosters[seat], [p.slot]: player };
      taken.add(player.id);
      done.add(seat);
    }
    const allIn = done.size === members.length;
    if (!allIn && now < deadline) {
      return { phase: 'draft', round: r, roundStart: start, deadline, spin, rosters, picked: members.map((_, i) => done.has(i)), autos, taken, draftEnd: null };
    }
    // Clock ran out: pick for whoever didn't, in seat order.
    members.forEach((m, seat) => {
      if (done.has(seat)) return;
      const { player, slot } = autoPick(seatState(pool, seat, rosters, taken, spin, meta.seed), pool);
      rosters[seat] = { ...rosters[seat], [slot]: player };
      taken.add(player.id);
      autos.push(`${r}:${m.pin}`);
    });
    const end = allIn ? Math.max(...real.filter((x) => done.has(x.seat)).map((x) => x.p.t)) : deadline;
    start = end + SPIN_MS;
  }
  return { phase: 'season', round: PARTY_ROUNDS, roundStart: start, deadline: start, spin: null, rosters, picked: members.map(() => true), autos, taken, draftEnd: start - SPIN_MS };
}

export const PARTY_COLORS: [string, string][] = [
  ['#FF7417', '#17121E'], ['#3B6CF0', '#17121E'], ['#18C08A', '#17121E'], ['#E5484D', '#17121E'],
  ['#7A4DFF', '#17121E'], ['#F5B820', '#17121E'], ['#FF4F9E', '#17121E'], ['#12B5C2', '#17121E'],
];

export interface PartySeason {
  /** Standings snapshot after each round (wins per team), for the synced reveal. */
  wins: number[][];
  season: SeasonState;
  playoffs: PlayoffState;
  /** Party seats are teams 0..n-1. */
  seats: number;
}

/** The shared league: party teams first (seat order), then AI teams; the full season and playoffs. */
export function partySeason(meta: PartyMeta, membersIn: PartyMember[], rosters: RosterSlots[], pool: Pool): PartySeason {
  const members = seats(membersIn);
  const mine: Roster[] = members.map((m, i) => ({ id: `party-${m.pin}`, name: m.name, colors: PARTY_COLORS[i % PARTY_COLORS.length], slots: rosters[i] as Required<RosterSlots> }));
  const exclude = new Set(rosters.flatMap((r) => Object.values(r).map((p) => p!.id)));
  const rng = createRng(`${meta.seed}:party-league`);
  const ai = draftLeague(pool, exclude, LEAGUE_SIZE - mine.length, rng);
  // Real franchise names for the AI teams (one per franchise), like a solo season.
  const seen = new Set<string>();
  const names = shuffle(pool.teams, rng).filter((t) => {
    const n = `${t.city} ${t.name}`;
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
  ai.forEach((r, i) => {
    const t = names[i % names.length];
    r.name = `${t.city} ${t.name}`;
    r.colors = t.colors;
  });
  let season: SeasonState = { ...createSeason(mine[0], [...mine.slice(1), ...ai], `${meta.seed}:party-season`), deadlineUsed: true };
  const wins: number[][] = [season.records.map(() => 0)];
  while (season.round < 82) {
    season = advance(season, 1);
    wins.push(season.records.map((r) => r.w));
  }
  return { wins, season, playoffs: simPlayoffsToEnd(startPlayoffs(season)), seats: mine.length };
}

/** How far each party team got: 5 champion, 4 finals, 3 semis, 2 second round, 1 first round, 0 missed. */
export function depthOf(ps: PlayoffState, team: number): number {
  if (champion(ps) === team) return 5;
  const s = seriesFor(ps, team);
  return s ? s.round + 1 : 0;
}

/** Final party placings: deeper playoff run first, then regular-season wins. */
export function placings(ps: PartySeason): { team: number; depth: number; w: number; l: number }[] {
  return Array.from({ length: ps.seats }, (_, team) => ({ team, depth: depthOf(ps.playoffs, team), ...ps.season.records[team] }))
    .sort((a, b) => b.depth - a.depth || b.w - a.w || a.team - b.team)
    .map(({ team, depth, w, l }) => ({ team, depth, w, l }));
}

export const pickedCount = (r: Resolved) => r.picked.filter(Boolean).length;
export const seatOf = (members: PartyMember[], pin: string) => seats(members).findIndex((m) => m.pin === pin);
export const rosterFull = (r: RosterSlots) => ALL_SLOTS.every((k) => r[k]);
