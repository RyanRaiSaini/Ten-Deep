import type { TFunction } from 'i18next';
import { CONFERENCES } from '../engine/conference';
import { seedOf, type SeasonState } from '../engine/season';

/** "West #3" in a conference season, "Seed #3" in a one-table league. */
export function seedLabel(t: TFunction, season: SeasonState, team = 0): string {
  const { seed, conf } = seedOf(season, team);
  return conf === null ? t('season.standing', { n: seed }) : t('conf.seed', { conf: t(`conf.${CONFERENCES[conf]}`), n: seed });
}
