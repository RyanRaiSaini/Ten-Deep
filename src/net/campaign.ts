/**
 * Campaign links (https://ten-deep.vercel.app/?c=<code>). A visitor who arrives through one gets a random
 * id on this device, and a few anonymous milestones are recorded against the link: visit, came back
 * another day, draft started, draft completed, season simulated, result shared. Players who never open a
 * campaign link send nothing. No names, emails or IPs are stored (see the privacy policy).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useGame } from '../store/game';
import { LINK_CODE, today, type EventKind } from '../outreach/types';

interface CampaignState {
  code: string | null;
  visitor: string | null;
  firstDay: string | null;
  sent: EventKind[];
  attach: (code: string) => void;
  markSent: (k: EventKind) => void;
}

const visitorId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 24);

export const useCampaign = create<CampaignState>()(
  persist(
    (set) => ({
      code: null, visitor: null, firstDay: null, sent: [],
      // A different campaign link starts fresh attribution (last link wins); the same link keeps it.
      attach: (code) => set((s) => (s.code === code ? s : { code, visitor: visitorId(), firstDay: today(), sent: [] })),
      markSent: (k) => set((s) => ({ sent: [...s.sent, k] })),
    }),
    { name: 'tendeep-campaign', storage: createJSONStorage(() => AsyncStorage), partialize: ({ code, visitor, firstDay, sent }) => ({ code, visitor, firstDay, sent }) },
  ),
);

/** Record a milestone once per visitor (the server also dedupes). Silent and fire-and-forget. */
export function track(k: EventKind) {
  const { code, visitor, sent, markSent } = useCampaign.getState();
  if (!code || !visitor || sent.includes(k)) return;
  markSent(k);
  void fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ c: code, v: visitor, k }), keepalive: true }).catch(() => {});
}

let started = false;

/** Call once after stores hydrate (web only): read ?c=, record the visit or a return, and watch game milestones. */
export function startCampaignTracking() {
  if (started || Platform.OS !== 'web' || typeof window === 'undefined') return;
  started = true;
  const run = () => {
    const c = new URLSearchParams(window.location.search).get('c')?.toLowerCase() ?? '';
    if (LINK_CODE.test(c)) useCampaign.getState().attach(c);
    const { code, firstDay } = useCampaign.getState();
    if (!code) return;
    track('visit');
    if (firstDay && today() > firstDay) track('return');
  };
  if (useCampaign.persist.hasHydrated()) run();
  else useCampaign.persist.onFinishHydration(run);

  useGame.subscribe((s, prev) => {
    if (s.phase === 'draft' && (prev.phase !== 'draft' || (s.draft !== prev.draft && s.draft?.round === 0 && s.draft.seed !== prev.draft?.seed))) track('draft_started');
    if (prev.phase === 'draft' && (s.phase === 'season' || s.phase === 'crisis')) track('draft_completed');
    if (prev.phase !== 'result' && s.phase === 'result') track('season_simulated');
  });
}
