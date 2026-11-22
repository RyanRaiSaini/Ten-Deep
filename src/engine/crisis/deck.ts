import { createRng } from '../rng';

export type Rarity = 'good' | 'bad' | 'legendary';
export type CardId =
  | 'cap-boost' | 'hot-streak' | 'rookie-gem' | 'veteran-mentor' | 'locker-room-glue' | 'clean-bill'
  | 'media-frenzy' | 'blow-it-up' | 'trade-demand' | 'injury-bug' | 'coach-fired' | 'luxury-tax' | 'locker-room-drama'
  | 'superteam-rumor' | 'legend-comeback' | 'midseason-miracle';

export interface CardDef {
  id: CardId;
  rarity: Rarity;
  icon: string;
}

/** The deck. Titles and flavor text live in i18n under `crisis.cards.<id>`. */
export const DECK: CardDef[] = [
  { id: 'cap-boost', rarity: 'good', icon: '💰' },
  { id: 'hot-streak', rarity: 'good', icon: '🔥' },
  { id: 'rookie-gem', rarity: 'good', icon: '💎' },
  { id: 'veteran-mentor', rarity: 'good', icon: '🧓' },
  { id: 'locker-room-glue', rarity: 'good', icon: '🤝' },
  { id: 'clean-bill', rarity: 'good', icon: '🩺' },
  { id: 'media-frenzy', rarity: 'bad', icon: '📸' },
  { id: 'blow-it-up', rarity: 'bad', icon: '🧨' },
  { id: 'trade-demand', rarity: 'bad', icon: '📝' },
  { id: 'injury-bug', rarity: 'bad', icon: '🩼' },
  { id: 'coach-fired', rarity: 'bad', icon: '📋' },
  { id: 'luxury-tax', rarity: 'bad', icon: '🧾' },
  { id: 'locker-room-drama', rarity: 'bad', icon: '💢' },
  { id: 'superteam-rumor', rarity: 'legendary', icon: '🌟' },
  { id: 'legend-comeback', rarity: 'legendary', icon: '👑' },
  { id: 'midseason-miracle', rarity: 'legendary', icon: '✨' },
];

/** Cards arrive about every two months: preseason, December, February (before the deadline), April. */
export const CARD_ROUNDS = [0, 20, 45, 70];
export const CARD_MONTHS = ['preseason', 'december', 'february', 'april'] as const;

const WEIGHT: Record<Rarity, number> = { good: 45, bad: 40, legendary: 15 };

export const cardDef = (id: CardId) => DECK.find((c) => c.id === id)!;

/** Seeded draw for a run's card slot, never repeating a card already drawn this run. */
export function drawCard(seed: string, slot: number, drawn: CardId[]): CardId {
  const rng = createRng(`${seed}:crisis:${slot}`);
  const left = DECK.filter((c) => !drawn.includes(c.id));
  const rarities = (['good', 'bad', 'legendary'] as Rarity[]).filter((r) => left.some((c) => c.rarity === r));
  const total = rarities.reduce((s, r) => s + WEIGHT[r], 0);
  let roll = rng.next() * total;
  let rarity = rarities[rarities.length - 1];
  for (const r of rarities) {
    if (roll < WEIGHT[r]) {
      rarity = r;
      break;
    }
    roll -= WEIGHT[r];
  }
  return rng.pick(left.filter((c) => c.rarity === rarity)).id;
}
