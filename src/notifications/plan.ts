/** Which local notifications to schedule. Pure, so the rules are testable; index.ts hands the plan to expo-notifications. */
export type PlannedTrigger = { type: 'daily'; hour: number; minute: number } | { type: 'date'; at: Date };

export interface Planned {
  kind: 'daily' | 'streak';
  trigger: PlannedTrigger;
}

export const DAILY_HOUR = 9;
export const STREAK_HOUR = 19;

export function planNotifications(o: { now: Date; daily: boolean; streak: boolean; playedToday: boolean }): Planned[] {
  const out: Planned[] = [];
  if (o.daily) out.push({ kind: 'daily', trigger: { type: 'daily', hour: DAILY_HOUR, minute: 0 } });
  if (o.streak) {
    const tonight = new Date(o.now.getFullYear(), o.now.getMonth(), o.now.getDate(), STREAK_HOUR, 0);
    const at = !o.playedToday && o.now < tonight
      ? tonight
      : new Date(o.now.getFullYear(), o.now.getMonth(), o.now.getDate() + 1, STREAK_HOUR, 0);
    out.push({ kind: 'streak', trigger: { type: 'date', at } });
  }
  return out;
}
