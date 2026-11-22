import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MODE_BY_ID, POOLS, leaguePoolFor } from '../data';
import { draftLeague } from '../engine/aiDraft';
import {
  affordableSlots, fallbackPick, isComplete, pick, pickFallback, respin, spin, startDraft, type DraftState,
} from '../engine/draft';
import { champion, playNextGame, simPlayoffsToEnd, startPlayoffs, type PlayoffState } from '../engine/playoffs';
import { createRng, shuffle } from '../engine/rng';
import { advance, createSeason, tradeSwap, type SeasonState } from '../engine/season';
import { ALL_SLOTS, type Player, type RosterSlots, type SlotId, type TeamSeason } from '../engine/types';
import { useProfile } from './profile';

export type Phase = 'idle' | 'draft' | 'season' | 'deadline' | 'playoffs' | 'result';

export interface GameStore {
  phase: Phase;
  poolId: string;
  draft: DraftState | null;
  season: SeasonState | null;
  playoffs: PlayoffState | null;
  /** Trade deadline: the replacement spin and the player being moved. */
  deadline: { outId: string | null; spin: TeamSeason | null; spun: boolean } | null;

  newRun: (poolId: string) => void;
  doSpin: () => void;
  doRespin: () => void;
  doPick: (playerId: string, slot: SlotId) => void;
  doFallback: () => void;
  startSeason: () => void;
  setSeason: (s: SeasonState) => void;
  openDeadline: (season: SeasonState) => void;
  chooseDeadlineOut: (playerId: string) => void;
  spinDeadline: () => void;
  signDeadline: (player: Player) => void;
  skipDeadline: () => void;
  beginPlayoffs: () => void;
  playoffGame: () => void;
  simPlayoffs: () => void;
  finish: () => void;
  quit: () => void;
}

const pool = (id: string) => POOLS[id];
const newSeed = () => `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      phase: 'idle',
      poolId: 'current-2026',
      draft: null,
      season: null,
      playoffs: null,
      deadline: null,

      newRun: (poolId) => set({ phase: 'draft', poolId, draft: startDraft(pool(poolId), newSeed()), season: null, playoffs: null, deadline: null }),
      doSpin: () => set((s) => ({ draft: spin(s.draft!, pool(s.poolId)) })),
      doRespin: () => set((s) => ({ draft: respin(s.draft!, pool(s.poolId)) })),
      doPick: (playerId, slot) => set((s) => ({ draft: pick(s.draft!, playerId, slot, pool(s.poolId)) })),
      doFallback: () =>
        set((s) => {
          const p = fallbackPick(s.draft!, pool(s.poolId));
          return { draft: pickFallback(s.draft!, p, affordableSlots(s.draft!, p, pool(s.poolId))[0], pool(s.poolId)) };
        }),

      startSeason: () => {
        const { draft, poolId } = get();
        if (!draft || !isComplete(draft)) return;
        const mode = MODE_BY_ID[poolId];
        const lp = pool(mode ? leaguePoolFor(mode) : poolId);
        const user = { id: 'user', name: 'You', colors: ['#E8833A', '#3DF2C2'] as [string, string], slots: draft.roster as Required<RosterSlots> };
        const rng = createRng(`${draft.seed}:league`);
        // Exclude by name: the league pool may hold a different season of the same player.
        const mine = new Set(Object.values(draft.roster).map((x) => x!.name));
        const exclude = new Set(lp.teams.flatMap((t) => t.players).filter((x) => mine.has(x.name)).map((x) => x.id));
        const league = draftLeague(lp, exclude, 29, rng);
        // One name per franchise (e.g. "Chicago Bulls"), never the user's.
        const seen = new Set<string>();
        const names = shuffle(lp.teams.filter((t) => t.id !== 'rookies-2026'), rng).filter((t) => {
          const n = `${t.city} ${t.name}`;
          if (seen.has(n)) return false;
          seen.add(n);
          return true;
        });
        league.forEach((r, i) => {
          const t = names[i % names.length];
          r.name = `${t.city} ${t.name}`;
          r.colors = t.colors;
        });
        set({ phase: 'season', season: createSeason(user, league, draft.seed) });
      },

      setSeason: (season) => set({ season }),

      openDeadline: (season) => set({ season, phase: 'deadline', deadline: { outId: null, spin: null, spun: false } }),
      chooseDeadlineOut: (outId) => set((s) => ({ deadline: { ...(s.deadline ?? { spin: null, spun: false }), outId } })),
      spinDeadline: () =>
        set((s) => {
          const season = s.season!;
          const taken = new Set(season.teams.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k].name)));
          const teams = pool(s.poolId).teams.filter((t) => t.players.some((p) => !taken.has(p.name)));
          const landed = createRng(`${season.seed}:deadline`).pick(teams);
          return { deadline: { ...s.deadline!, spin: landed, spun: true } };
        }),
      // Guards make repeated taps no-ops once the deal is done.
      signDeadline: (player) =>
        set((s) =>
          s.deadline?.outId && s.season
            ? { season: tradeSwap(s.season, s.deadline.outId, player), deadline: null, phase: 'season' }
            : {},
        ),
      skipDeadline: () =>
        set((s) => (s.season ? { deadline: null, phase: 'season', season: { ...s.season, deadlineUsed: true } } : {})),

      beginPlayoffs: () => set((s) => ({ phase: 'playoffs', playoffs: startPlayoffs(advance(s.season!, 82)) })),
      playoffGame: () => set((s) => ({ playoffs: playNextGame(s.playoffs!) })),
      simPlayoffs: () => set((s) => ({ playoffs: simPlayoffsToEnd(s.playoffs!) })),
      finish: () => {
        const { playoffs, phase } = get();
        if (!playoffs || phase === 'result') return;
        const rec = playoffs.season.records[0];
        useProfile.getState().recordDraft({ wins: rec.w, losses: rec.l, champion: champion(playoffs) === 0 });
        set({ phase: 'result' });
      },
      quit: () => set({ phase: 'idle', draft: null, season: null, playoffs: null, deadline: null }),
    }),
    {
      name: 'tendeep-run',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ phase: s.phase, poolId: s.poolId, draft: s.draft, season: s.season, playoffs: s.playoffs, deadline: s.deadline }),
    },
  ),
);

export const isChampion = (ps: PlayoffState | null) => !!ps && champion(ps) === 0;
