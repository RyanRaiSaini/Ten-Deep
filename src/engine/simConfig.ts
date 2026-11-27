/**
 * Tunable sim coefficients. Calibrated by scripts/calibrate.ts and pinned by calibration.test.ts.
 * Change these, rerun `npx tsx scripts/calibrate.ts`, and keep the calibration test green.
 */
export const SIM = {
  /** League-average points per possession. */
  basePpp: 1.13,
  /** Points per possession gained per rating point of (offense − opposing defense). */
  k: 0.006,
  /**
   * Star premium: effective rating += star × (rating − starFrom)² above starFrom. Off: it made a squad of two
   * stars and a cheap bench play far above its Squad Rating (an 86 went 78-4). The elite bonus below replaces it.
   */
  star: 0,
  starFrom: 80,
  homeAdv: 1.6,
  pace: 99,
  paceSd: 3,
  scoreSd: 9,
  /**
   * Box scores only (never changes results): a player's share of team points grows with offense^ptsExp.
   * 3.3 keeps scoring leaders around 30–35 PPG, like the modern league (with real contracts, stars cluster more).
   */
  ptsExp: 3.3,
  /**
   * Season-to-season swing: every team draws a rating offset ~ N(0, formSd) once per season. Kept small so
   * results follow the roster: a lucky year can't carry a 93 to 82-0.
   */
  formSd: 1,
  /**
   * A rare "historic season": this chance per team-season of an extra +hotBoost rating. Off: 82-0 should take an
   * elite squad (about 91+ Squad Rating), never luck.
   */
  hotChance: 0,
  hotBoost: 18,
  /**
   * Playoffs: how much more team quality decides a playoff game than a regular-season one, and how much better every
   * AI team plays once the playoffs start. Together: a title takes a 95+ squad (about a third of the time at 95, half
   * at 96, one in ten at 93, almost never below 92). Regular-season wins are untouched.
   */
  playoffK: 3,
  playoffBoost: 1,
  /**
   * Elite-team bonus: + elite × (Squad Rating − eliteFrom)² to both ends, for teams above eliteFrom (rotation.ts).
   * Judged on the whole team's rating, so it doesn't matter how the stars are spread. 96 is where 82-0 opens up.
   */
  elite: 0.2,
  eliteFrom: 88,
  /** Each season the strongest AI rosters get +contenderBoost: two or three real title favourites to get past. */
  contenders: 3,
  contenderBoost: 8,
  /**
   * Every AI league plays at the same strength: its average Squad Rating is levelled to this, so an 85 means
   * the same thing in every era (older eras' real teams rate a little lower, about 78-79).
   */
  leagueSr: 81.5,
};

/** Effective rating used by the sim: stars bend games more than linearly. */
export function effective(rating: number): number {
  const over = Math.max(0, rating - SIM.starFrom);
  return rating + SIM.star * over * over;
}
