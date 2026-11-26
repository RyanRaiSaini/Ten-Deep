/**
 * Tunable sim coefficients. Calibrated by scripts/calibrate.ts and pinned by calibration.test.ts.
 * Change these, rerun `npx tsx scripts/calibrate.ts`, and keep the calibration test green.
 */
export const SIM = {
  /** League-average points per possession. */
  basePpp: 1.13,
  /** Points per possession gained per rating point of (offense − opposing defense). */
  k: 0.0115,
  /** Star premium: effective rating += star × (rating − starFrom)² above starFrom. */
  star: 0.012,
  starFrom: 80,
  homeAdv: 1.6,
  pace: 99,
  paceSd: 3,
  scoreSd: 9,
  /**
   * Box scores only (never changes results): a player's share of team points grows with offense^ptsExp.
   * 2.8 keeps scoring leaders around 32–35 PPG, like the modern league (with real contracts, stars cluster more).
   */
  ptsExp: 2.8,
  /**
   * Season-to-season swing: every team draws a rating offset ~ N(0, formSd) once per season. Roster quality
   * sets the average; this gives the long tail (a great draft that also has a great year can run the table).
   */
  formSd: 2.5,
  /**
   * A rare "historic season": this chance per team-season of an extra +hotBoost rating. Off: 82-0 should take an
   * elite squad (about 91+ Squad Rating), never luck.
   */
  hotChance: 0,
  hotBoost: 18,
  /** Playoffs: team quality decides more (tighter rotations, stars play more), so better teams win series more. */
  playoffK: 2,
  /** Each season the strongest AI rosters get +contenderBoost. Off: the AI teams are real rosters, so the real contenders already are. */
  contenders: 0,
  contenderBoost: 4,
  /**
   * Every AI league plays at the same strength: its average Squad Rating is levelled to this (a little above the 2026-27 league's 82, because a drafted squad plays slightly above its number),
   * so an 84 means the same thing in every era. Older eras' real teams rate a little lower (about 78-79).
   */
  leagueSr: 82.7,
};

/** Effective rating used by the sim: stars bend games more than linearly. */
export function effective(rating: number): number {
  const over = Math.max(0, rating - SIM.starFrom);
  return rating + SIM.star * over * over;
}
