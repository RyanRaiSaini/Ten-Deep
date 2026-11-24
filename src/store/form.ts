/**
 * Live rating form (see api/form.ts): fetched once a day and applied to the Current Day players in place, so
 * every pool built from them (Current Day, Steph era, All-Time, franchise and daily modes) sees today's ratings.
 * Runs already in progress keep the ratings they were drafted with (rosters are saved with the run).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CONFIG } from '../config';
import { current2026 } from '../data/current2026';
import { dailyKey } from '../engine/daily';
import { ANCHORED_MODEL, cleanDeltas, normName, type FormDelta } from '../engine/form';
import type { Player } from '../engine/types';

export interface FormStore {
  day: string | null;
  updated: string | null;
  deltas: Record<string, FormDelta>;
  /** The server's rating model for these deltas (older ones are cleaned of owner-rated players). */
  model?: number;
  set: (day: string, updated: string | null, deltas: Record<string, FormDelta>, model?: number) => void;
}

export const useForm = create<FormStore>()(
  persist(
    (set) => ({
      day: null, updated: null, deltas: {},
      set: (day, updated, deltas, model) => set({ day, updated, deltas: cleanDeltas(deltas, model), model: Math.max(model ?? 0, ANCHORED_MODEL) }),
    }),
    { name: 'tendeep-form', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** The base (unadjusted) rating of every Current Day player, kept so form can be re-applied cleanly. */
const BASE = new WeakMap<Player, Player>();
const SUBS = ['ovr', 'off', 'def', 'reb', 'ast', 'three'] as const;

/** Apply form deltas to the Current Day players in place (idempotent). */
export function applyForm(deltas: Record<string, FormDelta>) {
  for (const t of current2026.teams) {
    for (const p of t.players) {
      if (!BASE.has(p)) BASE.set(p, { ...p });
      const base = BASE.get(p)!;
      const d = deltas[normName(p.name)]?.d ?? 0;
      const m = p as unknown as Record<string, number>;
      for (const k of SUBS) m[k] = Math.max(40, Math.min(99, (base[k] as number) + d));
      (p as Player & { form?: number }).form = d || undefined;
    }
  }
}

/** A Current Day player's unadjusted ratings (form is applied in place, so pools that must agree use this). */
export const baseOf = (p: Player): Player => BASE.get(p) ?? p;

/** A player's current form nudge (for the HOT/COLD badge), 0 if none. */
export const formOf = (p: Player): number => (p as Player & { form?: number }).form ?? 0;

// Same origin on the web (no `document` on native, so no react-native import needed here).
const URL_ = typeof document !== 'undefined' ? '/api/form' : `${CONFIG.webUrl}/api/form`;

/** Apply what we have now, then refresh from the server once a day. Quiet when offline. */
export async function syncForm() {
  let s = useForm.getState();
  // Form saved before owner-rated players were anchored counted their whole season: drop it for them.
  if ((s.model ?? 0) < ANCHORED_MODEL) { s.set(s.day ?? '', s.updated, s.deltas, s.model); s = useForm.getState(); }
  applyForm(s.deltas);
  const today = dailyKey();
  if (s.day === today) return;
  try {
    const r = await fetch(URL_);
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return;
    const body = await r.json();
    if (!body || typeof body.deltas !== 'object') return;
    // Today's Daily Draft must be the same for everyone: only take new form at the start of a day.
    useForm.getState().set(today, body.updated ?? null, body.deltas, typeof body.model === 'number' ? body.model : undefined);
    applyForm(useForm.getState().deltas);
  } catch {
    // Offline: keep yesterday's form.
  }
}
