import { CAP, capRoom, payOf, superstarBlocked } from './cap';
import { simGame, type GameResult } from './game';
import { rollInjury, type InjuryLabel } from './injuries';
import { lineupMinutes } from './rotation';
import { addNews, leading, roundNews, type Headline } from './story/news';
import { SIM } from './simConfig';
import { confOfDiv, type Conf } from './conference';
import { createRng, shuffle } from './rng';
import { ALL_SLOTS, BENCH_SLOTS, STARTER_SLOTS, type Player, type Rng, type Roster, type RosterSlots, type SlotId, playsPos } from './types';

export const SEASON_GAMES = 82;
export const DEADLINE_GAME = 50;
/** The season feed shows the latest games; older games keep their score but drop the box score to keep saves small. */
export const LOG_BOX_GAMES = 14;

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
  /** Steals and blocks (seasons saved before they were tracked count from zero). */
  stl?: number;
  blk?: number;
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
  /** The one bench switch of the run has been made (see benchSwitch). */
  switchUsed?: boolean;
  /** Fees paid this season ($M game dollars), taken from your cap room: the bench switch. */
  fees?: number;
  /** Extra pause points (e.g. Management Crisis cards), as round numbers. */
  stops?: number[];
  /** Temporary rating modifiers for the user's team (Management Crisis). */
  mods?: TeamMod[];
  /** Headlines about the user's team, newest last. */
  news?: Headline[];
  /** Alone in first place after the last round (so "first place" is news only when you take it). */
  leading?: boolean;
  /** Mid-season moves: each swapped player's totals when he joined (`from`) or left (`to`) your team. */
  stints?: { [playerId: string]: { player: Player; from?: PlayerTotals; to?: PlayerTotals } };
  /**
   * Each team's division (index into DIVISIONS; 0–2 East, 3–5 West). With it, seeding is by conference with a
   * play-in; without it (older saves, Party rooms) the top 16 overall make one bracket.
   */
  divs?: number[];
}

export interface TeamMod {
  amount: number;
  /** Applies to rounds in [fromRound, toRound). */
  fromRound: number;
  toRound: number;
}

/** Total modifier for the user's team in a given round. */
export function modAt(mods: TeamMod[] | undefined, round: number): number {
  return (mods ?? []).reduce((sum, m) => (round >= m.fromRound && round < m.toRound ? sum + m.amount : sum), 0);
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
  const perm = shuffle(Array.from({ length: n }, (_, i) => i), rng);
  const base = roundRobin(n).map((round) => round.map(([a, b]) => [perm[a], perm[b]] as [number, number]));
  const out: [number, number][][] = [];
  let cycle = 0;
  while (out.length < SEASON_GAMES) {
    const order = shuffle(base, rng);
    for (const round of order) {
      if (out.length >= SEASON_GAMES) break;
      out.push(cycle % 2 === 0 ? round : round.map(([a, b]) => [b, a] as [number, number]));
    }
    cycle++;
  }
  return out;
}

export function createSeason(user: Roster, league: Roster[], seed: string, divs?: number[]): SeasonState {
  // Each team's form for this season, seeded (same season seed → same form on every device).
  const formRng = createRng(`${seed}:season-form`);
  const teams = [user, ...league].map((t) => {
    const swing = SIM.formSd ? Math.max(-3 * SIM.formSd, Math.min(3 * SIM.formSd, formRng.normal(0, SIM.formSd))) : 0;
    const f = swing + (formRng.next() < SIM.hotChance ? SIM.hotBoost : 0);
    return f ? { ...t, seasonForm: Math.round(f * 10) / 10 } : t;
  });
  // The league's real contenders: the strongest AI rosters (never the user's, team 0) get a boost.
  if (SIM.contenders && SIM.contenderBoost) {
    const quality = (r: Roster) => STARTER_SLOTS.reduce((n, k) => n + r.slots[k].ovr, 0);
    const best = teams.map((t, i) => ({ i, q: quality(t) })).slice(1).sort((a, b) => b.q - a.q || a.i - b.i).slice(0, SIM.contenders);
    for (const { i } of best) teams[i] = { ...teams[i], seasonForm: Math.round(((teams[i].seasonForm ?? 0) + SIM.contenderBoost) * 10) / 10 };
  }
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
    ...(divs && divs.length === teams.length ? { divs } : {}),
  };
}

export function outSet(injuries: { [id: string]: number }, roster: Roster): Set<string> {
  return new Set(ALL_SLOTS.map((s) => roster.slots[s].id).filter((id) => (injuries[id] ?? 0) > 0));
}

/** Play one game between two teams, applying injuries and stat totals. Shared by season and playoffs. */
export function playGame(
  teams: Roster[], injuries: { [id: string]: number }, totals: SeasonState['totals'],
  home: number, away: number, rng: Rng, onInjury: (team: number, p: Player, games: number, label: InjuryLabel) => void,
  playoff = false,
): GameResult {
  const outHome = outSet(injuries, teams[home]);
  const outAway = outSet(injuries, teams[away]);
  const result = simGame(teams[home], teams[away], { rng, outHome, outAway, playoff });
  for (const b of result.box) {
    const t = (totals[b.playerId] ??= { gp: 0, pts: 0, reb: 0, ast: 0 });
    t.gp++;
    t.pts += b.pts;
    t.reb += b.reb;
    t.ast += b.ast;
    t.stl = (t.stl ?? 0) + (b.stl ?? 0);
    t.blk = (t.blk ?? 0) + (b.blk ?? 0);
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

/** Players who sit out the next game. */
export const injuredIds = (injuries: { [id: string]: number }) => Object.keys(injuries).filter((id) => injuries[id] > 0);

/**
 * After a game day: everyone who sat it out has served one game. Injuries picked up during the day
 * are untouched, so a player hurt for N games misses exactly the next N.
 */
export function serveGame(injuries: { [id: string]: number }, sittingOut: string[]) {
  for (const id of sittingOut) injuries[id] = Math.max(0, injuries[id] - 1);
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
  // Pause at the trade deadline (unless it's already been dealt with) and at any extra stops.
  const pauses = [...(s.deadlineUsed ? [] : [DEADLINE_GAME]), ...(s.stops ?? [])];
  for (const stop of pauses) if (s.round < stop && target > stop) target = stop;

  while (s.round < target) {
    const rng = createRng(`${s.seed}:round:${s.round}`);
    const sittingOut = injuredIds(s.injuries);
    const mod = modAt(s.mods, s.round);
    if ((s.teams[0].mod ?? 0) !== mod) s.teams = [{ ...s.teams[0], mod }, ...s.teams.slice(1)];
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
    serveGame(s.injuries, sittingOut);
    s.news = addNews(s.news, roundNews(s, s.round, !!s.leading));
    s.leading = s.round >= 20 && leading(s);
    s.round++;
    // Strip box scores from games that have scrolled out of the feed.
    let seen = 0;
    for (let i = s.log.length - 1; i >= 0; i--) {
      const e = s.log[i];
      if (e.kind !== 'game') continue;
      if (++seen > LOG_BOX_GAMES && e.result.box.length) s.log[i] = { ...e, result: { ...e.result, box: [] } };
    }
  }
  return s;
}

export function standings(state: SeasonState): Row[] {
  // Exact ties fall to a coin flip seeded by the season (a fixed order would always favor team 0, the user).
  const coin = shuffle(state.records.map((_, i) => i), createRng(`${state.seed}:tiebreak`));
  const rank = new Map(coin.map((team, i) => [team, i]));
  return state.records
    .map((r, team) => ({ ...r, team }))
    .sort((a, b) => b.w - a.w || b.pf - b.pa - (a.pf - a.pa) || rank.get(a.team)! - rank.get(b.team)!);
}

export type Row = Record & { team: number };

/** One conference's table (0 East, 1 West), best first; same order rules as the full standings. */
export function confStandings(state: SeasonState, conf: Conf): Row[] {
  const divs = state.divs;
  return divs ? standings(state).filter((r) => confOfDiv(divs[r.team]) === conf) : standings(state);
}

/** Each division's leader (the best record in it), as a set of team indexes. */
export function divisionLeaders(state: SeasonState): Set<number> {
  const out = new Set<number>();
  if (!state.divs) return out;
  const seen = new Set<number>();
  for (const r of standings(state)) {
    const d = state.divs[r.team];
    if (!seen.has(d)) { seen.add(d); out.add(r.team); }
  }
  return out;
}

/** Where a team stands: its seed in its conference (or overall, without conferences) and that conference. */
export function seedOf(state: SeasonState, team: number): { seed: number; conf: Conf | null } {
  const conf = state.divs ? confOfDiv(state.divs[team]) : null;
  const table = conf === null ? standings(state) : confStandings(state, conf);
  return { seed: table.findIndex((r) => r.team === team) + 1, conf };
}

/** Trade deadline: swap one user player for `incoming` in the same slot, under the cap. Once per season. */
/** The bench switch costs 5% of the cap: $10M of the $200M (an era's 5% in its own dollars). */
export const SWITCH_FEE = CAP * 0.05;

/** Cap room left once this season's fees are paid. */
export const roomAfterFees = (state: SeasonState) => Math.round((capRoom(state.teams[0].slots) - (state.fees ?? 0)) * 10) / 10;

/**
 * Your one bench switch of the run: a bench player moves into the starting five (he has to play that position),
 * and the starter takes his bench spot. It costs SWITCH_FEE of cap room, which also shrinks the deadline budget.
 */
export function benchSwitch(state: SeasonState, benchSlot: SlotId, starterSlot: SlotId): SeasonState {
  if (state.switchUsed) throw new Error('Bench switch already used');
  if (!BENCH_SLOTS.includes(benchSlot) || !STARTER_SLOTS.includes(starterSlot)) throw new Error('Pick a bench player and a starter');
  const user = state.teams[0];
  const incoming = user.slots[benchSlot];
  if (!playsPos(incoming, starterSlot)) throw new Error(`${incoming.name} can't play ${starterSlot}`);
  if (roomAfterFees(state) < SWITCH_FEE - 1e-9) throw new Error('Over the cap');
  const teams = [...state.teams];
  teams[0] = { ...user, slots: { ...user.slots, [starterSlot]: incoming, [benchSlot]: user.slots[starterSlot] } };
  return { ...state, teams, switchUsed: true, fees: Math.round(((state.fees ?? 0) + SWITCH_FEE) * 10) / 10 };
}

/**
 * What you can take on at the deadline for the player in `slot`: your cap room left over plus his salary
 * ($5M room + a $30M player out = up to $35M in). A team already over the cap (career payrolls can be) uses the
 * NBA's salary-matching rule instead: up to 125% of what goes out.
 */
export function tradeBudget(slots: RosterSlots, slot: SlotId, fees = 0): number {
  const out = payOf(slots[slot]!);
  const room = capRoom(slots) - fees;
  return room >= 0 ? Math.round((room + out) * 10) / 10 : Math.round(out * 1.25 * 10) / 10;
}

export function tradeSwap(state: SeasonState, outId: string, incoming: Player): SeasonState {
  if (state.deadlineUsed) throw new Error('Deadline swap already used');
  const user = state.teams[0];
  const slot = ALL_SLOTS.find((s) => user.slots[s].id === outId);
  if (!slot) throw new Error('Player not on your roster');
  if (state.teams.some((t) => ALL_SLOTS.some((k) => t.slots[k].id === incoming.id || t.slots[k].name === incoming.name)))
    throw new Error(`${incoming.name} is already on a roster`);
  if (STARTER_SLOTS.includes(slot) && !playsPos(incoming, slot))
    throw new Error(`${incoming.name} can't play ${slot}`);
  const without: RosterSlots = { ...user.slots };
  delete without[slot];
  if (superstarBlocked(without, incoming)) throw new Error('Superstar limit reached (max 2 players rated 95+)');
  if (payOf(incoming) > tradeBudget(user.slots, slot, state.fees) + 1e-9) throw new Error('Over the cap');
  const teams = [...state.teams];
  teams[0] = { ...user, slots: { ...user.slots, [slot]: incoming } };
  return { ...recordStint(state, user.slots[slot], incoming), teams, deadlineUsed: true };
}

const ZERO: PlayerTotals = { gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 };
const minus = (a: PlayerTotals = ZERO, b: PlayerTotals = ZERO): PlayerTotals => ({
  gp: a.gp - b.gp, pts: a.pts - b.pts, reb: a.reb - b.reb, ast: a.ast - b.ast, stl: (a.stl ?? 0) - (b.stl ?? 0), blk: (a.blk ?? 0) - (b.blk ?? 0),
});

/** Note a mid-season move so stats can be credited to the team a player actually played for. */
export function recordStint(state: SeasonState, outgoing: Player, incoming: Player): SeasonState {
  const stints = { ...state.stints };
  stints[outgoing.id] = { ...stints[outgoing.id], player: outgoing, to: { ...(state.totals[outgoing.id] ?? ZERO) } };
  const now = state.totals[incoming.id] ?? ZERO;
  const back = stints[incoming.id];
  // Coming back for a second stint: shift `from` so the earlier games with you still count.
  stints[incoming.id] = back?.to
    ? { player: incoming, from: minus(now, minus(back.to, back.from)) }
    : { player: incoming, from: { ...now } };
  return { ...state, stints };
}

/** Everyone who played for you this season, with only the games he played for you. */
export function userStints(state: SeasonState): { player: Player; totals: PlayerTotals }[] {
  const out: { player: Player; totals: PlayerTotals }[] = [];
  const onRoster = new Set(ALL_SLOTS.map((k) => state.teams[0].slots[k].id));
  for (const k of ALL_SLOTS) {
    const p = state.teams[0].slots[k];
    out.push({ player: p, totals: minus(state.totals[p.id], state.stints?.[p.id]?.from) });
  }
  for (const [id, st] of Object.entries(state.stints ?? {})) {
    if (onRoster.has(id) || !st.to) continue;
    out.push({ player: st.player, totals: minus(st.to, st.from) });
  }
  return out.filter((x) => x.totals.gp > 0);
}
