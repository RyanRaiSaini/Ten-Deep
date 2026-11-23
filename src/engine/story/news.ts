/** Headlines about your team, written as the season plays. Pure: reads the season, never touches the RNG. */
import type { SeasonState } from '../season';

export type HeadlineKind = 'streakW' | 'streakL' | 'big' | 'triple' | 'wins' | 'injury' | 'first' | 'upset';

export interface Headline {
  round: number;
  kind: HeadlineKind;
  /** Player or opponent name, when the story has one. */
  name?: string;
  n?: number;
}

const MAX_NEWS = 40;
const WIN_MILESTONES = [20, 30, 40, 50, 60, 65, 70, 75];

/** The streak (W > 0, L < 0) at the end of the user's game log. */
function streak(s: SeasonState): number {
  let n = 0;
  for (let i = s.log.length - 1; i >= 0; i--) {
    const e = s.log[i];
    if (e.kind !== 'game') continue;
    const us = e.home === 0 ? e.result.homeScore : e.result.awayScore;
    const them = e.home === 0 ? e.result.awayScore : e.result.homeScore;
    const w = us > them ? 1 : -1;
    if (n !== 0 && Math.sign(n) !== w) break;
    n += w;
  }
  return n;
}

/** Headlines for the user's game in `round` (call after records and log are updated for that round). */
export function roundNews(s: SeasonState, round: number): Headline[] {
  const out: Headline[] = [];
  let game: SeasonState['log'][number] | undefined;
  for (let i = s.log.length - 1; i >= 0 && !game; i--) if (s.log[i].kind === 'game' && s.log[i].round === round) game = s.log[i];
  if (game?.kind === 'game') {
    const opp = game.home === 0 ? game.away : game.home;
    const won = (game.home === 0 ? game.result.homeScore : game.result.awayScore) > (game.home === 0 ? game.result.awayScore : game.result.homeScore);
    const ids = new Set(Object.values(s.teams[0].slots).map((p) => p.id));
    for (const b of game.result.box) {
      if (!ids.has(b.playerId)) continue;
      if (b.pts >= 40) out.push({ round, kind: 'big', name: b.name, n: b.pts });
      else if (b.pts >= 10 && b.reb >= 10 && b.ast >= 10) out.push({ round, kind: 'triple', name: b.name });
    }
    const st = streak(s);
    if (st >= 5 && st % 5 === 0) out.push({ round, kind: 'streakW', n: st });
    if (st <= -4 && st % 4 === 0) out.push({ round, kind: 'streakL', n: -st });
    const w = s.records[0].w;
    if (won && WIN_MILESTONES.includes(w)) out.push({ round, kind: 'wins', n: w });
    // Beating the team with the league's best record (once you're 20 games in).
    if (won && round >= 20) {
      const best = s.records.reduce((b, r, i) => (i !== 0 && r.w - r.l > s.records[b].w - s.records[b].l ? i : b), opp === 1 ? 2 : 1);
      if (best === opp) out.push({ round, kind: 'upset', name: s.teams[opp].name });
    }
    // Taking over first place in the league after 20 games.
    if (round >= 20) {
      const firstNow = s.records.every((r, i) => i === 0 || s.records[0].w - s.records[0].l > r.w - r.l);
      const already = (s.news ?? []).some((h) => h.kind === 'first' && h.round >= round - 10);
      if (firstNow && !already) out.push({ round, kind: 'first' });
    }
  }
  for (const e of s.log) {
    if (e.kind === 'injury' && e.round === round && e.games >= 10) {
      const p = Object.values(s.teams[0].slots).find((x) => x.id === e.playerId);
      if (p && p.ovr >= 85) out.push({ round, kind: 'injury', name: e.name, n: e.games });
    }
  }
  return out;
}

export function addNews(prev: Headline[] | undefined, fresh: Headline[]): Headline[] {
  return fresh.length ? [...(prev ?? []), ...fresh].slice(-MAX_NEWS) : prev ?? [];
}
