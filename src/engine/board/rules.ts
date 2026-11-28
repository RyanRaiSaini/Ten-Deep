/** Checking board demands against the season, and what passing or failing them does. */
import { CAP } from '../cap';
import { confOfDiv } from '../conference';
import { SEASON_GAMES, confStandings, roomAfterFees, seedOf, standings, type SeasonState } from '../season';
import { awardRace, leaders } from '../story/leaders';
import { ALL_SLOTS, STARTER_SLOTS, positionsOf, type Player } from '../types';
import { madeFinals, wonTitle } from '../../data/finals';
import { cardOf } from './cards';
import { MAX_CONFIDENCE, OBJECTIVE_REWARD, type BoardEvent, type BoardState, type Demand, type Signing } from './state';
import { bumpPlayer } from './util';

/** Where a player's card comes from: a franchise and the season it ended (2026 = 2025-26). */
export interface Origin { franchise: string; year: number }

export interface BoardCtx {
  season: SeasonState;
  origin: (p: Player) => Origin | null;
  /** Birth country (ISO code, lowercase), once the data exists. */
  nation?: (p: Player) => string | undefined;
}

const roster = (s: SeasonState) => ALL_SLOTS.map((k) => s.teams[0].slots[k]);
const starters = (s: SeasonState) => STARTER_SLOTS.map((k) => s.teams[0].slots[k]);
const since = (b: BoardState, d: Demand): Signing[] => b.signings.slice(d.sig ?? 0).filter((x) => x.round >= d.from);
const real = (xs: Signing[]) => xs.filter((x) => x.tier !== 'perk');
const count = <T>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length;
const winsSince = (s: SeasonState, d: Demand) => s.records[0].w - (d.wins ?? 0);
export const DEFENSIVE = new Set(['defender', 'rim', 'wing3d']);
export const SHOOTING = new Set(['shooter', 'stretch', 'wing3d']);

/** Team rebounds per game, from each current player's average. */
const teamRpg = (s: SeasonState, i: number) =>
  ALL_SLOTS.reduce((sum, k) => {
    const t = s.totals[s.teams[i].slots[k].id];
    return sum + (t && t.gp ? t.reb / t.gp : 0);
  }, 0);

/** Wins over one team this season (your games are all in the log). */
const winsOver = (s: SeasonState, team: number) =>
  count(s.log, (e) => e.kind === 'game' && ((e.home === 0 && e.away === team && e.result.homeScore > e.result.awayScore) ||
    (e.away === 0 && e.home === team && e.result.awayScore > e.result.homeScore)));

/** Does the rule hold right now? */
export function holds(d: Demand, b: BoardState, ctx: BoardCtx): boolean {
  const s = ctx.season;
  const mine = roster(s);
  const fromHere = (p: Player, f: (o: Origin) => boolean) => { const o = ctx.origin(p); return !!o && f(o); };
  switch (d.id) {
    case 'break-core': {
      const now = new Set(starters(s).map((p) => p.id));
      return count(d.ids ?? [], (id) => !now.has(id)) >= 3;
    }
    case 'every-phase': {
      const ps = real(since(b, d)).map((x) => x.pos);
      return ps.some((p) => p === 'PG' || p === 'SG') && ps.includes('SF') && ps.some((p) => p === 'PF' || p === 'C');
    }
    case 'statement-signing':
    case 'fans-demand':
      return since(b, d).some((x) => x.tier === 'top');
    case 'prove-it':
      return since(b, d).some((x) => x.pay >= CAP * 0.2 - 1e-9);
    case 'hometown-hero': {
      const teams = new Set(d.franchises ?? (d.franchise ? [d.franchise] : []));
      return count(mine, (p) => fromHere(p, (o) => teams.has(o.franchise))) >= 2;
    }
    case 'local-legend':
      return mine.some((p) => fromHere(p, (o) => o.franchise === d.franchise));
    case 'championship-dna':
      return count(mine, (p) => fromHere(p, (o) => wonTitle(o.franchise, o.year))) >= 2;
    case 'finals-experience':
      return mine.some((p) => fromHere(p, (o) => madeFinals(o.franchise, o.year)));
    case 'time-machine':
      return mine.some((p) => fromHere(p, (o) => o.year < 1990));
    case 'all-star-pedigree':
      return count(mine, (p) => p.ovr >= 88) >= 3;
    case 'youth-movement':
      return count(mine, (p) => (p.age ?? 99) <= 23) >= 3;
    case 'veteran-leadership':
      return real(since(b, d)).some((x) => (x.age ?? 0) >= 32);
    case 'defense-wins':
      return count(starters(s), (p) => DEFENSIVE.has(p.tag ?? '') || p.def >= 90) >= 2;
    case 'space-floor':
      return count(starters(s), (p) => SHOOTING.has(p.tag ?? '') || p.three >= 90) >= 3;
    case 'budget-discipline':
      return roomAfterFees(s) >= CAP * 0.075 - 1e-9;
    case 'big-spenders':
      return real(since(b, d)).every((x) => x.pay >= CAP * 0.125 - 1e-9);
    case 'bargain-bin':
      return real(since(b, d)).every((x) => x.pay <= CAP * 0.05 + 1e-9);
    case 'untouchable':
      return starters(s).some((p) => p.id === d.ids?.[0]);
    case 'positionless':
      return count(starters(s), (p) => positionsOf(p).length >= 2) >= 3;
    case 'rivalry-signing':
      return since(b, d).some((x) => x.fromTeam !== undefined && (!s.divs || s.divs[x.fromTeam] === s.divs[0]));
    case 'sell-high': {
      const gone = !mine.some((p) => p.id === d.ids?.[0]);
      return gone && since(b, d).some((x) => x.outName === d.ids?.[1] && x.pay < (d.pay ?? 0));
    }
    case 'trade-demand':
      return !mine.some((p) => p.id === d.ids?.[0]);
    case 'breakout-star':
      return mine.some((p) => (p.age ?? 99) <= 25 && p.ovr >= 85);
    case 'iron-man':
      return starters(s).every((p) => (s.totals[p.id]?.gp ?? 0) >= 70);
    case 'rebound-battle': {
      const conf = s.divs ? confOfDiv(s.divs[0]) : null;
      const rivals = s.teams.map((_, i) => i).filter((i) => i > 0 && (conf === null || confOfDiv(s.divs![i]) === conf));
      const mineR = teamRpg(s, 0);
      return rivals.every((i) => teamRpg(s, i) < mineR);
    }
    case 'scoring-title':
      return leaders(s, 'pts', 1)[0]?.team === 0;
    case 'dpoy':
      return awardRace(s, 'dpoy', 1)[0]?.team === 0;
    case 'sixth-man':
      return awardRace(s, 'smoy', 1)[0]?.team === 0;
    case 'international-flavor':
      return count(mine, (p) => { const n = ctx.nation?.(p); return !!n && n !== 'us'; }) >= 2;
    case 'no-superteams':
      return count(mine, (p) => p.ovr >= 95) <= 1;
    case 'division-crown': {
      if (!s.divs) return standings(s)[0].team === 0;
      return confStandings(s, confOfDiv(s.divs[0])).filter((r) => s.divs![r.team] === s.divs![0])[0]?.team === 0;
    }
    case 'home-court':
      return seedOf(s, 0).seed <= 4;
    case 'upset-special':
      return d.team !== undefined && winsOver(s, d.team) >= 2;
    case 'win-now':
    case 'streak-breaker':
    case 'media-frenzy':
    case 'owner-holds':
      return winsSince(s, d) >= gamesNeed(d).need;
    default:
      return true;
  }
}

/** Wins needed and window for a game-count demand. */
export function gamesNeed(d: Demand): { need: number; of: number } {
  const def = cardOf(d.id);
  return { need: def?.need ?? 0, of: def?.of ?? d.due - d.from };
}

/** For the panel: a short progress figure, e.g. wins so far in a "win 8 of 10". */
export function progress(d: Demand, ctx: BoardCtx): { have: number; need: number } | null {
  const s = ctx.season;
  if (gamesLike(d)) return { have: Math.max(0, winsSince(s, d)), need: gamesNeed(d).need };
  if (d.id === 'upset-special' && d.team !== undefined) return { have: winsOver(s, d.team), need: 2 };
  if (d.id === 'break-core') {
    const now = new Set(starters(s).map((p) => p.id));
    return { have: count(d.ids ?? [], (id) => !now.has(id)), need: 3 };
  }
  // Roster counts: how many you have of what the objective asks for.
  const mine = roster(s);
  const from = (p: Player, f: (o: Origin) => boolean) => { const o = ctx.origin(p); return !!o && f(o); };
  switch (d.id) {
    case 'hometown-hero': {
      const teams = new Set(d.franchises ?? (d.franchise ? [d.franchise] : []));
      return { have: Math.min(2, count(mine, (p) => from(p, (o) => teams.has(o.franchise)))), need: 2 };
    }
    case 'championship-dna': return { have: Math.min(2, count(mine, (p) => from(p, (o) => wonTitle(o.franchise, o.year)))), need: 2 };
    case 'all-star-pedigree': return { have: Math.min(3, count(mine, (p) => p.ovr >= 88)), need: 3 };
    case 'youth-movement': return { have: Math.min(3, count(mine, (p) => (p.age ?? 99) <= 23)), need: 3 };
    case 'defense-wins': return { have: Math.min(2, count(starters(s), (p) => DEFENSIVE.has(p.tag ?? '') || p.def >= 90)), need: 2 };
    case 'space-floor': return { have: Math.min(3, count(starters(s), (p) => SHOOTING.has(p.tag ?? '') || p.three >= 90)), need: 3 };
    case 'positionless': return { have: Math.min(3, count(starters(s), (p) => positionsOf(p).length >= 2)), need: 3 };
    case 'international-flavor': return { have: Math.min(2, count(mine, (p) => { const n = ctx.nation?.(p); return !!n && n !== 'us'; })), need: 2 };
    default: return null;
  }
}

const gamesLike = (d: Demand) => ['win-now', 'streak-breaker', 'media-frenzy', 'owner-holds'].includes(d.id);

/** How a demand passes (see cards.ts Test). Event and finance follow-ups pass like "reach". */
const testOf = (d: Demand) => cardOf(d.id)?.test ?? 'reach';

export interface Checked { board: BoardState; season: SeasonState; events: BoardEvent[] }

/**
 * Settle every demand that can be settled now. `end` means the regular season is over, so everything left
 * is settled. Passing a board demand is +1 Board Confidence, failing one costs its penalty; at 0 you're fired.
 */
export function checkDemands(b: BoardState, ctx: BoardCtx, end = false): Checked {
  let s = ctx.season;
  const r = s.round;
  const events: BoardEvent[] = [];
  let confidence = b.confidence;
  const demands = b.demands.map((d) => {
    if (d.status !== 'active') return d;
    const ok = holds(d, b, { ...ctx, season: s });
    const due = end || r >= d.due;
    let status: Demand['status'] = 'active';
    if (gamesLike(d)) {
      const { need, of } = gamesNeed(d);
      const played = Math.min(of, r - d.from);
      const wins = winsSince(s, d);
      if (wins >= need) status = 'done';
      else if (wins + (of - played) < need || due) status = 'failed';
    } else {
      const test = testOf(d);
      if (test === 'reach') status = ok ? 'done' : due ? 'failed' : 'active';
      else if (test === 'hold') status = !ok ? 'failed' : due ? 'done' : 'active';
      else status = due ? (ok ? 'done' : 'failed') : 'active';
    }
    if (status === 'active') return d;
    const isDemand = cardOf(d.id)?.kind === 'demand' || d.id === 'fans-demand';
    const delta = status === 'done' ? (d.objective ? OBJECTIVE_REWARD : isDemand ? 1 : 0) : -d.penalty;
    confidence = Math.max(0, Math.min(MAX_CONFIDENCE, confidence + delta));
    events.push({ round: r, kind: status === 'done' ? 'done' : 'failed', id: d.id, delta });
    if (status === 'failed' && d.onFail === 'cut3' && d.ids?.[0]) s = bumpPlayer(s, d.ids[0], -3);
    if (status === 'done' && d.onDone === 'refund' && d.amount) {
      s = { ...s, fees: Math.round(((s.fees ?? 0) - d.amount) * 10) / 10 };
      events.push({ round: r, kind: 'refund', id: d.id, delta: 0 });
    }
    if (status === 'done' && d.onDone === 'lift') {
      // The slump ends early: cancel the rest of the -1.
      const to = d.from + 10;
      if (r < to) s = { ...s, mods: [...(s.mods ?? []), { amount: 1, fromRound: r, toRound: Math.min(SEASON_GAMES, to) }] };
    }
    return { ...d, status, at: r };
  });
  let board: BoardState = { ...b, demands, confidence };
  if (confidence <= 0 && b.firedAt === undefined) {
    board = { ...board, firedAt: r };
    events.push({ round: r, kind: 'fired', delta: 0 });
  }
  board = { ...board, events: [...b.events, ...events] };
  return { board, season: s, events };
}

/** Winning or losing stretches between stops: 75%+ wins is +1 confidence, 25% or worse is -1. */
export function stretch(b: BoardState, s: SeasonState): { board: BoardState; event: BoardEvent | null } {
  const w = s.records[0].w - b.lastW;
  const l = s.records[0].l - b.lastL;
  const base = { ...b, lastW: s.records[0].w, lastL: s.records[0].l };
  if (w + l < 8) return { board: base, event: null };
  const pct = w / (w + l);
  const delta = pct >= 0.75 ? 1 : pct <= 0.25 ? -1 : 0;
  if (!delta) return { board: base, event: null };
  const confidence = Math.max(0, Math.min(MAX_CONFIDENCE, b.confidence + delta));
  const event: BoardEvent = { round: s.round, kind: delta > 0 ? 'hot' : 'cold', delta };
  return {
    board: { ...base, confidence, events: [...b.events, event], ...(confidence <= 0 && b.firedAt === undefined ? { firedAt: s.round } : {}) },
    event,
  };
}

