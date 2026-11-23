/**
 * Live rating form for the Current Day pool, from NBA.com's public game data.
 *   GET /api/form            → { updated, games, deltas: { normalisedName: { d, gp, gmsc, recent? } } }
 *   GET /api/form?refresh=1  → recompute first (the daily cron calls this; at most once an hour)
 * Box scores are processed incrementally and kept in private Vercel Blob storage, so each run only fetches
 * games it hasn't seen. Ratings themselves are applied in the app (src/store/form.ts).
 */
import { get, put } from '@vercel/blob';
import { current2026 } from '../src/data/current2026';
import { addGame, computeForm, normName, type Production, type StatLine } from '../src/engine/form';

const SCHEDULE = 'https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json';
const BOX = (id: string) => `https://cdn.nba.com/static/json/liveData/boxscore/boxscore_${id}.json`;
const RECENT_DAYS = 7;
const MAX_GAMES_PER_RUN = 300;
const HOUR = 3600_000;

interface State {
  processed: string[];
  season: Record<string, Production>;
  /** Recent games only: gameId → date and each player's line summary. */
  recent: Record<string, { date: string; lines: Record<string, Production> }>;
}
interface Latest { updated: string; games: number; deltas: ReturnType<typeof computeForm> }

const json = (body: unknown, status = 200, maxAge = 600) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': `public, s-maxage=${maxAge}, stale-while-revalidate=86400`, 'access-control-allow-origin': '*' } });

async function readBlob<T>(path: string): Promise<T | null> {
  const r = await get(path, { access: 'private', useCache: false }).catch(() => null);
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text()) as T;
}
const writeBlob = (path: string, data: unknown) =>
  put(path, JSON.stringify(data), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' });

/** "PT32M15.00S" → 32.25 */
const minutes = (iso: unknown) => {
  const m = /PT(\d+)M([\d.]+)S/.exec(String(iso ?? ''));
  return m ? Number(m[1]) + Number(m[2]) / 60 : 0;
};

type BoxPlayer = { name?: string; firstName?: string; familyName?: string; played?: string; statistics?: Record<string, unknown> };

function lineOf(p: BoxPlayer): { name: string; line: StatLine } | null {
  const s = p.statistics ?? {};
  const n = (k: string) => Number(s[k] ?? 0) || 0;
  const min = minutes(s.minutes);
  if (p.played === '0' || min <= 0) return null;
  const name = p.name ?? `${p.firstName ?? ''} ${p.familyName ?? ''}`;
  return {
    name: normName(name),
    line: {
      min, pts: n('points'), fgm: n('fieldGoalsMade'), fga: n('fieldGoalsAttempted'), ftm: n('freeThrowsMade'), fta: n('freeThrowsAttempted'),
      oreb: n('reboundsOffensive'), dreb: n('reboundsDefensive'), ast: n('assists'), stl: n('steals'), blk: n('blocks'), tov: n('turnovers'), pf: n('foulsPersonal'),
    },
  };
}

async function refresh(): Promise<Latest> {
  const state: State = (await readBlob<State>('form/state.json')) ?? { processed: [], season: {}, recent: {} };
  const done = new Set(state.processed);
  const sched = await (await fetch(SCHEDULE)).json();
  const finals: { id: string; date: string }[] = [];
  for (const day of sched?.leagueSchedule?.gameDates ?? []) {
    for (const g of day.games ?? []) {
      // Regular season (002…) and playoffs (004…), finished games only.
      if (g.gameStatus === 3 && /^00[24]/.test(String(g.gameId)) && !done.has(g.gameId)) {
        finals.push({ id: g.gameId, date: String(g.gameDateTimeUTC ?? g.gameDateUTC ?? '').slice(0, 10) });
      }
    }
  }
  const batch = finals.slice(0, MAX_GAMES_PER_RUN);
  for (let i = 0; i < batch.length; i += 8) {
    const chunk = batch.slice(i, i + 8);
    const boxes = await Promise.all(chunk.map((g) => fetch(BOX(g.id)).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    boxes.forEach((box, j) => {
      const g = chunk[j];
      if (!box?.game) return;
      const lines: Record<string, Production> = {};
      for (const side of [box.game.homeTeam, box.game.awayTeam]) {
        for (const p of (side?.players ?? []) as BoxPlayer[]) {
          const l = lineOf(p);
          if (!l) continue;
          state.season[l.name] = addGame(state.season[l.name], l.line);
          lines[l.name] = addGame(undefined, l.line);
        }
      }
      state.processed.push(g.id);
      state.recent[g.id] = { date: g.date, lines };
    });
  }
  // Keep only the recent window.
  const cutoff = new Date(Date.now() - RECENT_DAYS * 24 * HOUR).toISOString().slice(0, 10);
  for (const [id, g] of Object.entries(state.recent)) if (g.date < cutoff) delete state.recent[id];
  const recent = new Map<string, Production>();
  for (const g of Object.values(state.recent)) {
    for (const [name, p] of Object.entries(g.lines)) {
      const t = recent.get(name);
      const gp = (t?.gp ?? 0) + 1;
      recent.set(name, { gp, min: (t?.min ?? 0) + p.min, gmsc: ((t?.gmsc ?? 0) * (gp - 1) + p.gmsc) / gp });
    }
  }
  const players = current2026.teams.flatMap((t) => t.players.map((p) => ({ name: p.name, ovr: p.ovr, age: p.age })));
  const deltas = computeForm(players, new Map(Object.entries(state.season)), recent);
  const latest: Latest = { updated: new Date().toISOString(), games: state.processed.length, deltas };
  await writeBlob('form/state.json', state);
  await writeBlob('form/latest.json', latest);
  return latest;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const latest = await readBlob<Latest>('form/latest.json');
  const age = latest ? Date.now() - Date.parse(latest.updated) : Infinity;
  const wantRefresh = url.searchParams.get('refresh') === '1' ? age > HOUR : age > 20 * HOUR;
  if (!wantRefresh && latest) return json(latest);
  try {
    return json(await refresh(), 200, 60);
  } catch (e) {
    // Data source hiccup: serve what we have.
    return latest ? json(latest) : json({ updated: null, games: 0, deltas: {}, error: String(e).slice(0, 200) }, 200, 60);
  }
}
