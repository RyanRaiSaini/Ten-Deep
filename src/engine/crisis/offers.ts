/** Turn a drawn card into a concrete, seeded offer: which players are on the table and which of yours can go. */
import { payOf, superstarBlocked } from '../cap';
import { createRng, shuffle } from '../rng';
import type { SeasonState } from '../season';
import { ALL_SLOTS, BENCH_SLOTS, STARTER_SLOTS, type Player, type Pool, type SlotId, playsPos } from '../types';
import type { CardId } from './deck';

export interface CrisisCard {
  id: CardId;
  slot: number;
  round: number;
  /** Players on offer (pick one), or the forced incoming player(s). */
  offer?: Player[];
  /** Which of your slots can be sent out (one entry = forced). */
  outSlots?: SlotId[];
  /** Two-option card (option 'a' / 'b'). */
  choice?: boolean;
  /** Slot of a player singled out by the card (trade demand, luxury tax...). */
  target?: SlotId;
}

const byOvr = (a: Player, b: Player) => b.ovr - a.ovr;

export function prepareCard(season: SeasonState, id: CardId, slot: number, pool: Pool, allTime: Pool): CrisisCard {
  const rng = createRng(`${season.seed}:crisis-offer:${slot}`);
  const user = season.teams[0];
  const mine = ALL_SLOTS.map((k) => ({ k, p: user.slots[k] }));
  const myNames = new Set(mine.map((x) => x.p.name));
  const leagueNames = new Set(season.teams.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k].name)));
  const dedupe = (ps: Player[]) => [...new Map(ps.map((p) => [p.name, p])).values()];
  /** Anyone not on your team: free agents from the mode pool plus players on AI rosters (they become swaps). */
  const others = dedupe([...season.teams.slice(1).flatMap((t) => ALL_SLOTS.map((k) => t.slots[k])), ...pool.teams.flatMap((t) => t.players)])
    .filter((p) => !myNames.has(p.name));
  const pickN = (ps: Player[], n: number) => shuffle(ps, rng).slice(0, n);
  const lowest = [...mine].sort((a, b) => a.p.ovr - b.p.ovr)[0].k;
  const lowestBench = [...mine].filter((x) => BENCH_SLOTS.includes(x.k)).sort((a, b) => a.p.ovr - b.p.ovr)[0].k;
  const bestSlot = [...mine].sort((a, b) => b.p.ovr - a.p.ovr)[0].k;
  const cheapest = (n: number) => pickN([...others].sort((a, b) => a.ovr - b.ovr).slice(0, 12), n);
  const base: CrisisCard = { id, slot, round: season.round };
  /** Drop offers that would make a third 95+ whichever allowed slot goes out. */
  const legal = (c: CrisisCard): CrisisCard => (!c.offer || !c.outSlots ? c : {
    ...c, offer: c.offer.filter((p) => c.outSlots!.some((k) => !superstarBlocked({ ...user.slots, [k]: undefined }, p))),
  });
  return legal(offerFor());
  function offerFor(): CrisisCard {

  switch (id) {
    case 'cap-boost':
      return { ...base, offer: pickN(others.filter((p) => p.ovr >= 80 && p.ovr <= 90), 3), outSlots: [lowest] };
    case 'rookie-gem':
      return { ...base, offer: pickN(others.filter((p) => (p.age ?? 99) <= 22).sort(byOvr).slice(0, 8), 3), outSlots: [lowest] };
    case 'veteran-mentor':
      return { ...base, offer: pickN(others.filter((p) => (p.age ?? 0) >= 33).sort(byOvr).slice(0, 10), 3), outSlots: [lowestBench] };
    case 'media-frenzy':
      return { ...base, offer: pickN(others.filter((p) => (p.age ?? 0) >= 28 && p.ovr >= 84).sort(byOvr).slice(0, 15), 5), outSlots: [...ALL_SLOTS] };
    case 'blow-it-up': {
      const prospect = others.filter((p) => (p.age ?? 99) <= 23).sort(byOvr)[0];
      return { ...base, offer: [prospect], outSlots: [bestSlot], target: bestSlot };
    }
    case 'trade-demand': {
      const target = rng.pick(STARTER_SLOTS);
      const t = user.slots[target];
      const fits = (p: Player) => playsPos(p, target);
      let offer = others.filter((p) => fits(p) && p.ovr <= t.ovr - 4 && p.ovr >= t.ovr - 10);
      if (offer.length < 3) offer = others.filter((p) => fits(p) && p.ovr < t.ovr).sort(byOvr).slice(0, 6);
      return { ...base, offer: pickN(offer, 3), outSlots: [target], target };
    }
    case 'luxury-tax': {
      const target = [...mine].sort((a, b) => payOf(b.p) - payOf(a.p))[0].k;
      const cap = payOf(user.slots[target]) - 10;
      const offer = others.filter((p) => payOf(p) <= Math.max(1, cap)).sort(byOvr).slice(0, 10);
      return { ...base, offer: pickN(offer, 3), outSlots: [target], target };
    }
    case 'locker-room-drama': {
      const bestBench = [...mine].filter((x) => BENCH_SLOTS.includes(x.k)).sort((a, b) => b.p.ovr - a.p.ovr)[0].k;
      return { ...base, choice: true, offer: cheapest(1), outSlots: [bestBench], target: bestBench };
    }
    case 'superteam-rumor': {
      const stars = others.filter((p) => p.ovr >= 95);
      const star = stars.length ? rng.pick(stars) : rng.pick(allTime.teams.flatMap((t) => t.players).filter((p) => p.ovr >= 95 && !myNames.has(p.name)));
      const filler = cheapest(1).filter((p) => p.name !== star.name);
      return { ...base, choice: true, offer: [star, ...filler] };
    }
    case 'legend-comeback': {
      const legends = allTime.teams.flatMap((t) => t.players).filter((p) => p.ovr >= 90 && !leagueNames.has(p.name));
      return { ...base, offer: pickN(legends, 3), outSlots: [lowestBench] };
    }
    default:
      return base;
  }
  }
}
