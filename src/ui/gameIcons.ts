/** Custom icons for crisis cards and achievements (no emoji in the UI). */
import type { Achievement } from '../engine/progress/achievements';
import type { IconName } from './icons';

export const CRISIS_ICON: Record<string, IconName> = {
  'cap-boost': 'chart', 'hot-streak': 'flame', 'rookie-gem': 'sparkle', 'veteran-mentor': 'medal', 'locker-room-glue': 'shield',
  'clean-bill': 'check', 'media-frenzy': 'news', 'blow-it-up': 'siren', 'trade-demand': 'swap', 'injury-bug': 'siren',
  'coach-fired': 'clipboard', 'luxury-tax': 'lock', 'locker-room-drama': 'bolt', 'superteam-rumor': 'star',
  'legend-comeback': 'crown', 'midseason-miracle': 'sparkle',
};

const BY_STAT: Record<string, IconName> = {
  runs: 'ball', seasonWins: 'chart', playoffRuns: 'medal', titles: 'trophy', win40: 'flame', win55: 'flame', win60: 'flame', win70: 'flame',
  win75: 'flame', perfectTitles: 'crown', cinderella: 'sparkle', underdog: 'bolt', dailyGames: 'calendar', triviaPerfect: 'brain',
  duels: 'vs', gauntletSeries: 'shield', packs: 'gift', crisisRuns: 'siren', crisisLegend: 'crown', crisisFired: 'news',
  careerSeasons: 'briefcase', careerTitles: 'trophy', franchiseRuns: 'history', eraRuns: 'clock', owned: 'cards', hasEpic: 'star',
  hasMythic: 'sparkle', hasUltra: 'crown', sets: 'cards', maxLevel: 'star', gauntlet: 'shield', streak: 'flame',
};

export const achievementIcon = (a: Pick<Achievement, 'stat'>): IconName => BY_STAT[a.stat] ?? 'star';
