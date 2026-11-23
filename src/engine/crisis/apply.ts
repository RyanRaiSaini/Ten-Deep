/** Apply a resolved Crisis Card to the season. Pure: returns a new SeasonState. */
import { salaryFor } from '../cap';
import { lineupMinutes } from '../rotation';
import { SEASON_GAMES, outSet, type SeasonState } from '../season';
import { recordStint } from '../season';
import { ALL_SLOTS, STARTER_SLOTS, type Player, type SlotId } from '../types';
import type { CrisisCard } from './offers';
import { reseat } from '../reseat';
import { superstarBlocked } from '../cap';

export interface Decision {
  /** Chosen incoming player (pick cards). */
  incomingId?: string;
  /** Your player's slot to send out (cards where you choose). */
  outSlot?: SlotId;
  /** Two-option cards. */
  option?: 'a' | 'b';
}

/**
 * Put `incoming` into the user's `slot`. If he was on an AI roster, the outgoing player takes his place there
 * (a straight swap), so every roster stays at 10 and nobody is on two teams.
 */
function swapIn(s: SeasonState, slot: SlotId, incoming: Player): SeasonState {
  const teams = [...s.teams];
  const outgoing = teams[0].slots[slot];
  teams[0] = { ...teams[0], slots: reseat({ ...teams[0].slots, [slot]: incoming }) };
  for (let i = 1; i < teams.length; i++) {
    const k = ALL_SLOTS.find((x) => teams[i].slots[x].name === incoming.name);
    if (k) {
      teams[i] = { ...teams[i], slots: reseat({ ...teams[i].slots, [k]: outgoing }) };
      break;
    }
  }
  return { ...recordStint(s, outgoing, incoming), teams };
}

const addMod = (s: SeasonState, amount: number, from: number, to: number): SeasonState => ({
  ...s, mods: [...(s.mods ?? []), { amount, fromRound: from, toRound: Math.min(SEASON_GAMES, to) }],
});

export function applyCard(s: SeasonState, card: CrisisCard, d: Decision): SeasonState {
  const r = s.round;
  const chosen = card.offer?.find((p) => p.id === d.incomingId) ?? card.offer?.[0];
  let out = d.outSlot && card.outSlots?.includes(d.outSlot) ? d.outSlot : card.outSlots?.[0];
  // Never a third 95+: if this pairing would break the rule, send out a slot that keeps it legal.
  const mineNow = s.teams[0].slots;
  if (chosen && out && superstarBlocked({ ...mineNow, [out]: undefined }, chosen)) {
    const ok = card.outSlots?.find((k) => !superstarBlocked({ ...mineNow, [k]: undefined }, chosen));
    if (!ok) return s;
    out = ok;
  }

  switch (card.id) {
    case 'hot-streak':
      return addMod(s, 3, r, r + 10);
    case 'locker-room-glue':
      return addMod(s, 1, r, SEASON_GAMES);
    case 'midseason-miracle':
      return addMod(s, 4, r, r + 15);
    case 'coach-fired':
      return addMod(addMod(s, -3, r, r + 10), 1, r + 10, SEASON_GAMES);
    case 'clean-bill': {
      const injuries = { ...s.injuries };
      for (const k of ALL_SLOTS) delete injuries[s.teams[0].slots[k].id];
      return { ...s, injuries };
    }
    case 'injury-bug': {
      const heavy = lineupMinutes(s.teams[0], outSet(s.injuries, s.teams[0]))
        .filter((e) => !e.player.id.startsWith('rep-'))
        .sort((a, b) => b.minutes - a.minutes);
      const injuries = { ...s.injuries };
      if (heavy[0]) injuries[heavy[0].player.id] = 15;
      if (heavy[1]) injuries[heavy[1].player.id] = 8;
      return { ...s, injuries };
    }
    case 'locker-room-drama':
      return d.option === 'b' && chosen && out ? swapIn(s, out, chosen) : addMod(s, -2, r, r + 15);
    case 'superteam-rumor': {
      if (d.option !== 'a' || !card.offer?.length) return s;
      // The star replaces your highest-paid player (so the two-superstar rule holds), the filler your next.
      const paid = ALL_SLOTS.map((k) => ({ k, sal: salaryFor(s.teams[0].slots[k].ovr) })).sort((a, b) => b.sal - a.sal);
      let next = swapIn(s, paid[0].k, card.offer[0]);
      if (card.offer[1] && paid[1]) next = swapIn(next, paid[1].k, card.offer[1]);
      return next;
    }
    default:
      // Every remaining card is a swap: a chosen (or forced) player in, one of yours out.
      return chosen && out ? swapIn(s, out, chosen) : s;
  }
}
