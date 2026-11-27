/** Lifetime counters, moved only by game events. Missions and achievements both read them. */
import type { Verdict } from '../crisis/board';

export const STAT_KEYS = [
  'runs', 'seasonWins', 'playoffRuns', 'titles',
  'win40', 'win55', 'win60', 'win70', 'win75',
  'perfectTitles', 'cinderella', 'underdog',
  'dailyGames', 'triviaPerfect', 'duels', 'gauntletSeries', 'packs',
  'crisisRuns', 'crisisLegend', 'crisisFired', 'careerSeasons', 'careerTitles', 'franchiseRuns', 'eraRuns',
  'friendsAdded', 'friendGames', 'friendWins', 'friendSweeps', 'allInTitles', 'promotions', 'pickUpgrades', 'rerolls',
] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export const EMPTY_STATS: Stats = Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Stats;

export type RunKind = 'current' | 'franchise' | 'era' | 'daily' | 'crisis' | 'career';

export interface RunEvent {
  type: 'run';
  wins: number;
  losses: number;
  champion: boolean;
  madePlayoffs: boolean;
  /** Conference playoff seed (0 if missed). */
  seed: number;
  playoffLosses: number;
  kind: RunKind;
  verdict: Verdict | null;
}

export type GameEvent =
  | RunEvent
  | { type: 'daily'; perfect: boolean }
  | { type: 'duel' }
  | { type: 'gauntlet' }
  | { type: 'pack' }
  | { type: 'friend'; added: boolean }
  | { type: 'friendGame'; outcome: 'w' | 'l' | 'd'; sweep: boolean }
  | { type: 'allInTitle' }
  | { type: 'promotion' }
  | { type: 'pickUpgrade' }
  | { type: 'reroll' };

export function applyEvent(stats: Stats, e: GameEvent): Stats {
  const s = { ...EMPTY_STATS, ...stats };
  const add = (k: StatKey, n = 1) => { s[k] += n; };
  switch (e.type) {
    case 'run': {
      add('runs');
      add('seasonWins', e.wins);
      if (e.madePlayoffs) add('playoffRuns');
      for (const [k, w] of [['win40', 40], ['win55', 55], ['win60', 60], ['win70', 70], ['win75', 75]] as const) if (e.wins >= w) add(k);
      if (e.champion) {
        add('titles');
        if (e.playoffLosses === 0) add('perfectTitles');
        if (e.seed >= 5) add('cinderella');
        if (e.wins < 65) add('underdog'); // titles take a 95+ squad now: under 65 wins is a real upset
      }
      if (e.kind === 'crisis') {
        add('crisisRuns');
        if (e.verdict === 'legend') add('crisisLegend');
        if (e.verdict === 'fired') add('crisisFired');
      }
      if (e.kind === 'career') {
        add('careerSeasons');
        if (e.champion) add('careerTitles');
      }
      if (e.kind === 'franchise') add('franchiseRuns');
      if (e.kind === 'era') add('eraRuns');
      break;
    }
    case 'daily':
      add('dailyGames');
      if (e.perfect) add('triviaPerfect');
      break;
    case 'duel': add('duels'); break;
    case 'gauntlet': add('gauntletSeries'); break;
    case 'pack': add('packs'); break;
    case 'friend': if (e.added) add('friendsAdded'); break;
    case 'friendGame':
      add('friendGames');
      if (e.outcome === 'w') add('friendWins');
      if (e.sweep) add('friendSweeps');
      break;
    case 'allInTitle': add('allInTitles'); break;
    case 'promotion': add('promotions'); break;
    case 'pickUpgrade': add('pickUpgrades'); break;
    case 'reroll': add('rerolls'); break;
  }
  return s;
}
