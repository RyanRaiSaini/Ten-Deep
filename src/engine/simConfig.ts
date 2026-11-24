/**
 * Tunable sim coefficients. Calibrated by scripts/calibrate.ts and pinned by calibration.test.ts.
 * Change these, rerun `npx tsx scripts/calibrate.ts`, and keep the calibration test green.
 */
export const SIM = {
  /** League-average points per possession. */
  basePpp: 1.13,
  /** Points per possession gained per rating point of (offense − opposing defense). */
  k: 0.0063,
  /** Star premium: effective rating += star × (rating − starFrom)² above starFrom. */
  star: 0.012,
  starFrom: 80,
  homeAdv: 1.6,
  pace: 99,
  paceSd: 3,
  scoreSd: 9.5,
  /**
   * Box scores only (never changes results): a player's share of team points grows with offense^ptsExp.
   * 3.1 keeps scoring leaders around 32–34 PPG, like the modern league (with real contracts, stars cluster more).
   */
  ptsExp: 3.1,
  /**
   * Season-to-season swing: every team draws a rating offset ~ N(0, formSd) once per season. Roster quality
   * sets the average; this gives the long tail (a great draft that also has a great year can run the table).
   */
  formSd: 3.45,
  /** A rare "historic season" (think 73-9): this chance per team-season of an extra +hotBoost rating. */
  hotChance: 0.012,
  hotBoost: 18,
  /** Playoffs: team quality decides more (tighter rotations, stars play more), so better teams win series more. */
  playoffK: 2,
  /** Each season the strongest AI rosters play like real contenders (+contenderBoost), so the league has heavyweights. */
  contenders: 2,
  contenderBoost: 4,
};

/** Effective rating used by the sim: stars bend games more than linearly. */
export function effective(rating: number): number {
  const over = Math.max(0, rating - SIM.starFrom);
  return rating + SIM.star * over * over;
}
