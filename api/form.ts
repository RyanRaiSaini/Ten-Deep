/**
 * Live rating form for the Current Day pool, from ESPN's public NBA scoreboard and box-score feeds.
 *   GET /api/form            → { updated, games, deltas: { normalisedName: { d, gp, gmsc, recent? } } }
 *   GET /api/form?refresh=1  → recompute first (the daily cron calls this; at most once an hour)
 * Box scores are processed incrementally and kept in private Vercel Blob storage, so each run only fetches
 * games it hasn't seen. Ratings themselves are applied in the app (src/store/form.ts).
 */
import { get, put } from '@vercel/blob';
import { current2026 } from '../src/data/current2026';
import { addGame, computeForm, normName, type Production, type StatLine } from '../src/engine/form';

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const SCOREBOARD = (yyyymmdd: string) => `${ESPN}/scoreboard?dates=${yyyymmdd}&limit=50`;
const SUMMARY = (id: string) => `${ESPN}/summary?event=${id}`;
const RECENT_DAYS = 7;
const MAX_GAMES_PER_RUN = 320;
const HOUR = 3600_000;
/** Bump when the rating model changes so the next request re-rates from stored box scores. */
const MODEL = 2;
const DAY = 24 * HOUR;

interface State {
  processed: string[];
  /** Days whose games were all final when scanned (never re-scanned). */
  scanned: string[];
  season: Record<string, Production>;
  /** Recent games only: gameId → date and each player's line summary. */
  recent: Record<string, { date: string; lines: Record<string, Production> }>;
}
interface Latest { updated: string; games: number; source: string; model?: number; deltas: ReturnType<typeof computeForm> }

const json = (body: unknown, status = 200, maxAge = 600) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': `public, s-maxage=${maxAge}, stale-while-revalidate=86400`, 'access-control-allow-origin': '*' } });

async function readBlob<T>(path: string): Promise<T | null> {
  const r = await get(path, { access: 'private', useCache: false }).catch(() => null);
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text()) as T;
}
const writeBlob = (path: string, data: unknown) =>
  put(path, JSON.stringify(data), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' });

async function fetchJson(url: string) {
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${new URL(url).pathname}`);
  return r.json();
}

/** Season days so far: from October 1 of the season's first year to yesterday (UTC), as YYYYMMDD. */
function seasonDays(now = new Date()): string[] {
  const year = now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const out: string[] = [];
  for (let t = Date.UTC(year, 9, 1); t < now.getTime() - DAY / 2; t += DAY) out.push(new Date(t).toISOString().slice(0, 10).replace(/-/g, ''));
  return out;
}

type Group = { names?: string[]; labels?: string[]; athletes?: { athlete?: { displayName?: string }; stats?: string[]; didNotPlay?: boolean }[] };

/** One team's box score group → player lines (ESPN columns are found by label, so order changes don't matter). */
function linesOf(group: Group): { name: string; line: StatLine }[] {
  const cols = (group.names ?? group.labels ?? []).map((n) => n.toUpperCase());
  const at = (stats: string[], label: string) => stats[cols.indexOf(label)] ?? '0';
  const num = (v: string) => Number(v) || 0;
  const pair = (v: string) => { const [a, b] = v.split('-').map(Number); return [a || 0, b || 0]; };
  const out: { name: string; line: StatLine }[] = [];
  for (const a of group.athletes ?? []) {
    const s = a.stats ?? [];
    const name = a.athlete?.displayName;
    if (!name || a.didNotPlay || !s.length) continue;
    const min = num(at(s, 'MIN'));
    if (min <= 0) continue;
    const [fgm, fga] = pair(at(s, 'FG'));
    const [ftm, fta] = pair(at(s, 'FT'));
    out.push({
      name: normName(name),
      line: {
        min, pts: num(at(s, 'PTS')), fgm, fga, ftm, fta, oreb: num(at(s, 'OREB')), dreb: num(at(s, 'DREB')),
        ast: num(at(s, 'AST')), stl: num(at(s, 'STL')), blk: num(at(s, 'BLK')), tov: num(at(s, 'TO')), pf: num(at(s, 'PF')),
      },
    });
  }
  return out;
}

async function refresh(): Promise<Latest> {
  const state: State = (await readBlob<State>('form/state.json')) ?? { processed: [], scanned: [], season: {}, recent: {} };
  state.scanned ??= [];
  const done = new Set(state.processed);
  const scanned = new Set(state.scanned);

  // 1. Find finished games we haven't processed, day by day.
  const todo: { id: string; date: string }[] = [];
  const days = seasonDays().filter((d) => !scanned.has(d));
  for (let i = 0; i < days.length; i += 6) {
    const chunk = days.slice(i, i + 6);
    const boards = await Promise.all(chunk.map((d) => fetchJson(SCOREBOARD(d)).catch(() => null)));
    boards.forEach((b, j) => {
      if (!b) return;
      const events = (b.events ?? []) as { id: string; date?: string; status?: { type?: { completed?: boolean } } }[];
      let allFinal = true;
      for (const e of events) {
        if (!e.status?.type?.completed) { allFinal = false; continue; }
        if (!done.has(e.id)) todo.push({ id: e.id, date: String(e.date ?? '').slice(0, 10) });
      }
      if (allFinal) state.scanned.push(chunk[j]);
    });
  }

  // 2. Box scores for those games, a few at a time.
  const batch = todo.slice(0, MAX_GAMES_PER_RUN);
  for (let i = 0; i < batch.length; i += 8) {
    const chunk = batch.slice(i, i + 8);
    const sums = await Promise.all(chunk.map((g) => fetchJson(SUMMARY(g.id)).catch(() => null)));
    sums.forEach((sum, j) => {
      const g = chunk[j];
      const teams = (sum?.boxscore?.players ?? []) as { statistics?: Group[] }[];
      if (!teams.length) return;
      const lines: Record<string, Production> = {};
      for (const t of teams) {
        for (const l of linesOf(t.statistics?.[0] ?? {})) {
          state.season[l.name] = addGame(state.season[l.name], l.line);
          lines[l.name] = addGame(undefined, l.line);
        }
      }
      state.processed.push(g.id);
      state.recent[g.id] = { date: g.date, lines };
    });
  }

  // 3. Keep only the recent window, then rate.
  const cutoff = new Date(Date.now() - RECENT_DAYS * DAY).toISOString().slice(0, 10);
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
  const latest: Latest = { updated: new Date().toISOString(), games: state.processed.length, source: 'ESPN box scores', model: MODEL, deltas };
  await writeBlob('form/state.json', state);
  await writeBlob('form/latest.json', latest);
  return latest;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const latest = await readBlob<Latest>('form/latest.json');
  const age = latest ? Date.now() - Date.parse(latest.updated) : Infinity;
  const stale = latest?.model !== MODEL;
  const wantRefresh = stale || (url.searchParams.get('refresh') === '1' ? age > HOUR || !latest?.games : age > 20 * HOUR);
  if (!wantRefresh && latest) return json(latest);
  try {
    return json(await refresh(), 200, 60);
  } catch (e) {
    // Data source hiccup: serve what we have.
    return latest ? json(latest) : json({ updated: null, games: 0, deltas: {}, error: String(e).slice(0, 200) }, 200, 60);
  }
}
