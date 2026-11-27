/** Filling a board card's story and rule: the cast, the player or team it's about, amounts in the mode's dollars. */
import type { TFunction } from 'i18next';
import { CAP } from '../../engine/cap';
import { CAST, cardOf, type CardDef } from '../../engine/board/cards';
import type { Offer } from '../../engine/board/state';
import { C, money } from '../theme';
import type { IconName } from '../icons';

/** Rule amounts as a share of the cap, for demands and perks whose rule names a price. */
const RULE_SHARE: Record<string, number> = {
  'prove-it': 0.2, 'budget-discipline': 0.075, 'big-spenders': 0.125, 'bargain-bin': 0.05, 'payroll-purge': 0.075, 'golden-ticket': 0.125,
};

export function cardVars(id: string, offer: Offer | null, scale: number): Record<string, string | number> {
  const amount = offer?.amount ?? (RULE_SHARE[id] ?? 0) * CAP;
  return {
    ...CAST, name: offer?.name ?? '', city: offer?.city ?? '', amount: money(amount, scale), games: offer?.amount ?? 0,
  };
}

export const cardTitle = (t: TFunction, id: string) => t(`board.c.${id}.title`);

export const KIND_COLOR: Record<CardDef['kind'], string> = { demand: C.danger, finance: C.neon, perk: C.blue, event: C.purple };
export const TONE_COLOR: Record<CardDef['tone'], string> = { good: C.neon, bad: C.danger, gamble: C.gold };
export const KIND_ICON: Record<CardDef['kind'], IconName> = { demand: 'clipboard', finance: 'coin', perk: 'gift', event: 'news' };

/** A card's color: demands are red, finance green (or red when it costs you), perks blue, events by tone. */
export function cardColor(id: string): string {
  const def = cardOf(id);
  if (def.kind === 'finance') return TONE_COLOR[def.tone];
  if (def.kind === 'event') return TONE_COLOR[def.tone] === C.neon ? C.purple : def.tone === 'gamble' ? C.gold : C.danger;
  return KIND_COLOR[def.kind];
}
