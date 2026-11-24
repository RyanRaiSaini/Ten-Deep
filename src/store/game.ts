import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MODE_BY_ID, POOLS, leaguePoolFor } from '../data';
import { draftLeague, fairLeague } from '../engine/aiDraft';
import {
  affordableSlots, fallbackPick, isComplete, pick, pickFallback, reroll, respin, spin, startDraft, type DraftState,
  legacyDraft,
} from '../engine/draft';
import { champion, playNextGame, seriesFor, simPlayoffsToEnd, startPlayoffs, type PlayoffState } from '../engine/playoffs';
import { createRng, shuffle } from '../engine/rng';
import { SEASON_GAMES, advance, createSeason, tradeSwap, type SeasonState } from '../engine/season';
import { ALL_SLOTS, type Player, type Roster, type RosterSlots, type SlotId, type TeamSeason } from '../engine/types';
import { withSignedSalaries } from '../engine/career/simulate';
import { applyCard, type Decision } from '../engine/crisis/apply';
import { boardObjective, verdict, type Objective, type Verdict } from '../engine/crisis/board';
import { CARD_ROUNDS, drawCard, type CardId } from '../engine/crisis/deck';
import { prepareCard, type CrisisCard } from '../engine/crisis/offers';
import { dailySeed } from '../engine/daily';
import { useDaily } from './daily';
import { useCollection } from './collection';
import { pointsFor, stakeGain } from '../engine/league/ladder';
import { useLeague } from './league';
import { track } from './progress';
import { useProfile } from './profile';
import { useFriends } from './friends';
import { useShop } from './shop';
import { raceOutcome } from '../engine/friends/match';

/** First Daily Draft played on fair spins (dailies before it keep the original sequence). */
export const FAIR_DAILY_FROM = '2026-11-25';

export type Phase = 'idle' | 'draft' | 'season' | 'deadline' | 'crisis' | 'playoffs' | 'result';

/** Management Crisis run state. */
export interface CrisisRun {
  objective: Objective | null;
  drawn: CardId[];
  /** Card slots resolved so far (0–4). */
  resolved: number;
  pending: CrisisCard | null;
  verdict: Verdict | null;
}

export interface GameStore {
  phase: Phase;
  poolId: string;
  /** Set when this run is today's Daily Draft (YYYY-MM-DD). */
  daily: string | null;
  /** Set when this run is a Management Crisis run. */
  crisis: CrisisRun | null;
  /** This run is a season of a multi-season career (see store/career.ts). */
  career: boolean;
  draft: DraftState | null;
  season: SeasonState | null;
  playoffs: PlayoffState | null;
  /** Trade deadline: the replacement spin and the player being moved. */
  deadline: { outId: string | null; spin: TeamSeason | null; spun: boolean } | null;

  /** A fresh draft; pass a seed for a race (friends replay the same spins). */
  newRun: (poolId: string, seed?: string) => void;
  /** A career season set aside because another run started; "Continue career" brings it back. */
  parked: Pick<GameStore, 'phase' | 'poolId' | 'draft' | 'season' | 'playoffs' | 'deadline' | 'crisis' | 'stake'> | null;
  resumeCareer: () => boolean;
  /** A friend's challenge: same pool and seed (same spins), their record to beat. */
  challenge: { name: string; w: number; l: number; pin?: string; depth?: number; fair?: boolean; formDay?: string } | null;
  /** Double or nothing on the playoffs (chosen when they start). */
  stake: 'snap' | 'safe' | null;
  /** League points this run earned (after the stake), for the result screen. */
  leagueGain: number;
  setStake: (s: 'snap' | 'safe') => void;
  newChallenge: (poolId: string, seed: string, from: NonNullable<GameStore['challenge']>) => void;
  /** Today's Daily Draft: Current Day pool, seed fixed by date, so everyone gets the same spins and league. */
  newDaily: (key: string) => 'started' | 'resumed' | 'locked';
  /** Management Crisis: a normal draft in any mode, then a season interrupted by crisis cards. */
  newCrisis: (poolId: string, career?: boolean) => void;
  /** Career seasons 2+: start a Crisis season from the evolved league (no draft). */
  /** `mod`: season-long team rating nudge (career morale). */
  startCareerSeason: (teams: Roster[], seed: string, mod?: number) => void;
  /** The season reached a card round: deal that card. */
  openCrisis: (season: SeasonState) => void;
  resolveCrisis: (d: Decision) => void;
  doSpin: () => void;
  doRespin: () => void;
  /** Spend a shop reroll on this spin (not in the Daily Draft or a friend's race, where everyone gets the same spins). */
  doReroll: () => boolean;
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
    (set, get) => {
      /** Starting any other run sets a live career season aside instead of destroying it. Returns false (so `park() || set(...)` always sets). */
      const park = (): false => {
        const s = get();
        if (s.career && s.phase !== 'idle' && s.phase !== 'result') {
          set({ parked: { phase: s.phase, poolId: s.poolId, draft: s.draft, season: s.season, playoffs: s.playoffs, deadline: s.deadline, crisis: s.crisis, stake: s.stake } });
        }
        return false;
      };
      return ({
      phase: 'idle',
      poolId: 'current-2026',
      challenge: null,
      stake: null,
      leagueGain: 0,
      daily: null,
      crisis: null,
      career: false,
      draft: null,
      season: null,
      playoffs: null,
      deadline: null,

      parked: null,
      resumeCareer: () => {
        const p = get().parked;
        if (!p) return false;
        set({ ...p, career: true, challenge: null, daily: null, parked: null, leagueGain: 0 });
        return true;
      },
      newChallenge: (poolId, seed, from) =>
        // Links made before fair rules (no v=2) replay the original spin sequence, so the spins still match theirs.
        park() || set({ phase: 'draft', poolId, challenge: from, daily: null, crisis: null, career: false, draft: from.fair ? startDraft(pool(poolId), seed) : legacyDraft(startDraft(pool(poolId), seed)), season: null, playoffs: null, deadline: null }),
      newRun: (poolId, seed) => park() || set({ phase: 'draft', poolId, challenge: null, daily: null, crisis: null, career: false, draft: startDraft(pool(poolId), seed ?? newSeed()), season: null, playoffs: null, deadline: null }),
      // One shot per day: begin once, resume while that run is alive, locked after it's abandoned or finished.
      newDaily: (key) => {
        const { daily, phase } = get();
        if (daily === key && phase !== 'idle') return 'resumed';
        const day = useDaily.getState().days[key];
        if (day?.draftStarted || day?.draft) return 'locked';
        useDaily.getState().record(key, 'draftStarted', true);
        park();
        // Fair spins start with the next day's Daily, so everyone playing the same day gets the same spins.
        const fresh = startDraft(pool('current-2026'), dailySeed(key));
        set({ phase: 'draft', poolId: 'current-2026', challenge: null, daily: key, crisis: null, career: false, draft: key >= FAIR_DAILY_FROM ? fresh : legacyDraft(fresh), season: null, playoffs: null, deadline: null });
        return 'started';
      },
      doSpin: () => set((s) => ({ draft: spin(s.draft!, pool(s.poolId)) })),
      doRespin: () => set((s) => ({ draft: respin(s.draft!, pool(s.poolId)) })),
      doReroll: () => {
        const s = get();
        if (!s.draft?.spin || s.daily || s.challenge || !useShop.getState().spend()) return false;
        set({ draft: reroll(s.draft, pool(s.poolId)) });
        track({ type: 'reroll' });
        return true;
      },
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
        let league;
        if (draft.scheme === 2) {
          // Fair league: picked from the seed before the draft, so everyone on this seed faces the same teams
          // (players you took are swapped for fixed replacements).
          league = fairLeague(lp, Object.values(draft.roster) as Player[], rng);
        } else {
          // Older saved drafts: exclude your picks by name (the league pool may hold another season of the same player).
          const mine = new Set(Object.values(draft.roster).map((x) => x!.name));
          const exclude = new Set(lp.teams.flatMap((t) => t.players).filter((x) => mine.has(x.name)).map((x) => x.id));
          league = draftLeague(lp, exclude, 29, rng);
        }
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
        // Career mode locks every salary in at signing so payrolls carry over between seasons.
        const [u, ...rest] = get().career ? withSignedSalaries([user, ...league]) : [user, ...league];
        const season = createSeason(u, rest, draft.seed);
        if (get().crisis) {
          const withStops = { ...season, stops: CARD_ROUNDS.slice(1) };
          set({ season: withStops, crisis: { ...get().crisis!, objective: boardObjective(withStops) } });
          get().openCrisis(withStops);
        } else set({ phase: 'season', season });
      },

      newCrisis: (poolId, career = false) => {
        get().newRun(poolId);
        set({ career, ...(career ? { parked: null } : {}), crisis: { objective: null, drawn: [], resolved: 0, pending: null, verdict: null } });
      },
      startCareerSeason: (teams, seed, mod = 0) => {
        // Morale's rating nudge is set on the team up front so the board's objective accounts for it.
        const season = {
          ...createSeason(mod ? { ...teams[0], mod } : teams[0], teams.slice(1), seed), stops: CARD_ROUNDS.slice(1),
          ...(mod ? { mods: [{ amount: mod, fromRound: 0, toRound: SEASON_GAMES }] } : {}),
        };
        set({
          phase: 'season', poolId: 'current-2026', challenge: null, daily: null, career: true, draft: null, playoffs: null, deadline: null,
          season, crisis: { objective: boardObjective(season), drawn: [], resolved: 0, pending: null, verdict: null },
        });
        get().openCrisis(season);
      },
      openCrisis: (season) => {
        const { crisis, poolId, draft } = get();
        if (!crisis || crisis.resolved >= CARD_ROUNDS.length) return set({ season });
        const slot = crisis.resolved;
        const id = drawCard(draft?.seed ?? season.seed, slot, crisis.drawn);
        const card = prepareCard(season, id, slot, pool(poolId), pool('all-time'));
        set({ season, phase: 'crisis', crisis: { ...crisis, drawn: [...crisis.drawn, id], pending: card } });
      },
      resolveCrisis: (d) =>
        set((s) => {
          if (!s.crisis?.pending || !s.season) return {};
          return {
            season: applyCard(s.season, s.crisis.pending, d),
            phase: 'season',
            crisis: { ...s.crisis, pending: null, resolved: s.crisis.resolved + 1 },
          };
        }),

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

      // Finish whatever is left of the season (advance pauses at the deadline, so step past it) and seed the bracket.
      beginPlayoffs: () =>
        set((s) => {
          const done = advance(advance({ ...s.season!, deadlineUsed: true }, 82), 82);
          return { phase: 'playoffs', season: done, playoffs: startPlayoffs(done), stake: null };
        }),
      playoffGame: () => set((s) => ({ playoffs: playNextGame(s.playoffs!) })),
      simPlayoffs: () => set((s) => ({ playoffs: simPlayoffsToEnd(s.playoffs!) })),
      finish: () => {
        const { playoffs, phase } = get();
        if (!playoffs || phase === 'result') return;
        const rec = playoffs.season.records[0];
        const result = { wins: rec.w, losses: rec.l, champion: champion(playoffs) === 0 };
        useProfile.getState().recordDraft(result);
        // Every finished run earns a Player Pick, scaled by how it went.
        useCollection.getState().awardRun(playoffs.season.seed, { ...result, madePlayoffs: !!seriesFor(playoffs, 0) });
        const { daily, crisis, career, poolId } = get();
        if (daily) useDaily.getState().record(daily, 'draft', result);
        const v = crisis?.objective ? verdict(crisis.objective, playoffs.season, playoffs) : null;
        if (crisis?.objective) set({ crisis: { ...crisis, verdict: v } });
        set({ phase: 'result' });
        const mine = playoffs.rounds.flat().filter((s) => s.hi === 0 || s.lo === 0);
        const base = pointsFor({ type: 'run', ...result, madePlayoffs: mine.length > 0 });
        const gain = stakeGain(base, get().stake, mine.length, result.champion);
        track({
          type: 'run', ...result,
          madePlayoffs: mine.length > 0,
          seed: mine[0] ? (mine[0].hi === 0 ? mine[0].seedHi : mine[0].seedLo) : 0,
          playoffLosses: mine.reduce((n, s) => n + (s.hi === 0 ? s.winsLo : s.winsHi), 0),
          kind: career ? 'career' : crisis ? 'crisis' : daily ? 'daily' : (MODE_BY_ID[poolId]?.kind ?? 'current'),
          verdict: v,
        });
        // track() added the base points; the stake adds or takes the difference.
        if (gain !== base) useLeague.getState().adjust(gain - base);
        set({ leagueGain: gain });
        if (result.champion && get().stake === 'snap') track({ type: 'allInTitle' });
        // Friends play this team in a Finals showdown (career and crisis teams count too: they're yours).
        const user = playoffs.season.teams[0];
        useFriends.getState().setLastTeam({
          mode: poolId, w: rec.w, l: rec.l, result: result.champion ? 'champion' : mine.length ? `r${mine.length}` : 'missed',
          players: { ...user.slots },
        });
        // A friend's draft race: more wins wins, then the deeper playoff run.
        const ch = get().challenge;
        const seed = playoffs.season.seed;
        if (ch || seed.startsWith('race-')) useFriends.getState().saveRace(seed, { w: rec.w, l: rec.l, depth: mine.length });
        if (ch?.pin) {
          // Depth = playoff series played (0–4); old links without it compare on wins alone.
          const outcome = raceOutcome({ w: rec.w, depth: ch.depth === undefined ? 0 : mine.length }, { w: ch.w, depth: ch.depth ?? 0 });
          useFriends.getState().settle(seed, ch.pin, outcome, `${rec.w}-${ch.w}`);
        }
      },
      setStake: (stake) => set({ stake }),
      quit: () => set({ phase: 'idle', challenge: null, daily: null, crisis: null, career: false, draft: null, season: null, playoffs: null, deadline: null }),
    });
    },
    {
      name: 'tendeep-run',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ parked: s.parked, phase: s.phase, poolId: s.poolId, challenge: s.challenge, stake: s.stake, leagueGain: s.leagueGain, daily: s.daily, crisis: s.crisis, career: s.career, draft: s.draft, season: s.season, playoffs: s.playoffs, deadline: s.deadline }),
    },
  ),
);

export const isChampion = (ps: PlayoffState | null) => !!ps && champion(ps) === 0;
