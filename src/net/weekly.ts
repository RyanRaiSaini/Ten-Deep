/** Weekly Challenge leaderboard (api/weekly.ts). Quiet on failure: the run is kept and sent again later. */
import { CONFIG } from '../config';
import type { Depth } from '../engine/weekly';

const URL_ = typeof document !== 'undefined' ? '/api/weekly' : `${CONFIG.webUrl}/api/weekly`;

export interface BoardRow { name: string; w: number; l: number; depth: Depth; sr: number }
export interface Board { week: string; total: number; top: BoardRow[]; me?: BoardRow & { rank: number } }

export async function fetchBoard(week: string, pin?: string): Promise<Board | null> {
  try {
    const r = await fetch(`${URL_}?week=${week}${pin ? `&pin=${encodeURIComponent(pin)}` : ''}`);
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
    return (await r.json()) as Board;
  } catch {
    return null;
  }
}

export async function submitWeekly(entry: { week: string; pin: string; key: string; name: string; w: number; l: number; depth: Depth; sr: number }): Promise<{ rank: number; total: number } | null> {
  try {
    const r = await fetch(URL_, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(entry) });
    if (!r.ok) return null;
    const b = await r.json();
    return b?.ok ? { rank: b.rank, total: b.total } : null;
  } catch {
    return null;
  }
}
