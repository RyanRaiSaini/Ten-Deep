import type { Verdict } from '../crisis/board';

export const START_SECURITY = 60;
const DELTA: Record<Verdict, number> = { legend: 30, extended: 15, survived: -15, fired: -40 };

/** Job security after a season's verdict. The career ends only when security reaches 0. */
export function securityAfter(security: number, v: Verdict): { security: number; ended: boolean } {
  const next = Math.max(0, Math.min(100, security + DELTA[v]));
  return { security: next, ended: next <= 0 };
}
