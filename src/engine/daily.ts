/**
 * Daily challenges: everyone gets the same content on the same calendar day (seeded by date).
 */
import { createRng, shuffle } from './rng';
import type { Player, Pool, Rng, TeamSeason } from './types';

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
