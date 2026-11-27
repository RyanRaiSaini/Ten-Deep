/**
 * Multi-season career: one franchise across seasons. Each season is a Management Crisis season (run by the
 * game store); between seasons this store runs the offseason (engine/career/offseason.ts) and carries the
 * league, contracts and free-agent pool forward.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { current2026 } from '../data/current2026';
import { initialContracts, type Contracts } from '../engine/career/contracts';
import {
  affordableFor, aiFreeAgency, ensureDepth, finalizeOffseason, minimumException, resolveExpiring, rookieDraft, seasonLabel,
  signFreeAgent, startOffseason, type OffseasonState,
} from '../engine/career/offseason';
import { START_SECURITY, securityAfter } from '../engine/career/security';
import { addSeason, type CareerStats, type PlayoffResult } from '../engine/career/legacy';
import { MORALE_START, moraleAfter, moraleMod } from '../engine/career/morale';
import { executeTrade } from '../engine/career/trades';
import type { Verdict } from '../engine/crisis/board';
import type { CardId } from '../engine/crisis/deck';
import { champion, seriesFor } from '../engine/playoffs';
import { userStints } from '../engine/season';
import { ALL_SLOTS, type Player, type Roster, type RosterSlots, type SlotId } from '../engine/types';
import { useGame } from './game';
import { DIVISIONS, franchiseOf } from '../engine/conference';
import { realLeague, realRotation } from '../engine/realLeague';
import { available, draftDone, draftPool, draftedLeague, makePick, newFantasy, picksUntilUser, simDraft, type FantasyDraft } from '../engine/career/fantasy';

/** Today's look for a franchise: "Sacramento Kings" and its colors. */
const teamLook = (f: string) => {
  const t = current2026.teams.find((x) => franchiseOf(x) === f);
  return { name: t ? `${t.city} ${t.name}` : f.toUpperCase(), colors: (t?.colors ?? ['#333333', '#999999']) as [string, string] };
};
/** The division a franchise plays in today. */
const divOfFranchise = (f: string) => Math.max(0, DIVISIONS.findIndex((d) => d.franchises.includes(f)));

/** Dynasty with real rosters: your franchise's 2026-27 roster against everyone else's. */
function realRosterLeague(franchise: string, seed: string): Roster[] {
  const team = current2026.teams.find((t) => franchiseOf(t) === franchise)!;
  const slots = realRotation(team.players, 'user') as Required<RosterSlots>;
  const user: Roster = { id: 'user', name: `${team.city} ${team.name}`, colors: team.colors, franchise, slots };
  const others = current2026.teams.map(franchiseOf).filter((f) => f !== franchise);
  return [user, ...realLeague(others, ALL_SLOTS.map((k) => slots[k]), seed, current2026.teams, current2026.teams, current2026.teams)];
}

export type { PlayoffResult };

export interface SeasonRecord {
  label: string;
  wins: number;
  losses: number;
  seed: number;
  result: PlayoffResult;
  verdict: Verdict;
  cards: CardId[];
  /** Your roster at season's end (for the history page). */
  roster: Player[];
}

export type OffseasonStep = 'expiring' | 'draft' | 'freeAgency';

export interface CareerStore {
  active: boolean;
  /** 'dynasty': you picked a franchise (real roster or a fantasy draft) and seasons have no board cards. */
  mode: 'career' | 'dynasty';
  /** Dynasty: your franchise, and the fantasy draft while it's on. */
  franchise: string | null;
  fantasy: FantasyDraft | null;
  ended: boolean;
  seed: string;
  /** Current season number (1-based). */
  season: number;
  security: number;
  history: SeasonRecord[];
  contracts: Contracts;
  freeAgents: Player[];
  /** The league at the end of the last season (index 0 = you). */
  teams: Roster[] | null;
  lastWins: number[];
  lastPlayoff: number[];
  offseason: OffseasonState | null;
  step: OffseasonStep | null;
  /** Locker-room morale 0–100; nudges team ratings each season. */
  morale: number;
  /** Franchise records: every player's totals while with you. */
  stats: CareerStats;

  start: () => void;
  /** Dynasty: take a franchise with its real roster (the season starts), or set up a fantasy draft. */
  startDynasty: (franchise: string, how: 'real' | 'draft') => void;
  /** Dynasty fantasy draft: spin your slot (1–30), then the AI picks until your turn. Returns the slot. */
  spinSlot: () => number;
  /** Your pick, then the AI picks until your next turn. */
  fantasyPick: (playerId: string) => void;
  /** Let the AI pick for you for the rest of the draft. */
  fantasyAuto: () => void;
  /** Draft over: the drafted league plays season 1. */
  finishFantasy: () => void;
  recordSeason: () => void;
  applyVerdict: (v: Verdict) => void;
  beginOffseason: () => void;
  keep: (ids: string[]) => void;
  draftRookie: (rookieId?: string, cut?: SlotId) => void;
  /** `salary`: a set amount (the minimum exception's minimum deal); otherwise his market rate. */
  sign: (player: Player, slot: SlotId, salary?: number) => void;
  /** One of yours for one of theirs; returns whether their GM said yes. */
  trade: (give: string, team: number, want: string) => boolean;
  autoSign: () => void;
  startNextSeason: () => void;
  quit: () => void;
}

const fresh = { mode: 'career' as const, franchise: null, fantasy: null, active: false, ended: false, seed: '', season: 1, security: START_SECURITY, history: [], contracts: {}, freeAgents: [], teams: null, lastWins: [], lastPlayoff: [], offseason: null, step: null, morale: MORALE_START, stats: {} };
const stripMod = (t: Roster): Roster => ({ id: t.id, name: t.name, colors: t.colors, slots: t.slots, ...(t.franchise ? { franchise: t.franchise } : {}) });

export const useCareer = create<CareerStore>()(
  persist(
    (set, get) => ({
      ...fresh,

      start: () => {
        set({ ...fresh, active: true, seed: `career-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}` });
        useGame.getState().newCrisis('current-2026', true);
      },

      startDynasty: (franchise, how) => {
        const seed = `dynasty-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
        set({ ...fresh, mode: 'dynasty', franchise, active: true, seed });
        // A new Dynasty replaces any career run still going (a quick run in progress is left alone).
        if (useGame.getState().career) useGame.getState().quit();
        useGame.setState({ parked: null });
        if (how === 'real') {
          const teams = realRosterLeague(franchise, seed);
          useGame.getState().startCareerSeason(teams, `${seed}:s1`, 0, { cards: false, division: divOfFranchise(franchise) });
        }
      },
      spinSlot: () => {
        const c = get();
        if (c.mode !== 'dynasty' || !c.franchise || c.fantasy) return c.fantasy?.userSlot ?? -1;
        const slot = Math.floor(Math.random() * 30);
        const fd = newFantasy(c.franchise, slot, current2026.teams.map(franchiseOf), c.seed);
        set({ fantasy: simDraft(fd, draftPool(current2026.teams)) });
        return slot;
      },
      fantasyPick: (playerId) => {
        const fd = get().fantasy;
        if (!fd || draftDone(fd) || picksUntilUser(fd) !== 0) return;
        const pool = draftPool(current2026.teams);
        if (!available(fd, pool).some((p) => p.id === playerId)) return;
        set({ fantasy: simDraft(makePick(fd, playerId), pool) });
      },
      fantasyAuto: () => {
        const fd = get().fantasy;
        if (fd) set({ fantasy: simDraft(fd, draftPool(current2026.teams), true) });
      },
      finishFantasy: () => {
        const c = get();
        if (!c.fantasy || !draftDone(c.fantasy) || !c.franchise) return;
        const teams = draftedLeague(c.fantasy, draftPool(current2026.teams), teamLook);
        set({ fantasy: null });
        useGame.getState().startCareerSeason(teams, `${c.seed}:s1`, 0, { cards: false, division: divOfFranchise(c.franchise) });
      },

      recordSeason: () => {
        const c = get();
        const g = useGame.getState();
        const ps = g.playoffs;
        if (!c.active || !ps || c.history.length >= c.season) return; // once per season
        const season = ps.season;
        const mine = seriesFor(ps, 0);
        const result: PlayoffResult = champion(ps) === 0 ? 'champion'
          : !mine ? 'missed' : (['first', 'quarters', 'semis', 'finals'] as const)[mine.round];
        const teams = season.teams.map(stripMod);
        const rostered = new Set(teams.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k].name)));
        const pool = [...new Map(current2026.teams.flatMap((t) => t.players).map((p) => [p.name, p])).values()];
        const verdict = g.crisis?.verdict ?? 'survived';
        set({
          history: [...c.history, {
            label: seasonLabel(c.season), wins: season.records[0].w, losses: season.records[0].l,
            seed: mine ? (mine.series.hi === 0 ? mine.series.seedHi : mine.series.seedLo) : 0,
            result, verdict, cards: g.crisis?.drawn ?? [], roster: ALL_SLOTS.map((k) => teams[0].slots[k]),
          }],
          teams,
          contracts: c.season === 1 ? initialContracts(teams.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k])), c.seed) : c.contracts,
          freeAgents: (c.season === 1 ? pool : c.freeAgents).filter((p) => !rostered.has(p.name)),
          // Only the games each player played for you (mid-season swaps split a season between teams).
          stats: (() => {
            const lines = userStints(season);
            const finalRoster = new Set(ALL_SLOTS.map((k) => season.teams[0].slots[k].id));
            return addSeason(c.stats ?? {}, lines.map((l) => l.player), Object.fromEntries(lines.map((l) => [l.player.id, l.totals])), result === 'champion', seasonLabel(c.season), finalRoster);
          })(),
          morale: moraleAfter(c.morale ?? MORALE_START, { wins: season.records[0].w, result, trades: 0 }),
          lastWins: season.records.map((r) => r.w),
          lastPlayoff: ps.rounds[0].flatMap((s) => [s.hi, s.lo]),
        });
        get().applyVerdict(verdict);
      },

      applyVerdict: (v) => {
        const r = securityAfter(get().security, v);
        set({ security: r.security, ended: r.ended });
      },

      beginOffseason: () => {
        const c = get();
        if (!c.teams || c.ended) return;
        const offseason = startOffseason({
          teams: c.teams, contracts: c.contracts, freeAgents: c.freeAgents, season: c.season + 1, seed: c.seed,
          wins: c.lastWins, playoff: new Set(c.lastPlayoff),
        });
        set({ offseason, step: 'expiring' });
      },

      keep: (ids) => set((c) => (c.offseason ? { offseason: resolveExpiring(c.offseason, ids), step: 'draft' } : {})),

      draftRookie: (rookieId, cut) =>
        set((c) => (c.offseason ? { offseason: ensureDepth(rookieDraft(c.offseason, rookieId, cut)), step: 'freeAgency' } : {})),

      sign: (player, slot, salary) => set((c) => (c.offseason ? { offseason: signFreeAgent(c.offseason, 0, player, slot, salary) } : {})),

      trade: (give, team, want) => {
        const st = get().offseason;
        if (!st) return false;
        const after = executeTrade(st, give, team, want);
        if (after === st) return false;
        // Shipping out a teammate stings the locker room a little.
        set((c) => ({ offseason: after, morale: Math.max(0, (c.morale ?? MORALE_START) - 4) }));
        return true;
      },

      autoSign: () => {
        const st = get().offseason;
        if (!st) return;
        const best = affordableFor(st, 0).sort((a, b) => b.player.ovr - a.player.ovr)[0];
        const move = best ? { player: best.player, slot: best.slots[0], salary: undefined } : minimumException(st, 0);
        if (move) get().sign(move.player, move.slot, move.salary);
      },

      startNextSeason: () => {
        const c = get();
        if (!c.offseason) return;
        const st = aiFreeAgency(c.offseason);
        const teams = finalizeOffseason(st);
        const season = c.season + 1;
        set({ season, teams, contracts: st.contracts, freeAgents: st.freeAgents, offseason: null, step: null });
        useGame.getState().startCareerSeason(teams, `${c.seed}:s${season}`, moraleMod(c.morale ?? MORALE_START),
          c.mode === 'dynasty' ? { cards: false, ...(c.franchise ? { division: divOfFranchise(c.franchise) } : {}) } : {});
      },

      quit: () => {
        set({ ...fresh });
        // End only the career's own run; a quick run in progress is left alone.
        if (useGame.getState().career) useGame.getState().quit();
        useGame.setState({ parked: null });
      },
    }),
    { name: 'tendeep-career', version: 1, storage: createJSONStorage(() => AsyncStorage), merge: (saved, cur) => ({ ...cur, ...(saved as object), mode: (saved as { mode?: 'career' | 'dynasty' })?.mode ?? 'career' }) },
  ),
);
