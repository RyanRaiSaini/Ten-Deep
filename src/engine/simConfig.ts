/**
 * Tunable sim coefficients. Calibrated by scripts/calibrate.ts and pinned by calibration.test.ts.
 * Change these, rerun `npx tsx scripts/calibrate.ts`, and keep the calibration test green.
 */
export const SIM = {
  /** League-average points per possession. */
  basePpp: 1.13,
  /** Points per possession gained per rating point of (offense − opposing defense). */
  k: 0.014,
  /** Star premium: effective rating += star × (rating − starFrom)² above starFrom. */
  star: 0.02,
  starFrom: 80,
  homeAdv: 1.6,
  pace: 99,
  paceSd: 3,
  scoreSd: 9.5,
  /**
   * Box scores only (never changes results): a player's share of team points grows with offense^ptsExp.
   * 3.3 keeps scoring leaders around 30–34 PPG, like the modern league.
   */
  ptsExp: 3.3,
};

/** Effective rating used by the sim: stars bend games more than linearly. */
export function effective(rating: number): number {
  const over = Math.max(0, rating - SIM.starFrom);
  return rating + SIM.star * over * over;
}
