/** Live Party client: talks to api/party.ts and keeps a room in sync (polling, with a server-clock offset). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from '../config';
import { MODE_BY_ID } from '../data/modes';
import { formPool } from '../engine/form';
import type { PartyMember, PartyMeta } from '../engine/party';
import type { Pool, SlotId } from '../engine/types';
import { useFriends } from '../store/friends';
import { useProfile } from '../store/profile';
import { baseOf } from '../store/form';

const URL_ = typeof document !== 'undefined' ? '/api/party' : `${CONFIG.webUrl}/api/party`;

export type PartyError = 'offline' | 'not-found' | 'started' | 'full' | 'taken' | 'round-closed' | 'need-two' | 'unavailable' | string;
export type Result<T> = { ok: true; data: T } | { ok: false; error: PartyError };

async function call<T>(body: Record<string, unknown>): Promise<Result<T>> {
  const { pin, key } = useFriends.getState();
  const { name, avatarId } = useProfile.getState();
  try {
    const r = await fetch(URL_, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pin, key, name: name || 'Coach', avatar: avatarId, ...body }),
    });
    if (!(r.headers.get('content-type') ?? '').includes('json')) return { ok: false, error: 'unavailable' };
    const j = await r.json();
    return r.ok ? { ok: true, data: j as T } : { ok: false, error: j.error ?? 'unavailable' };
  } catch {
    return { ok: false, error: 'offline' };
  }
}

export const createRoom = () => call<{ code: string }>({ op: 'create' });
export const joinRoom = (code: string) => call<{ ok: true }>({ op: 'join', code });
export const leaveRoom = (code: string) => call<{ ok: true }>({ op: 'leave', code });
export const startRoom = (code: string) => call<{ ok: true }>({ op: 'start', code });
export const submitPick = (code: string, r: number, pid: string, slot: SlotId) => call<{ ok: true; t: number }>({ op: 'pick', code, r, pid, slot });

export interface Room { meta: PartyMeta; members: PartyMember[] }

/**
 * Poll a room. `offset` maps local time to server time (server = Date.now() + offset), so every phone runs the
 * same clock. Polling is quick while picks are being made and stops once the season has everything it needs.
 */
export function useRoom(code: string | undefined, fast: boolean, stop: boolean) {
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<PartyError | null>(null);
  const [offset, setOffset] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nudge, setNudge] = useState(0);
  const haveForm = useRef(false);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    const tick = async () => {
      const sent = Date.now();
      try {
        const r = await fetch(`${URL_}?code=${code}${haveForm.current ? '&lite=1' : ''}`);
        const ok = (r.headers.get('content-type') ?? '').includes('json');
        const j = ok ? await r.json() : null;
        if (!alive) return;
        if (!ok) setError('unavailable');
        else if (!r.ok) setError(j.error ?? 'unavailable');
        else {
          const got = Date.now();
          setOffset(j.now - (sent + got) / 2);
          // Keep the frozen form from the first load (lite polls leave it out).
          setRoom((prev) => ({ meta: { ...j.meta, form: j.meta.form ?? prev?.meta.form }, members: j.members }));
          haveForm.current = true;
          setError(null);
        }
      } catch {
        if (alive) setError('offline');
      }
      if (alive && !stop) timer.current = setTimeout(tick, fast ? 1200 : 2500);
    };
    void tick();
    return () => { alive = false; if (timer.current) clearTimeout(timer.current); };
  }, [code, fast, stop, nudge]);

  /** Poll right now (after your own pick, so you see it immediately). */
  const refresh = () => setNudge((n) => n + 1);
  return { room, error, offset, refresh };
}

/** Server time, ticking a few times a second. */
export function useServerNow(offset: number, hz = 4): number {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset), 1000 / hz);
    return () => clearInterval(id);
  }, [offset, hz]);
  return now;
}

/** The room's player pool, with the form frozen at creation (identical on every device). */
export function useRoomPool(meta: PartyMeta | undefined): Pool | null {
  return useMemo(() => {
    const mode = meta && MODE_BY_ID[meta.poolId];
    return mode ? formPool(mode.pool, meta.form ?? {}, baseOf) : null;
    // The pool depends only on the room's identity and frozen form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.code, meta?.poolId]);
}
