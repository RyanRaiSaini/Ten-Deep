/**
 * Friend challenges on this device: every challenge you sent or got (the server copy, api/duel.ts), which results
 * have already gone into your head-to-head record, and a draft duel while you're drafting for one.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { POOLS } from '../data';
import { affordableSlots, fallbackPick, isComplete, pick, pickFallback, respin, spin, startDraft, type DraftState } from '../engine/draft';
import { DUEL_DRAFT_POOL, statusOf, type Challenge } from '../engine/friends/challenge';
import type { SlotId } from '../engine/types';

/** What the draft is for: a challenge you're about to send to `to`, or one you're answering (`id`). */
export interface DuelDraft { seed: string; to?: string; id?: string; state: DraftState }

export interface ChallengesStore {
  byId: Record<string, Challenge>;
  /** Settled challenges already counted in the friend's W/L record. */
  counted: string[];
  /** Mailbox items already handled ("from:at"). */
  seenMail: string[];
  /** Results whose face-off you've opened (the Duels tab badges the rest). */
  viewed: string[];
  lastSync: number;
  draft: DuelDraft | null;
  put: (cs: Challenge[]) => void;
  view: (id: string) => void;
  beginDraft: (d: { seed: string; to?: string; id?: string }) => void;
  draftSpin: () => void;
  draftRespin: () => void;
  draftPick: (playerId: string, slot: SlotId) => void;
  draftFallback: () => void;
  clearDraft: () => void;
}

const pool = () => POOLS[DUEL_DRAFT_POOL];
const KEEP = 60;

export const useChallenges = create<ChallengesStore>()(
  persist(
    (set) => ({
      byId: {},
      counted: [],
      seenMail: [],
      viewed: [],
      lastSync: 0,
      draft: null,
      put: (cs) => set((s) => {
        if (!cs.length) return {};
        const byId = { ...s.byId };
        // Newest wins; a settled copy never goes back to open.
        for (const c of cs) { const old = byId[c.id]; if (!old || old.status === 'open' || c.status !== 'open') byId[c.id] = c; }
        const kept = Object.values(byId).sort((a, b) => b.created - a.created).slice(0, KEEP);
        return { byId: Object.fromEntries(kept.map((c) => [c.id, c])) };
      }),
      view: (id) => set((s) => (s.viewed.includes(id) ? {} : { viewed: [...s.viewed, id].slice(-200) })),
      beginDraft: ({ seed, to, id }) => set({ draft: { seed, to, id, state: startDraft(pool(), seed) } }),
      draftSpin: () => set((s) => (s.draft && !s.draft.state.spin && !isComplete(s.draft.state) ? { draft: { ...s.draft, state: spin(s.draft.state, pool()) } } : {})),
      draftRespin: () => set((s) => (s.draft && s.draft.state.respinsLeft > 0 && s.draft.state.spin ? { draft: { ...s.draft, state: respin(s.draft.state, pool()) } } : {})),
      draftPick: (playerId, slot) => set((s) => (s.draft ? { draft: { ...s.draft, state: pick(s.draft.state, playerId, slot, pool()) } } : {})),
      draftFallback: () => set((s) => {
        if (!s.draft) return {};
        const st = s.draft.state;
        const p = fallbackPick(st, pool());
        return { draft: { ...s.draft, state: pickFallback(st, p, affordableSlots(st, p, pool())[0], pool()) } };
      }),
      clearDraft: () => set({ draft: null }),
    }),
    { name: 'tendeep-challenges', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Your challenges, newest first, with lapsed ones marked. */
export function allChallenges(byId: Record<string, Challenge>, now = Date.now()): Challenge[] {
  return Object.values(byId).map((c) => ({ ...c, status: statusOf(c, now) })).sort((a, b) => b.created - a.created);
}

/** Challenges waiting on you (open, sent to you). */
export const incomingOpen = (cs: Challenge[], me: string) => cs.filter((c) => c.to === me && c.status === 'open');
/** Settled results you haven't looked at yet. */
export const unseenResults = (cs: Challenge[], viewed: string[]) => cs.filter((c) => c.status === 'done' && !viewed.includes(c.id));
