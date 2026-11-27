/** A card stop from start to finish: arrive (settle demands, draw six), reveal the one you tap, resolve it. */
import type { SeasonState } from '../season';
import { cardOf } from './cards';
import { drawHand, prepareOffer, resolveCard, type Decision, type PlayCtx } from './play';
import { checkDemands, stretch } from './rules';
import { STOPS, type BoardEvent, type BoardState } from './state';

export interface Step { board: BoardState; season: SeasonState; events: BoardEvent[] }

/** The season reached the next stop: settle what's due, grade the stretch since the last stop, deal six cards. */
export function arrive(b0: BoardState, ctx: PlayCtx): Step {
  const checked = checkDemands(b0, ctx);
  let b = checked.board;
  const events = [...checked.events];
  if (b.stop > 0) {
    const st = stretch(b, checked.season);
    b = st.board;
    if (st.event) events.push(st.event);
  }
  if (b.firedAt !== undefined) return { board: b, season: checked.season, events };
  const c = { ...ctx, season: checked.season };
  const hand = drawHand(b, c);
  const scout = b.perks.includes('scout-tip');
  return {
    board: { ...b, hand, picked: null, offer: null, peek: scout ? [0, 1] : [], perks: scout ? b.perks.filter((x) => x !== 'scout-tip') : b.perks },
    season: checked.season,
    events,
  };
}

/** Flip the card you tapped. */
export function reveal(b: BoardState, index: number, ctx: PlayCtx): BoardState {
  if (!b.hand || b.picked || !b.hand[index]) return b;
  const id = b.hand[index];
  return { ...b, picked: id, offer: prepareOffer(id, b, ctx) };
}

/** Second look: swap a revealed finance card for another card from the hand. */
export function secondLook(b: BoardState, ctx: PlayCtx): BoardState {
  if (!b.hand || !b.picked || !b.perks.includes('second-look') || cardOf(b.picked).kind !== 'finance') return b;
  const others = b.hand.filter((x) => x !== b.picked);
  const id = others[ctx.season.round % others.length];
  const perks = [...b.perks];
  perks.splice(perks.indexOf('second-look'), 1);
  return { ...b, perks, picked: id, offer: prepareOffer(id, b, ctx) };
}

/**
 * Resolve the revealed card and move on to the next stop. A rebuild card (between positions) doesn't use up a
 * season stop, and its demands are only checked from tip-off on.
 */
export function resolve(b0: BoardState, d: Decision, ctx: PlayCtx, rebuild?: { n: number }): Step {
  if (!b0.picked || !b0.offer || !b0.hand) return { board: b0, season: ctx.season, events: [] };
  const id = b0.picked;
  const offer = b0.offer;
  const r = ctx.season.round;
  const played = {
    stop: rebuild ? -1 - rebuild.n : b0.stop, round: r, id, missed: b0.hand.filter((x) => x !== id),
    ...(d.option ? { choice: d.option } : {}),
    ...(offer.name ? { name: offer.city ?? offer.name } : offer.city ? { name: offer.city } : {}),
  };
  const res = resolveCard(id, offer, d, b0, ctx);
  // New demands keep the names their card used, for the panel.
  const demands = res.board.demands.map((x) => (x.from === r && x.name === undefined && x.city === undefined && !b0.demands.includes(x)
    ? { ...x, ...(offer.name ? { name: offer.name } : {}), ...(offer.city ? { city: offer.city } : {}) } : x));
  const b: BoardState = { ...res.board, demands, played: [...res.board.played, played], hand: null, picked: null, offer: null, peek: [], stop: rebuild ? b0.stop : b0.stop + 1 };
  if (rebuild) return { board: b, season: res.season, events: [] };
  // Some demands are met (or broken) the moment you make the move.
  const checked = checkDemands(b, { ...ctx, season: res.season });
  return checked;
}

/** The rounds the season still pauses at for cards. */
export const stopsAfter = (b: BoardState) => STOPS.slice(b.stop);
