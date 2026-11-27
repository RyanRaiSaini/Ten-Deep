/** Playing the board's cards: drawing six at a stop, revealing the one you tap, and resolving it. */
import { CAP, MIN_SALARY, payOf, superstarBlocked } from '../cap';
import { createRng, shuffle } from '../rng';
import { squadRating } from '../rotation';
import { DEADLINE_GAME, SEASON_GAMES, seedOf, type SeasonState } from '../season';
import { confOfDiv } from '../conference';
import { ALL_SLOTS, BENCH_SLOTS, STARTER_SLOTS, type Player, type Pool, type SlotId, playsPos } from '../types';
import { reseat } from '../reseat';
import { BUILD_EVENTS, CRISIS_OBJECTIVES, SEASON_EVENTS, TAKEOVER_OBJECTIVES, cardOf, type CardDef } from './cards';
import { signOption } from './market';
import type { BoardCtx } from './rules';
import { HAND, OBJECTIVE_PENALTY, dueRound, drawnIds, stopAt, type BoardState, type Demand, type Offer, type StopKind } from './state';
import { addFee, bumpPlayer } from './util';

export interface PlayCtx extends BoardCtx {
  /** The run's pool (free agents) and the all-time pool (legends). */
  pool: Pool;
  allTime: Pool;
  /** Players come from real past seasons (titles and Finals can be checked). */
  history: boolean;
  /** The mode spans eras. */
  allTimeMode: boolean;
  /** "Chicago Bulls" for 'chi'. */
  teamName: (franchise: string) => string;
}

const mine = (s: SeasonState) => ALL_SLOTS.map((k) => ({ k, p: s.teams[0].slots[k] }));

export function available(def: CardDef, b: BoardState, ctx: PlayCtx): boolean {
  const s = ctx.season;
  const r = s.records[0];
  const ps = mine(s).map((x) => x.p);
  if (b.demands.some((d) => d.status === 'active' && d.id === def.id)) return false;
  switch (def.needs) {
    case 'history': return ctx.history;
    case 'allTime': return ctx.allTimeMode;
    case 'nationality': return !!ctx.nation && ps.some((p) => !!ctx.nation!(p));
    case 'losing': return s.round >= 6 && r.w < r.l;
    case 'topSix': return s.round >= 6 && seedOf(s, 0).seed <= 6;
    case 'twoStars': return ps.filter((p) => p.ovr >= 95).length >= 2;
    case 'veteran': return ps.some((p) => (p.age ?? 0) >= 33);
    case 'midSeason': return s.round > 0;
    case 'early': return s.round < DEADLINE_GAME - 4;
    default: return true;
  }
}

/** The ids a stop can deal: objectives for an objective stop, good-or-bad events otherwise. */
export function dealable(kind: StopKind, takeover: boolean): string[] {
  if (kind === 'objective') return takeover ? TAKEOVER_OBJECTIVES : CRISIS_OBJECTIVES;
  return takeover ? BUILD_EVENTS : SEASON_EVENTS;
}

/** Six face-down cards from a list, never one already played this run. `key` seeds the shuffle. */
export function dealFrom(ids: readonly string[], b: BoardState, ctx: PlayCtx, key: string): string[] {
  const used = new Set(drawnIds(b));
  const left = ids.map(cardOf).filter((c) => c && !used.has(c.id) && available(c, b, ctx));
  return shuffle(left, createRng(`${ctx.season.seed}:${key}`)).slice(0, HAND).map((c) => c.id);
}

/** Six face-down cards for the season stop being played. */
export function drawHand(b: BoardState, ctx: PlayCtx): string[] {
  return dealFrom(dealable(stopAt(b)?.kind ?? 'event', false), b, ctx, `board:${b.stop}`);
}

/** Everyone not on your team and not on any roster: the mode's free agents. */
function freeAgents(s: SeasonState, pool: Pool): Player[] {
  const taken = new Set(s.teams.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k].name)));
  const seen = new Set<string>();
  return pool.teams.flatMap((t) => t.players).filter((p) => !taken.has(p.name) && !seen.has(p.name) && (seen.add(p.name), true));
}

/** What a revealed card puts in front of you: players, choices, who it's about. */
export function prepareOffer(id: string, b: BoardState, ctx: PlayCtx): Offer {
  const s = ctx.season;
  const rng = createRng(`${s.seed}:board-offer:${b.stop}:${id}`);
  const ms = mine(s);
  const byOvr = [...ms].sort((a, c) => c.p.ovr - a.p.ovr);
  const starters = ms.filter((x) => STARTER_SLOTS.includes(x.k));
  const lowest = [...ms].sort((a, c) => a.p.ovr - c.p.ovr)[0];
  const fa = freeAgents(s, ctx.pool);
  const legalFor = (slots: SlotId[]) => (p: Player) => slots.some((k) => !superstarBlocked({ ...s.teams[0].slots, [k]: undefined }, p) && (!STARTER_SLOTS.includes(k) || playsPos(p, k)));
  const sample = (ps: Player[], n: number) => shuffle(ps, rng).slice(0, n);
  const conf = s.divs ? confOfDiv(s.divs[0]) : null;
  const rivals = s.teams.map((t, i) => ({ t, i })).filter(({ i }) => i > 0 && (conf === null || confOfDiv(s.divs![i]) === conf));
  switch (id) {
    case 'hometown-hero': {
      // Three teams to choose from: two of your players must have played for any of them.
      const ai = shuffle(s.teams.map((t, i) => ({ t, i })).filter(({ t, i }) => i > 0 && t.franchise && t.franchise !== b.home), rng).slice(0, 3);
      return ai.length ? { teams: ai.map(({ t }) => t.franchise!), city: ai.map(({ t }) => t.name).join(' / ') } : {};
    }
    case 'local-legend':
      return { name: b.home, city: ctx.teamName(b.home) };
    case 'untouchable':
    case 'holdout':
      return { target: byOvr[0].k, name: byOvr[0].p.name, ...(id === 'holdout' ? { options: ['pay', 'sit'], amount: CAP * 0.025 } : {}) };
    case 'sell-high':
      return { target: byOvr[1].k, name: byOvr[1].p.name };
    case 'upset-special': {
      const best = s.teams.map((t, i) => ({ i, sr: squadRating(t) })).filter((x) => x.i > 0).sort((a, c) => c.sr - a.sr)[0];
      return { team: best.i, city: s.teams[best.i].name };
    }
    case 'draft-wave': {
      const young = fa.filter((p) => p.rookie || (p.age ?? 99) <= 21).filter(legalFor([lowest.k]));
      return { players: sample([...young].sort((a, c) => c.ovr - a.ovr).slice(0, 8), 3), outSlots: [lowest.k], target: lowest.k, name: lowest.p.name };
    }
    case 'golden-ticket': {
      const ok = fa.filter((p) => payOf(p) <= CAP * 0.125).filter(legalFor(ALL_SLOTS)).sort((a, c) => c.ovr - a.ovr).slice(0, 12);
      return { players: sample(ok, 4), outSlots: [...ALL_SLOTS] };
    }
    case 'bench-option': {
      const ok = fa.filter((p) => p.ovr >= 76 && p.ovr <= 84).filter(legalFor(ALL_SLOTS));
      return { players: sample(ok, 3).map((p) => ({ ...p, salary: MIN_SALARY })), outSlots: [...ALL_SLOTS] };
    }
    case 'legend-comeback': {
      const names = new Set(s.teams.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k].name)));
      const seen = new Set<string>();
      const legends = ctx.allTime.teams.flatMap((t) => t.players)
        .filter((p) => p.ovr >= 88 && p.ovr < 95 && !names.has(p.name) && !seen.has(p.name) && (seen.add(p.name), true));
      return { players: sample(legends, 3).map((p) => ({ ...p, salary: MIN_SALARY })), outSlots: [...BENCH_SLOTS] };
    }
    case 'player-coach': {
      const vet = [...ms].filter((x) => (x.p.age ?? 0) >= 33).sort((a, c) => c.p.ovr - a.p.ovr)[0];
      return vet ? { target: vet.k, name: vet.p.name } : {};
    }
    case 'trade-demand': {
      const x = rng.pick(byOvr.slice(1, 6));
      return { target: x.k, name: x.p.name };
    }
    case 'injury-bug': {
      const x = rng.pick(starters.filter((y) => !s.injuries[y.p.id]));
      return x ? { target: x.k, name: x.p.name, amount: rng.int(8, 15) } : {};
    }
    case 'midseason-miracle': {
      const x = [...starters].sort((a, c) => a.p.ovr - c.p.ovr)[0];
      return { target: x.k, name: x.p.name };
    }
    case 'contract-year': {
      const x = rng.pick(byOvr.slice(0, 8));
      return { target: x.k, name: x.p.name };
    }
    case 'rookie-wall': {
      const x = [...ms].sort((a, c) => (a.p.age ?? 99) - (c.p.age ?? 99))[0];
      return { target: x.k, name: x.p.name };
    }
    case 'locker-drama': {
      // Two starters clash; benching one means swapping him with your best bench player who can play there.
      const clash = shuffle(starters, rng).find((st) => ms.some((x) => BENCH_SLOTS.includes(x.k) && playsPos(x.p, st.k))) ?? starters[0];
      const sub = ms.filter((x) => BENCH_SLOTS.includes(x.k) && playsPos(x.p, clash.k)).sort((a, c) => c.p.ovr - a.p.ovr)[0];
      return { target: clash.k, name: clash.p.name, options: sub ? ['bench', 'ride'] : ['ride'] };
    }
    case 'coach-fired':
      return { options: ['offense', 'defense', 'players', 'interim'] };
    case 'superteam-rumor': {
      const pick = [...rivals].sort((a, c) => squadRating(c.t) - squadRating(a.t))[rng.int(0, Math.min(2, rivals.length - 1))];
      return pick ? { team: pick.i, city: pick.t.name } : {};
    }
    default: {
      const cash = cardOf(id)?.cash;
      return cash ? { amount: Math.abs(cash) * CAP } : {};
    }
  }
}

export interface Decision { incomingId?: string; outSlot?: SlotId; option?: string }

const demand = (id: string, b: BoardState, s: SeasonState, extra: Partial<Demand> = {}): Demand => {
  const def = cardOf(id);
  return {
    id, from: s.round, due: dueRound(def?.due ?? 'next', s.round, b.stop, def?.of), status: 'active', penalty: def?.penalty ?? 2,
    wins: s.records[0].w, sig: b.signings.length,
    // A board demand is the run's objective: it costs more to fail.
    ...(def?.kind === 'demand' ? { objective: true, penalty: OBJECTIVE_PENALTY } : {}),
    ...extra,
  };
};
const addMod = (s: SeasonState, amount: number, from: number, to: number): SeasonState => ({
  ...s, mods: [...(s.mods ?? []), { amount, fromRound: from, toRound: Math.min(SEASON_GAMES, to) }],
});

/** Resolve the revealed card with your decision. Returns the new season and board (call checkDemands after). */
export function resolveCard(id: string, offer: Offer, d: Decision, b0: BoardState, ctx: PlayCtx): { season: SeasonState; board: BoardState } {
  let s = ctx.season;
  let b: BoardState = b0;
  const r = s.round;
  const def = cardOf(id);
  const amount = offer.amount ?? 0;
  const chosen = offer.players?.find((p) => p.id === d.incomingId) ?? offer.players?.[0];
  const outOk = (k: SlotId | undefined, p: Player) =>
    !!k && (offer.outSlots ?? []).includes(k) && (!STARTER_SLOTS.includes(k) || playsPos(p, k)) && !superstarBlocked({ ...s.teams[0].slots, [k]: undefined }, p);
  const outFor = (p: Player) => (outOk(d.outSlot, p) ? d.outSlot! : offer.outSlots?.find((k) => outOk(k, p)));
  const perkSign = (p: Player, pay: number) => {
    const k = outFor(p);
    if (!k) return;
    ({ season: s, board: b } = signOption(s, b, k, { tier: 'perk', player: p, pay }, 'perk'));
  };

  if (def.kind === 'demand') {
    switch (id) {
      case 'draft-wave':
        if (chosen) perkSign(chosen, payOf(chosen));
        b = { ...b, demands: [...b.demands, { ...demand(id, b, s), status: 'done', at: r, penalty: 0 }] };
        return { season: s, board: { ...b, confidence: Math.min(10, b.confidence + 1), events: [...b.events, { round: r, kind: 'done', id, delta: 1 }] } };
      case 'payroll-purge': {
        // The three biggest contracts are swapped for cheaper players at their spots, and the cap drops.
        const paid = mine(s).sort((a, c) => payOf(c.p) - payOf(a.p)).slice(0, 3);
        const rng = createRng(`${s.seed}:purge:${r}`);
        for (const { k, p } of paid) {
          const taken = new Set(s.teams.flatMap((t) => ALL_SLOTS.map((x) => t.slots[x].name)));
          const opts = freeAgents(s, ctx.pool).filter((q) => !taken.has(q.name) && payOf(q) < payOf(p) && q.ovr >= p.ovr - 7 && q.ovr <= p.ovr
            && (!STARTER_SLOTS.includes(k) || playsPos(q, k)) && !superstarBlocked({ ...s.teams[0].slots, [k]: undefined }, q));
          if (!opts.length) continue;
          const q = rng.pick(opts);
          ({ season: s, board: b } = signOption(s, b, k, { tier: 'perk', player: q, pay: payOf(q) }, 'perk'));
        }
        s = addFee(s, CAP * 0.075);
        b = { ...b, demands: [...b.demands, { ...demand(id, b, s), status: 'done', at: r, penalty: 0 }] };
        return { season: s, board: b };
      }
      case 'hometown-hero':
        return { season: s, board: { ...b, demands: [...b.demands, demand(id, b, s, { franchises: offer.teams ?? [] })] } };
      case 'local-legend':
        return { season: s, board: { ...b, demands: [...b.demands, demand(id, b, s, { franchise: offer.name })] } };
      case 'break-core':
        return { season: s, board: { ...b, demands: [...b.demands, demand(id, b, s, { ids: STARTER_SLOTS.map((k) => s.teams[0].slots[k].id) })] } };
      case 'untouchable':
        return { season: s, board: { ...b, demands: [...b.demands, demand(id, b, s, { ids: [s.teams[0].slots[offer.target!].id] })] } };
      case 'sell-high': {
        const p = s.teams[0].slots[offer.target!];
        return { season: s, board: { ...b, demands: [...b.demands, demand(id, b, s, { ids: [p.id, p.name], pay: payOf(p) })] } };
      }
      case 'upset-special':
        return { season: s, board: { ...b, demands: [...b.demands, demand(id, b, s, { team: offer.team })] } };
      default:
        return { season: s, board: { ...b, demands: [...b.demands, demand(id, b, s)] } };
    }
  }

  if (def.kind === 'finance') {
    switch (id) {
      case 'fans-demand':
        return { season: addFee(s, -amount), board: { ...b, demands: [...b.demands, demand('fans-demand', b, s, { due: dueRound('next', s.round, b.stop), penalty: 2 })] } };
      case 'owner-holds':
        return {
          season: addFee(s, amount),
          board: { ...b, demands: [...b.demands, demand(id, b, s, { penalty: 0, due: Math.min(SEASON_GAMES, r + 10), onDone: 'refund', amount })] },
        };
      case 'tampering':
        return { season: addFee(s, amount), board: { ...b, respins: Math.max(0, b.respins - 1) } };
      case 'roster-crunch':
        return { season: addFee(s, amount), board: { ...b, crunch: true } };
      default:
        return { season: addFee(s, (def.cash ?? 0) > 0 ? -amount : amount), board: b };
    }
  }

  if (def.kind === 'perk') {
    switch (id) {
      case 'golden-ticket':
        if (chosen) perkSign(chosen, payOf(chosen));
        return { season: s, board: b };
      case 'bench-option':
        if (chosen) perkSign(chosen, MIN_SALARY);
        return { season: s, board: b };
      case 'free-respin':
        return { season: s, board: { ...b, respins: b.respins + 1 } };
      case 'player-coach':
        return { season: offer.target ? bumpPlayer(s, s.teams[0].slots[offer.target].id, 2) : s, board: b };
      default:
        return { season: s, board: { ...b, perks: [...b.perks, id] } };
    }
  }

  // Story events.
  const target = offer.target ? s.teams[0].slots[offer.target] : undefined;
  switch (id) {
    case 'injury-bug':
      return { season: target ? { ...s, injuries: { ...s.injuries, [target.id]: Math.max(s.injuries[target.id] ?? 0, amount) } } : s, board: b };
    case 'coach-fired': {
      const o = d.option ?? 'interim';
      if (o === 'offense') s = addMod(addMod(addFee(s, CAP * 0.06), 3, r, r + 20), 1, r + 20, SEASON_GAMES);
      else if (o === 'defense') s = addMod(addFee(s, CAP * 0.06), 2, r, SEASON_GAMES);
      else if (o === 'players') {
        s = addMod(addFee(s, CAP * 0.03), 1, r, SEASON_GAMES);
        b = { ...b, confidence: Math.min(10, b.confidence + 1) };
      } else s = addMod(s, -2, r, r + 10);
      return { season: s, board: b };
    }
    case 'trade-demand':
      return { season: s, board: { ...b, demands: [...b.demands, { ...demand(id, b, s, { ids: target ? [target.id] : [], penalty: 0, onFail: 'cut3' }), due: dueRound('deadline', r, b.stop) }] } };
    case 'media-frenzy':
      return {
        season: addMod(s, -1, r, r + 10),
        board: { ...b, demands: [...b.demands, demand(id, b, s, { penalty: 0, due: Math.min(SEASON_GAMES, r + 5), onDone: 'lift' })] },
      };
    case 'locker-drama': {
      if (d.option === 'bench' && offer.target && target) {
        const sub = mine(s).filter((x) => BENCH_SLOTS.includes(x.k) && playsPos(x.p, offer.target!)).sort((a, c) => c.p.ovr - a.p.ovr)[0];
        if (sub) {
          const slots = reseat({ ...s.teams[0].slots, [offer.target]: sub.p, [sub.k]: target });
          const teams = [...s.teams];
          teams[0] = { ...teams[0], slots };
          return { season: { ...s, teams }, board: b };
        }
      }
      return { season: addMod(s, -2, r, r + 10), board: b };
    }
    case 'hot-streak':
      return { season: addMod(s, 2, r, r + 10), board: b };
    case 'team-chemistry':
      return { season: addMod(s, 3, r, r + 10), board: b };
    case 'legend-comeback':
      if (chosen) perkSign(chosen, MIN_SALARY);
      return { season: s, board: b };
    case 'midseason-miracle':
      return { season: target ? bumpPlayer(s, target.id, 4) : s, board: b };
    case 'contract-year':
      return { season: target ? bumpPlayer(s, target.id, 2) : s, board: b };
    case 'holdout':
      if (d.option === 'pay') return { season: addFee(s, amount), board: b };
      return { season: target ? { ...s, injuries: { ...s.injuries, [target.id]: Math.max(s.injuries[target.id] ?? 0, 5) } } : s, board: b };
    case 'rookie-wall':
      return { season: addMod(s, -1, r, r + 10), board: b };
    case 'superteam-rumor': {
      if (offer.team === undefined) return { season: s, board: b };
      const teams = [...s.teams];
      teams[offer.team] = { ...teams[offer.team], mod: (teams[offer.team].mod ?? 0) + 3 };
      return { season: { ...s, teams }, board: b };
    }
    default:
      return { season: s, board: b };
  }
}

/** Use a held veto on an active demand. */
export function vetoDemand(b: BoardState, index: number): BoardState {
  if (!b.perks.includes('veto') || b.demands[index]?.status !== 'active') return b;
  const perks = [...b.perks];
  perks.splice(perks.indexOf('veto'), 1);
  return { ...b, perks, demands: b.demands.map((d, i) => (i === index ? { ...d, status: 'vetoed' as const } : d)) };
}
