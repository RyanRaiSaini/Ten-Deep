/** 55 achievements: each one is a stat reaching a target. Silver pays a Weekly pick, gold a Mythic pick. */
import type { PickType } from '../collect/picks';
import type { StatKey, Stats } from './stats';

/** Collection-derived values, read live from the collection rather than counted. */
export type CollectionKey = 'owned' | 'hasEpic' | 'hasMythic' | 'hasUltra' | 'sets' | 'maxLevel' | 'gauntlet' | 'streak' | 'friends' | 'leagueBest';
export type ProgressKey = StatKey | CollectionKey;

export type Snapshot = { stats: Stats } & Record<CollectionKey, number>;

export type Medal = 'bronze' | 'silver' | 'gold';

export interface Achievement {
  id: string;
  icon: string;
  stat: ProgressKey;
  target: number;
  tier: Medal;
  reward: PickType | null;
}

const REWARD: Record<Medal, PickType | null> = { bronze: null, silver: 'weekly', gold: 'mythic' };
const a = (id: string, icon: string, stat: ProgressKey, target: number, tier: Medal): Achievement =>
  ({ id, icon, stat, target, tier, reward: REWARD[tier] });

export const ACHIEVEMENTS: Achievement[] = [
  a('rookie', '🏀', 'runs', 1, 'bronze'),
  a('regular', '📅', 'runs', 10, 'bronze'),
  a('veteran', '🎖️', 'runs', 50, 'silver'),
  a('ironman', '🦾', 'runs', 200, 'gold'),
  a('winning-culture', '📈', 'seasonWins', 1000, 'silver'),
  a('postseason', '🎟️', 'playoffRuns', 1, 'bronze'),
  a('ring', '💍', 'titles', 1, 'silver'),
  a('dynasty', '👑', 'titles', 5, 'silver'),
  a('empire', '🏛️', 'titles', 25, 'gold'),
  a('juggernaut', '💪', 'win60', 1, 'bronze'),
  a('seventy', '🔥', 'win70', 1, 'silver'),
  a('immortal', '☄️', 'win75', 1, 'gold'),
  a('perfect', '💎', 'perfectTitles', 1, 'gold'),
  a('cinderella', '👠', 'cinderella', 1, 'silver'),
  a('underdog', '🐕', 'underdog', 1, 'silver'),
  a('daily-habit', '🗓️', 'dailyGames', 1, 'bronze'),
  a('daily-grinder', '⏰', 'dailyGames', 50, 'silver'),
  a('quiz-whiz', '🧠', 'triviaPerfect', 1, 'silver'),
  a('rivalry', '🤝', 'duels', 1, 'bronze'),
  a('duelist', '⚔️', 'duels', 10, 'silver'),
  a('fixer', '🧯', 'crisisRuns', 1, 'bronze'),
  a('board-legend', '🏅', 'crisisLegend', 1, 'silver'),
  a('pink-slip', '📦', 'crisisFired', 1, 'bronze'),
  a('lifer', '🧳', 'careerSeasons', 5, 'silver'),
  a('career-ring', '🏆', 'careerTitles', 1, 'silver'),
  a('three-peat', '🥇', 'careerTitles', 3, 'gold'),
  a('historian', '📜', 'franchiseRuns', 1, 'bronze'),
  a('time-traveler', '⏳', 'eraRuns', 1, 'bronze'),
  a('collector', '🗂️', 'owned', 25, 'bronze'),
  a('curator', '🖼️', 'owned', 100, 'silver'),
  a('museum', '🏟️', 'owned', 250, 'gold'),
  a('epic-pull', '💜', 'hasEpic', 1, 'bronze'),
  a('mythic-pull', '🌟', 'hasMythic', 1, 'silver'),
  a('ultra-pull', '🌈', 'hasUltra', 1, 'gold'),
  a('set-piece', '🧩', 'sets', 1, 'silver'),
  a('completionist', '📚', 'sets', 10, 'gold'),
  a('maxed', '⭐', 'maxLevel', 3, 'silver'),
  a('contender', '🛡️', 'gauntlet', 3, 'bronze'),
  a('gauntlet-king', '🗡️', 'gauntlet', 10, 'gold'),
  a('loyal', '📆', 'streak', 7, 'bronze'),
  a('devoted', '💫', 'streak', 31, 'gold'),
  a('pack-rat', '🎁', 'packs', 50, 'silver'),
  a('centurion', '💯', 'streak', 100, 'gold'),
  a('squad-up', '🤝', 'friendsAdded', 1, 'bronze'),
  a('crew', '👥', 'friends', 5, 'silver'),
  a('friendly-fire', '🎯', 'friendGames', 1, 'bronze'),
  a('bragging-rights', '🗣️', 'friendWins', 10, 'silver'),
  a('nemesis', '😈', 'friendWins', 50, 'gold'),
  a('clean-sweep', '🧹', 'friendSweeps', 1, 'silver'),
  a('all-in', '🎲', 'allInTitles', 1, 'silver'),
  a('high-roller', '💰', 'allInTitles', 5, 'gold'),
  a('climber', '🧗', 'promotions', 1, 'bronze'),
  a('legend-tier', '🏆', 'leagueBest', 9, 'gold'),
  a('lucky-tap', '🍀', 'pickUpgrades', 1, 'bronze'),
  a('fresh-spin', '🔄', 'rerolls', 1, 'bronze'),
];

export function valueOf(s: Snapshot, k: ProgressKey): number {
  return k in s.stats ? s.stats[k as StatKey] : (s as Record<string, number>)[k] ?? 0;
}

export function newlyUnlocked(s: Snapshot, unlocked: Record<string, string>): Achievement[] {
  return ACHIEVEMENTS.filter((x) => !unlocked[x.id] && valueOf(s, x.stat) >= x.target);
}
