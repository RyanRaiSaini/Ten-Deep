import { tierOf, type Card } from '../engine/collect/tiers';
import { HISTORY } from './modes';
import { withLegendPositions } from './positions';

/** Every player-season in the database is a collectible card (2013 LeBron and 2016 LeBron are different cards). */
export const ALL_CARDS: Card[] = HISTORY.flatMap((t) =>
  t.players.map(withLegendPositions).map((p) => ({
    id: p.id, name: p.name, season: t.season, team: t.label, pos: p.pos, pos2: p.pos2, more: p.more,
    ovr: p.ovr, tier: tierOf(p.ovr), colors: t.colors, tag: p.tag,
  })),
);

export const CARD_BY_ID: Record<string, Card> = Object.fromEntries(ALL_CARDS.map((c) => [c.id, c]));
