/**
 * Daily challenges: everyone gets the same content on the same calendar day (seeded by date).
 */
import { createRng, shuffle } from './rng';
import { bestOf7 } from './series';
import { ALL_SLOTS, BENCH_SLOTS, STARTER_SLOTS, type Player, type Pool, type Pos, type Rng, type Roster, type RosterSlots, type TeamSeason } from './types';

/** Local calendar day, YYYY-MM-DD. */
export function dailyKey(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const dailySeed = (key: string) => `daily-${key}`;

export type TriviaQuestion =
  | { kind: 'highest'; prompt: string; players: Player[]; choices: string[]; answer: string }
  | { kind: 'team'; prompt: string; players: Player[]; season: string; choices: string[]; answer: string };

const teamName = (t: TeamSeason) => `${t.city} ${t.name}`;

/** Players worth asking about: rated 80+ so names are recognizable. */
function notable(pool: Pool): { p: Player; t: TeamSeason }[] {
  return pool.teams.flatMap((t) => t.players.filter((p) => p.ovr >= 80).map((p) => ({ p, t })));
}

function highestQ(pool: Pool, rng: Rng): TriviaQuestion {
  const cands = notable(pool);
  for (;;) {
    const four = shuffle(cands, rng).slice(0, 4).map((x) => x.p);
    if (new Set(four.map((p) => p.ovr)).size < 4) continue;
    const best = [...four].sort((a, b) => b.ovr - a.ovr)[0];
    return { kind: 'highest', prompt: 'Who has the highest Ten Deep rating?', players: four, choices: four.map((p) => p.name), answer: best.name };
  }
}

function teamQ(pool: Pool, rng: Rng): TriviaQuestion {
  const cands = notable(pool).filter((x) => x.t.id !== 'rookies-2026');
  const { p, t } = rng.pick(cands);
  const answer = teamName(t);
  const others = [...new Set(pool.teams.map(teamName))].filter((n) => n !== answer);
  const choices = shuffle([answer, ...shuffle(others, rng).slice(0, 3)], rng);
  return { kind: 'team', prompt: `Which team did ${p.name} play for in ${t.season}?`, players: [p], season: t.season, choices, answer };
}

/** Five questions, alternating kinds, no player asked about twice. */
export function dailyTrivia(pool: Pool, key: string): TriviaQuestion[] {
  const rng = createRng(`${dailySeed(key)}:trivia`);
  const out: TriviaQuestion[] = [];
  const asked = new Set<string>();
  while (out.length < 5) {
    const q = out.length % 2 === 0 ? teamQ(pool, rng) : highestQ(pool, rng);
    if (q.players.some((p) => asked.has(p.name))) continue;
    q.players.forEach((p) => asked.add(p.name));
    out.push(q);
  }
  return out;
}

export interface RankChallenge {
  players: Player[];
  /** Player ids, highest overall first. */
  answer: string[];
}

/** Five notable players with distinct overalls, to put in order. */
export function dailyRank(pool: Pool, key: string): RankChallenge {
  const rng = createRng(`${dailySeed(key)}:rank`);
  const cands = notable(pool).map((x) => x.p);
  for (;;) {
    const five = shuffle(cands, rng).slice(0, 5);
    if (new Set(five.map((p) => p.ovr)).size < 5) continue;
    return { players: five, answer: [...five].sort((a, b) => b.ovr - a.ovr).map((p) => p.id) };
  }
}

/** Number of players placed in exactly the right position. */
export function scoreRank(guess: string[], answer: string[]): number {
  return guess.filter((id, i) => answer[i] === id).length;
}

// ---------------------------------------------------------------------------------------------
// Team rank, 1v1 derby, team duel

/** A team-season's strength: mean overall of its best 8 players. */
export function teamStrengthScore(t: TeamSeason): number {
  const top = [...t.players].sort((a, b) => b.ovr - a.ovr).slice(0, 8);
  return top.reduce((s, p) => s + p.ovr, 0) / top.length;
}

export interface TeamRankChallenge {
  teams: TeamSeason[];
  /** Team ids, strongest first. */
  answer: string[];
}

export function dailyTeamRank(seasons: TeamSeason[], key: string): TeamRankChallenge {
  const rng = createRng(`${dailySeed(key)}:team-rank`);
  const cands = seasons.filter((t) => t.players.length >= 6);
  for (;;) {
    const five = shuffle(cands, rng).slice(0, 5);
    const scores = five.map(teamStrengthScore);
    if (new Set(scores.map((s) => s.toFixed(2))).size < 5) continue;
    return { teams: five, answer: [...five].sort((a, b) => teamStrengthScore(b) - teamStrengthScore(a)).map((t) => t.id) };
  }
}

export interface DerbyMatch {
  a: Player;
  b: Player;
  /** Id of the higher-rated player. */
  winner: string;
}

/** Five 1v1s: pick who wins (the higher Ten Deep rating). Close matchups make it interesting. */
export function dailyDerby(pool: Pool, key: string): DerbyMatch[] {
  const rng = createRng(`${dailySeed(key)}:derby`);
  const cands = notable(pool).map((x) => x.p);
  const used = new Set<string>();
  const out: DerbyMatch[] = [];
  while (out.length < 5) {
    const a = rng.pick(cands);
    const close = cands.filter((p) => p.name !== a.name && Math.abs(p.ovr - a.ovr) <= 4 && p.ovr !== a.ovr);
    if (!close.length || used.has(a.name)) continue;
    const b = rng.pick(close);
    if (used.has(b.name)) continue;
    used.add(a.name).add(b.name);
    out.push({ a, b, winner: a.ovr > b.ovr ? a.id : b.id });
  }
  return out;
}

/** Turn a team-season into a full 10-man rotation (starters by position, then bench; call-ups fill gaps). */
export function rosterFromTeam(t: TeamSeason): Roster {
  const left = [...t.players].sort((a, b) => b.ovr - a.ovr);
  const slots: RosterSlots = {};
  for (const s of STARTER_SLOTS) {
    const i = left.findIndex((p) => p.pos === s || p.pos2 === s);
    const idx = i >= 0 ? i : 0;
    if (left.length) slots[s] = left.splice(idx, 1)[0];
  }
  for (const s of BENCH_SLOTS) if (left.length) slots[s] = left.shift();
  for (const s of ALL_SLOTS)
    slots[s] ??= { id: `${t.id}-callup-${s}`, name: 'Call-up', pos: (STARTER_SLOTS.includes(s) ? s : 'SF') as Pos, ovr: 64, off: 62, def: 62, reb: 60, ast: 58, three: 58, dur: 90 };
  return { id: t.id, name: t.label, colors: t.colors, slots: slots as Required<RosterSlots> };
}

export interface TeamDuel {
  a: TeamSeason;
  b: TeamSeason;
  winsA: number;
  winsB: number;
  games: { scoreA: number; scoreB: number }[];
  winner: string;
}

/** Two historic team-seasons, one seeded best-of-7. Guess the winner before the reveal. */
export function dailyTeamDuel(seasons: TeamSeason[], key: string): TeamDuel {
  const rng = createRng(`${dailySeed(key)}:team-duel`);
  const cands = seasons.filter((t) => t.players.length >= 7);
  const a = rng.pick(cands);
  const close = cands.filter((t) => t.id !== a.id && Math.abs(teamStrengthScore(t) - teamStrengthScore(a)) <= 3);
  const b = rng.pick(close.length ? close : cands.filter((t) => t.id !== a.id));
  const s = bestOf7(rosterFromTeam(a), rosterFromTeam(b), rng);
  return { a, b, winsA: s.winsA, winsB: s.winsB, games: s.games, winner: s.winner === 'a' ? a.id : b.id };
}
