import { canAfford } from './cap';
import { simGame, type GameResult } from './game';
import { rollInjury, type InjuryLabel } from './injuries';
import { lineupMinutes } from './rotation';
import { createRng } from './rng';
import { ALL_SLOTS, STARTER_SLOTS, type Player, type Pos, type Rng, type Roster, type RosterSlots } from './types';

export const SEASON_GAMES = 82;
export const DEADLINE_GAME = 50;

export interface Record {
  w: number;
  l: number;
  pf: number;
  pa: number;
}

export type LogEvent =
  | { kind: 'game'; round: number; home: number; away: number; result: GameResult }
  | { kind: 'injury'; round: number; team: number; playerId: string; name: string; games: number; label: InjuryLabel };

export interface PlayerTotals {
  gp: number;
  pts: number;
  reb: number;
  ast: number;
}

export interface SeasonState {
  seed: string;
  /** Index 0 is always the user's team. */
  teams: Roster[];
  round: number;
  /** Pairings for each of the 82 rounds: [homeIdx, awayIdx][]. */
  schedule: [number, number][][];
  records: Record[];
  /** playerId → games still to miss. */
  injuries: { [playerId: string]: number };
  /** Games involving the user's team plus user injuries (kept small for the UI feed). */
  log: LogEvent[];
  totals: { [playerId: string]: PlayerTotals };
  deadlineUsed: boolean;
}

/** Circle-method round robin over n (even) teams → n−1 rounds, each team once per round. */
function roundRobin(n: number): [number, number][][] {
  const ids = Array.from({ length: n }, (_, i) => i);
  const rounds: [number, number][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i];
      const b = ids[n - 1 - i];
      pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    ids.splice(1, 0, ids.pop()!);
  }
  return rounds;
}

function buildSchedule(n: number, rng: Rng): [number, number][][] {
  const perm = Array.from({ length: n }, (_, i) => i).sort(() => rng.next() - 0.5);
  const base = roundRobin(n).map((round) => round.map(([a, b]) => [perm[a], perm[b]] as [number, number]));
  const out: [number, number][][] = [];
  let cycle = 0;
  while (out.length < SEASON_GAMES) {
    const order = [...base].sort(() => rng.next() - 0.5);
    for (const round of order) {
      if (out.length >= SEASON_GAMES) break;
      out.push(cycle % 2 === 0 ? round : round.map(([a, b]) => [b, a] as [number, number]));
    }
    cycle++;
  }
  return out;
}

export function createSeason(user: Roster, league: Roster[], seed: string): SeasonState {
  const teams = [user, ...league];
  if (teams.length % 2 !== 0) throw new Error('League needs an even number of teams');
  return {
    seed,
    teams,
    round: 0,
    schedule: buildSchedule(teams.length, createRng(`${seed}:schedule`)),
    records: teams.map(() => ({ w: 0, l: 0, pf: 0, pa: 0 })),
    injuries: {},
    log: [],
    totals: {},
    deadlineUsed: false,
  };
}

export function outSet(injuries: { [id: string]: number }, roster: Roster): Set<string> {
  return new Set(ALL_SLOTS.map((s) => roster.slots[s].id).filter((id) => (injuries[id] ?? 0) > 0));
}

/** Play one game between two teams, applying injuries and stat totals. Shared by season and playoffs. */
export function playGame(
  teams: Roster[], injuries: { [id: string]: number }, totals: SeasonState['totals'],
  home: number, away: number, rng: Rng, onInjury: (team: number, p: Player, games: number, label: InjuryLabel) => void,
): GameResult {
  const outHome = outSet(injuries, teams[home]);
  const outAway = outSet(injuries, teams[away]);
  const result = simGame(teams[home], teams[away], { rng, outHome, outAway });
  for (const b of result.box) {
    const t = (totals[b.playerId] ??= { gp: 0, pts: 0, reb: 0, ast: 0 });
    t.gp++;
    t.pts += b.pts;
    t.reb += b.reb;
    t.ast += b.ast;
  }
  for (const [ti, out] of [[home, outHome], [away, outAway]] as const) {
    for (const e of lineupMinutes(teams[ti], out)) {
      const inj = rollInjury(e.player, e.minutes, rng);
      if (inj && !e.player.id.startsWith('rep-')) {
        injuries[e.player.id] = inj.games;
        onInjury(ti, e.player, inj.games, inj.label);
      }
    }
  }
  return result;
}

/** Advance up to `games` rounds; stops at the trade deadline and at the end of the season. */
export function advance(state: SeasonState, games: number): SeasonState {
  const s: SeasonState = {
    ...state,
    records: state.records.map((r) => ({ ...r })),
    injuries: { ...state.injuries },
    log: [...state.log],
    totals: Object.fromEntries(Object.entries(state.totals).map(([k, v]) => [k, { ...v }])),
  };
  let target = Math.min(SEASON_GAMES, s.round + games);
  if (s.round < DEADLINE_GAME && target > DEADLINE_GAME) target = DEADLINE_GAME;

  while (s.round < target) {
    const rng = createRng(`${s.seed}:round:${s.round}`);
    // heal first: everyone plays once per round
    for (const id of Object.keys(s.injuries)) s.injuries[id] = Math.max(0, s.injuries[id] - 1);
    for (const [home, away] of s.schedule[s.round]) {
      const result = playGame(s.teams, s.injuries, s.totals, home, away, rng, (team, p, g, label) => {
        if (team === 0) s.log.push({ kind: 'injury', round: s.round, team, playerId: p.id, name: p.name, games: g, label });
      });
      const hw = result.homeScore > result.awayScore;
      s.records[home].w += hw ? 1 : 0;
      s.records[home].l += hw ? 0 : 1;
      s.records[away].w += hw ? 0 : 1;
      s.records[away].l += hw ? 1 : 0;
      s.records[home].pf += result.homeScore;
      s.records[home].pa += result.awayScore;
      s.records[away].pf += result.awayScore;
      s.records[away].pa += result.homeScore;
      if (home === 0 || away === 0) s.log.push({ kind: 'game', round: s.round, home, away, result });
    }
    s.round++;
  }
  return s;
}

export function standings(state: SeasonState): (Record & { team: number })[] {
  return state.records
    .map((r, team) => ({ ...r, team }))
    .sort((a, b) => b.w - a.w || b.pf - b.pa - (a.pf - a.pa));
}

/** Trade deadline: swap one user player for `incoming` in the same slot, under the cap. Once per season. */
export function tradeSwap(state: SeasonState, outId: string, incoming: Player): SeasonState {
  if (state.deadlineUsed) throw new Error('Deadline swap already used');
  const user = state.teams[0];
  const slot = ALL_SLOTS.find((s) => user.slots[s].id === outId);
  if (!slot) throw new Error('Player not on your roster');
  if (STARTER_SLOTS.includes(slot) && incoming.pos !== (slot as Pos) && incoming.pos2 !== (slot as Pos))
    throw new Error(`${incoming.name} can't play ${slot}`);
  const without: RosterSlots = { ...user.slots };
  delete without[slot];
  if (!canAfford(without, incoming)) throw new Error('Over the cap');
  const teams = [...state.teams];
  teams[0] = { ...user, slots: { ...user.slots, [slot]: incoming } };
  return { ...state, teams, deadlineUsed: true };
}
