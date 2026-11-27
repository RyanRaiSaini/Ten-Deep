/**
 * The Management Crisis deck: 72 cards in four kinds, Box to Box style. At each stop you pick 1 of 6 face-down
 * cards. Board demands set a rule with a deadline and cost Board Confidence if you fail; finance cards move your
 * cap room; perks help; story events just happen. Titles, stories and rules live in i18n under `board.c.<id>`.
 */
export type Kind = 'demand' | 'finance' | 'perk' | 'event';
/** Who's talking on the card: the owner, the GM, the beat reporter, the head coach, or the fans. */
export type Voice = 'owner' | 'gm' | 'reporter' | 'coach' | 'fans';
/**
 * When a demand is checked.
 * - next: by the next card stop. - deadline: by the trade deadline (by season's end if drawn after it).
 * - end: by the end of the regular season. - now: settled on the spot. - games: over the next few games.
 */
export type Due = 'next' | 'deadline' | 'end' | 'now' | 'games';
/**
 * How a demand passes.
 * - reach: done the moment the rule holds (any check up to the deadline); failed if it never did.
 * - hold: failed the moment the rule breaks; done if it held to the deadline.
 * - final: checked once, at the deadline.
 */
export type Test = 'reach' | 'hold' | 'final';

export interface CardDef {
  id: string;
  kind: Kind;
  voice: Voice;
  /** Demands: when it's checked, how it passes, and the Board Confidence it costs to fail it. */
  due?: Due;
  test?: Test;
  penalty?: number;
  /** For `games` demands: wins needed out of the next `of` games. */
  need?: number;
  of?: number;
  /** Finance cards: cap room change as a share of the cap (+ is more room). */
  cash?: number;
  /** Good, bad or a gamble, for the card's color. */
  tone: 'good' | 'bad' | 'gamble';
  /** Only drawn when this holds (see available() in draw.ts). */
  needs?: Need;
}

/** Conditions some cards need to make sense. */
export type Need =
  | 'history' // the run's players come from real past seasons (titles, Finals)
  | 'allTime' // a mode that spans eras (Time machine)
  | 'nationality' // birth-country data (International flavor)
  | 'losing' // under .500 after some games (Streak breaker, Owner holds funds)
  | 'topSix' // top six in the conference (Playoff gate)
  | 'twoStars' // two 95+ players (No superteams)
  | 'veteran' // someone 33 or older on the roster (Player-coach)
  | 'midSeason' // not at the preseason stop (results-based cards)
  | 'early'; // before the trade deadline (Trade demand)

const D = (id: string, voice: Voice, due: Due, test: Test, penalty = 2, extra: Partial<CardDef> = {}): CardDef =>
  ({ id, kind: 'demand', voice, due, test, penalty, tone: 'bad', ...extra });
const F = (id: string, voice: Voice, cash: number, extra: Partial<CardDef> = {}): CardDef =>
  ({ id, kind: 'finance', voice, cash, tone: cash > 0 ? 'good' : 'bad', ...extra });
const P = (id: string, voice: Voice, extra: Partial<CardDef> = {}): CardDef => ({ id, kind: 'perk', voice, tone: 'good', ...extra });
const E = (id: string, voice: Voice, tone: CardDef['tone'], extra: Partial<CardDef> = {}): CardDef => ({ id, kind: 'event', voice, tone, ...extra });

export const CARDS: CardDef[] = [
  // A. Board demands (36)
  D('break-core', 'owner', 'next', 'reach', 3),
  D('every-phase', 'coach', 'next', 'reach'),
  D('statement-signing', 'owner', 'next', 'reach', 3),
  D('prove-it', 'owner', 'deadline', 'reach', 3),
  D('hometown-hero', 'owner', 'deadline', 'reach'),
  D('championship-dna', 'owner', 'deadline', 'reach', 2, { needs: 'history' }),
  D('all-star-pedigree', 'gm', 'deadline', 'reach'),
  D('youth-movement', 'gm', 'end', 'reach'),
  D('veteran-leadership', 'coach', 'next', 'reach'),
  D('finals-experience', 'owner', 'deadline', 'reach', 2, { needs: 'history' }),
  D('defense-wins', 'coach', 'next', 'reach'),
  D('space-floor', 'gm', 'next', 'reach'),
  D('budget-discipline', 'owner', 'end', 'final'),
  D('big-spenders', 'owner', 'next', 'hold'),
  D('bargain-bin', 'owner', 'next', 'hold'),
  D('untouchable', 'fans', 'end', 'hold'),
  D('draft-wave', 'gm', 'now', 'reach', 0, { tone: 'good' }),
  D('positionless', 'coach', 'next', 'reach'),
  D('rivalry-signing', 'owner', 'deadline', 'reach'),
  D('win-now', 'owner', 'games', 'reach', 3, { need: 8, of: 10, needs: 'midSeason' }),
  D('streak-breaker', 'owner', 'games', 'reach', 2, { need: 3, of: 3, needs: 'losing' }),
  D('sell-high', 'gm', 'next', 'reach'),
  D('payroll-purge', 'owner', 'now', 'reach', 0),
  D('breakout-star', 'owner', 'end', 'reach'),
  D('iron-man', 'owner', 'end', 'final'),
  D('rebound-battle', 'coach', 'end', 'final'),
  D('scoring-title', 'reporter', 'end', 'final'),
  D('dpoy', 'coach', 'end', 'final'),
  D('sixth-man', 'coach', 'end', 'final'),
  D('local-legend', 'owner', 'deadline', 'reach'),
  D('international-flavor', 'owner', 'deadline', 'reach', 2, { needs: 'nationality' }),
  D('time-machine', 'owner', 'deadline', 'reach', 2, { needs: 'allTime' }),
  D('no-superteams', 'reporter', 'next', 'final', 2, { needs: 'twoStars' }),
  D('division-crown', 'owner', 'end', 'final'),
  D('home-court', 'owner', 'end', 'final'),
  D('upset-special', 'owner', 'end', 'reach'),

  // B. Finance (16)
  F('arena-revenue', 'gm', 0.05),
  F('concerts', 'gm', 0.04),
  F('jersey-sponsor', 'gm', 0.06),
  F('tv-deal', 'reporter', 0.075),
  F('buyer-interest', 'reporter', 0.1),
  F('owner-all-in', 'owner', 0.125),
  F('playoff-gate', 'gm', 0.05, { needs: 'topSix' }),
  F('luxury-bill', 'gm', -0.05),
  F('owner-holds', 'owner', -0.075, { needs: 'losing', need: 6, of: 10 }),
  F('sponsor-pulls', 'reporter', -0.06, { needs: 'midSeason' }),
  F('insurance', 'gm', -0.04),
  F('tampering', 'reporter', -0.05),
  F('roster-crunch', 'coach', -0.025),
  F('arena-repairs', 'reporter', -0.05),
  F('fans-demand', 'fans', 0.1, { tone: 'gamble' }),
  F('double-nothing', 'owner', 0.075, { tone: 'gamble' }),

  // C. Perks (8)
  P('golden-ticket', 'gm'),
  P('bench-option', 'gm'),
  P('veto', 'owner'),
  P('free-respin', 'gm'),
  P('agent-friend', 'gm'),
  P('scout-tip', 'gm'),
  P('player-coach', 'coach', { needs: 'veteran' }),
  P('second-look', 'owner'),

  // D. Story events (12)
  E('injury-bug', 'reporter', 'bad'),
  E('coach-fired', 'owner', 'gamble', { needs: 'midSeason' }),
  E('trade-demand', 'reporter', 'bad', { needs: 'early' }),
  E('media-frenzy', 'reporter', 'bad', { need: 4, of: 5 }),
  E('locker-drama', 'reporter', 'bad'),
  E('hot-streak', 'reporter', 'good'),
  E('legend-comeback', 'reporter', 'good'),
  E('midseason-miracle', 'coach', 'good'),
  E('contract-year', 'gm', 'good'),
  E('holdout', 'reporter', 'bad'),
  E('rookie-wall', 'coach', 'bad'),
  E('superteam-rumor', 'reporter', 'bad'),
];

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));
export const cardOf = (id: string) => CARD_BY_ID[id];

/** The three recurring characters (fictional). */
export const CAST = { owner: 'Victor Hale', gm: 'Dana Ruiz', reporter: 'Sam Kessler', coach: 'Coach Ellery' } as const;
