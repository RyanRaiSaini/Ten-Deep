import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { MODE_BY_ID, POOLS, current2026, leaguePoolFor } from '../data';
import { DIVISIONS, assignDivisions, defaultDivision, franchiseOf, layoutOf, leagueFranchises } from '../engine/conference';
import { realLeague } from '../engine/realLeague';
import {
  affordableSlots, fallbackPick, isComplete, pick, pickFallback, reroll, respin, spin, startDraft, type DraftState,
  legacyDraft, RESPINS_PER_DRAFT,
} from '../engine/draft';
import { champion, playNextGame, runOutcome, simPlayoffsToEnd, startPlayoffs, type PlayoffState } from '../engine/playoffs';
import { createRng } from '../engine/rng';
import { SEASON_GAMES, advance, benchSwitch, createSeason, tradeSwap, type SeasonState } from '../engine/season';
import { ALL_SLOTS, type Player, type Roster, type RosterSlots, type SlotId, type TeamSeason } from '../engine/types';
import { withSignedSalaries } from '../engine/career/simulate';
import { applyCard, type Decision } from '../engine/crisis/apply';
import { boardObjective, verdict, type Objective, type Verdict } from '../engine/crisis/board';
import { CARD_ROUNDS, drawCard, type CardId } from '../engine/crisis/deck';
import { prepareCard, type CrisisCard } from '../engine/crisis/offers';
import { STOPS, newBoard, type BoardEvent, type BoardState } from '../engine/board/state';
import { arrive, resolve as resolveStop, reveal, secondLook } from '../engine/board/stop';
import { checkDemands } from '../engine/board/rules';
import { type Decision as BoardDecision, vetoDemand } from '../engine/board/play';
import { respin as boardRespinOf, signOption, type MarketOption } from '../engine/board/market';
import { boardCtx } from './boardCtx';
import { dailySeed } from '../engine/daily';
import { useDaily } from './daily';
import { useWeekly } from './weekly';
import { depthOf, weeklySeed } from '../engine/weekly';
import { squadRating } from '../engine/rotation';
import { useCollection } from './collection';
import { pointsFor, stakeGain } from '../engine/league/ladder';
import { useLeague } from './league';
import { track } from './progress';
import { useProfile } from './profile';
import { useFriends } from './friends';
import { useShop } from './shop';
import { raceOutcome } from '../engine/friends/match';
import { canRunItBack, finishOf, nextMark, type ReplayMark } from '../engine/replay';

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
  /** The 72-card board (pick 1 of 6, Board Confidence, demands). Runs saved before it keep the old four cards. */
  board?: BoardState;
  /** What the last board move settled, for the toast on the next screen. */
  news?: BoardEvent[];
}

export interface GameStore {
  phase: Phase;
  poolId: string;
  /** Set when this run is today's Daily Draft (YYYY-MM-DD). */
  daily: string | null;
  /** This week's Weekly Challenge (its Monday key) while that run is on. */
  weekly: string | null;
  /** Start (or resume) this week's Weekly Challenge: one attempt, same spins and league for everyone. */
  newWeekly: (week: string) => 'started' | 'resumed' | 'locked';
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
  /** Set while this run is a "Run it back": your best finish on these spins so far (see engine/replay.ts). */
  replay: ReplayMark | null;
  /** From the result screen: draft the same spins again. False when this run can't be run back. */
  runItBack: () => boolean;
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
  /** Board runs: flip one of the six face-down cards. */
  revealBoardCard: (index: number) => void;
  /** Board runs: swap a revealed finance card (Second look perk). */
  boardSecondLook: () => void;
  /** Board runs: resolve the revealed card; true if it got you fired (the run jumps to the result). */
  resolveBoard: (d: BoardDecision) => boolean;
  /** Front office: sell the player in `slot` and sign an option; true if it got you fired. */
  boardSign: (slot: SlotId, option: MarketOption) => boolean;
  boardRespin: () => boolean;
  boardVeto: (index: number) => void;
  doSpin: () => void;
  doRespin: () => void;
  /** Spend a shop reroll on this spin (not in the Daily Draft or a friend's race, where everyone gets the same spins). */
  doReroll: () => boolean;
  doPick: (playerId: string, slot: SlotId) => void;
  doFallback: () => void;
  startSeason: () => void;
  /** Your division (index into DIVISIONS), kept for every run; null until you pick one (then the seed picks). */
  division: number | null;
  setDivision: (d: number) => void;
  setSeason: (s: SeasonState) => void;
  /** The run's one bench switch (engine/season.ts benchSwitch): false if it isn't allowed. */
  doBenchSwitch: (bench: SlotId, starter: SlotId) => boolean;
  openDeadline: (season: SeasonState) => void;
  chooseDeadlineOut: (playerId: string) => void;
  spinDeadline: () => void;
  signDeadline: (player: Player) => void;
  skipDeadline: () => void;
  beginPlayoffs: () => void;
  /** Board Confidence hit 0: the season and playoffs play out without you and the run ends fired. */
  fireGm: () => void;
  playoffGame: () => void;
  simPlayoffs: () => void;
  finish: () => void;
  quit: () => void;
}

const pool = (id: string) => POOLS[id];
/** Older careers saved team names without a franchise: find it from the name (e.g. "Seattle SuperSonics" → okc). */
let byName: Map<string, string> | null = null;
const franchiseByName = (name: string) =>
  (byName ??= new Map([...pool('all-time').teams, ...current2026.teams].map((t) => [`${t.city} ${t.name}`, franchiseOf(t)]))).get(name);
/**
 * The board has the last word: fired if confidence hit 0; a shaky board (3 or less) knocks the verdict down a step,
 * except a title.
 */
function boardVerdict(v: Verdict, b?: BoardState): Verdict {
  if (!b) return v;
  if (b.firedAt !== undefined || b.confidence <= 0) return 'fired';
  if (b.confidence <= 3 && v !== 'legend') return v === 'extended' ? 'survived' : 'fired';
  return v;
}
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
      replay: null,
      daily: null,
      weekly: null,
      crisis: null,
      career: false,
      draft: null,
      season: null,
      playoffs: null,
      deadline: null,

      parked: null,
      division: null,
      setDivision: (d) => set({ division: d }),
      resumeCareer: () => {
        const p = get().parked;
        if (!p) return false;
        set({ ...p, career: true, challenge: null, daily: null, weekly: null, parked: null, leagueGain: 0, replay: null });
        return true;
      },
      newChallenge: (poolId, seed, from) =>
        // Links made before fair rules (no v=2) replay the original spin sequence, so the spins still match theirs.
        park() || set({ phase: 'draft', poolId, replay: null, challenge: from, daily: null, weekly: null, crisis: null, career: false, draft: from.fair ? startDraft(pool(poolId), seed) : legacyDraft(startDraft(pool(poolId), seed)), season: null, playoffs: null, deadline: null }),
      newRun: (poolId, seed) => park() || set({ phase: 'draft', poolId, replay: null, challenge: null, daily: null, weekly: null, crisis: null, career: false, draft: startDraft(pool(poolId), seed ?? newSeed()), season: null, playoffs: null, deadline: null }),
      runItBack: () => {
        const s = get();
        if (s.phase !== 'result' || !s.playoffs || !canRunItBack(s)) return false;
        const mark = nextMark(s.replay, finishOf(runOutcome(s.playoffs)));
        get().newRun(s.poolId, s.draft!.seed);
        set({ replay: mark });
        return true;
      },
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
        set({ phase: 'draft', poolId: 'current-2026', replay: null, challenge: null, daily: key, weekly: null, crisis: null, career: false, draft: key >= FAIR_DAILY_FROM ? fresh : legacyDraft(fresh), season: null, playoffs: null, deadline: null });
        return 'started';
      },
      newWeekly: (week) => {
        const { weekly, phase } = get();
        if (weekly === week && phase !== 'idle') return 'resumed';
        const run = useWeekly.getState().weeks[week];
        if (run?.started || run?.result) return 'locked';
        useWeekly.getState().update(week, { started: true });
        park();
        set({ phase: 'draft', poolId: 'current-2026', replay: null, challenge: null, daily: null, weekly: week, crisis: null, career: false, draft: startDraft(pool('current-2026'), weeklySeed(week)), season: null, playoffs: null, deadline: null });
        return 'started';
      },
      doSpin: () => set((s) => ({ draft: spin(s.draft!, pool(s.poolId)) })),
      doRespin: () => set((s) => ({ draft: respin(s.draft!, pool(s.poolId)) })),
      doReroll: () => {
        const s = get();
        if (!s.draft?.spin || s.daily || s.weekly || s.challenge || !useShop.getState().spend()) return false;
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
        // Shared runs (Daily, Weekly, a friend's link) put everyone in the same division, so everyone plays the same
        // schedule; otherwise yours. Not chosen yet: the seed picks, and that pick sticks (a career keeps it).
        const shared = !!(get().daily || get().weekly || get().challenge);
        // The mode's era decides the league's layout (1987-88: 23 teams in four divisions); a division you chose
        // for another layout doesn't carry over.
        const layout = mode?.layout ?? 'modern';
        const chosen = get().division;
        const division = shared || chosen === null || layoutOf(chosen) !== layout ? defaultDivision(draft.seed, layout) : chosen;
        if (!shared && chosen === null) set({ division });
        // The 29 AI teams are real teams of the other franchises (Current Day: their actual 2026-27 rosters;
        // eras: a season of theirs from that era), minus anyone you drafted. Same picks and seed, same league.
        const franchises = leagueFranchises(division, draft.seed);
        const seasons = mode && mode.kind !== 'franchise' ? mode.pool.teams : lp.teams;
        // Current Day never reaches into the history (it may not be loaded, and shared runs must build the same
        // league on every device): a short roster is topped up with reserves instead.
        const fallback = mode?.kind === 'current' ? current2026.teams : pool('all-time').teams;
        const league = realLeague(franchises, Object.values(draft.roster) as Player[], draft.seed, seasons, fallback, current2026.teams);
        const teams = [user, ...league];
        const divs = assignDivisions([undefined, ...franchises], division);
        // Career mode locks every salary in at signing so payrolls carry over between seasons.
        const [u, ...rest] = get().career ? withSignedSalaries(teams) : teams;
        const season = createSeason(u, rest, draft.seed, divs);
        if (get().crisis) {
          // Your team takes the place of the franchise your division left out (any of its teams in an odd league).
          const home = DIVISIONS[division].franchises.find((f) => !franchises.includes(f)) ?? DIVISIONS[division].franchises[0];
          const withStops = { ...season, stops: STOPS.slice(1) };
          set({ season: withStops, crisis: { ...get().crisis!, objective: boardObjective(withStops), board: newBoard(home) } });
          get().openCrisis(withStops);
        } else set({ phase: 'season', season });
      },

      newCrisis: (poolId, career = false) => {
        get().newRun(poolId);
        set({ career, ...(career ? { parked: null } : {}), crisis: { objective: null, drawn: [], resolved: 0, pending: null, verdict: null } });
      },
      startCareerSeason: (teams, seed, mod = 0) => {
        // Morale's rating nudge is set on the team up front so the board's objective accounts for it.
        // A career plays today's league: a division picked for an older era's league doesn't apply.
        const chosen = get().division;
        const divs = assignDivisions(teams.map((t) => t.franchise ?? franchiseByName(t.name)), chosen !== null && layoutOf(chosen) === 'modern' ? chosen : defaultDivision(seed));
        const season = {
          ...createSeason(mod ? { ...teams[0], mod } : teams[0], teams.slice(1), seed, divs), stops: STOPS.slice(1),
          ...(mod ? { mods: [{ amount: mod, fromRound: 0, toRound: SEASON_GAMES }] } : {}),
        };
        set({
          phase: 'season', poolId: 'current-2026', replay: null, challenge: null, daily: null, weekly: null, career: true, draft: null, playoffs: null, deadline: null,
          season, crisis: { objective: boardObjective(season), drawn: [], resolved: 0, pending: null, verdict: null, board: newBoard(teams[0].franchise ?? 'sac') },
        });
        get().openCrisis(season);
      },
      openCrisis: (season) => {
        const { crisis, poolId, draft } = get();
        if (crisis?.board) {
          const b = crisis.board;
          if (b.stop >= STOPS.length || b.hand) return set({ season, ...(b.hand ? { phase: 'crisis' as const } : {}) });
          const step = arrive(b, boardCtx(poolId, season));
          set({ season: step.season, phase: 'crisis', crisis: { ...crisis, board: step.board, news: step.events } });
          if (step.board.firedAt !== undefined) get().fireGm();
          return;
        }
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

      revealBoardCard: (index) =>
        set((s) => (s.crisis?.board && s.season ? { crisis: { ...s.crisis, board: reveal(s.crisis.board, index, boardCtx(s.poolId, s.season)) } } : {})),
      boardSecondLook: () =>
        set((s) => (s.crisis?.board && s.season ? { crisis: { ...s.crisis, board: secondLook(s.crisis.board, boardCtx(s.poolId, s.season)) } } : {})),
      resolveBoard: (d) => {
        const { crisis, season, poolId } = get();
        if (!crisis?.board?.picked || !season) return false;
        const step = resolveStop(crisis.board, d, boardCtx(poolId, season));
        set({ season: step.season, phase: 'season', crisis: { ...crisis, board: step.board, news: step.events } });
        if (step.board.firedAt === undefined) return false;
        get().fireGm();
        return true;
      },
      boardSign: (slot, option) => {
        const { crisis, season, poolId } = get();
        if (!crisis?.board || !season) return false;
        const signed = signOption(season, crisis.board, slot, option);
        const step = checkDemands(signed.board, { ...boardCtx(poolId, signed.season) });
        set({ season: step.season, crisis: { ...crisis, board: step.board, news: step.events } });
        if (step.board.firedAt === undefined) return false;
        get().fireGm();
        return true;
      },
      boardRespin: () => {
        const { crisis } = get();
        const b = crisis?.board && boardRespinOf(crisis.board);
        if (!b) return false;
        set({ crisis: { ...crisis!, board: b } });
        return true;
      },
      boardVeto: (index) => set((s) => (s.crisis?.board ? { crisis: { ...s.crisis, board: vetoDemand(s.crisis.board, index) } } : {})),
      fireGm: () => {
        // Fired mid-season: an interim GM plays out the year, then straight to the verdict.
        get().beginPlayoffs();
        get().simPlayoffs();
        get().finish();
      },

      setSeason: (season) => set({ season }),
      doBenchSwitch: (bench, starter) => {
        const { season, phase } = get();
        if (!season || (phase !== 'season' && phase !== 'deadline')) return false;
        try { set({ season: benchSwitch(season, bench, starter) }); return true; } catch { return false; }
      },

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
          let done = advance(advance({ ...s.season!, deadlineUsed: true, stops: [] }, 82), 82);
          // The regular season is over: every board demand left is settled now.
          let crisis = s.crisis;
          if (crisis?.board && crisis.board.firedAt === undefined) {
            const step = checkDemands(crisis.board, boardCtx(s.poolId, done), true);
            done = step.season;
            crisis = { ...crisis, board: step.board, news: step.events };
          }
          return { phase: 'playoffs', season: done, playoffs: startPlayoffs(done), stake: null, crisis };
        }),
      playoffGame: () => set((s) => ({ playoffs: playNextGame(s.playoffs!) })),
      simPlayoffs: () => set((s) => ({ playoffs: simPlayoffsToEnd(s.playoffs!) })),
      finish: () => {
        const { playoffs, phase } = get();
        if (!playoffs || phase === 'result') return;
        const rec = playoffs.season.records[0];
        const result = { wins: rec.w, losses: rec.l, champion: champion(playoffs) === 0 };
        useProfile.getState().recordDraft(result);
        const { daily, weekly, crisis, career, poolId, replay } = get();
        // Every finished run earns a pick; a deep playoff run stacks a playoff pick on top (see runRewards).
        // A replay knows its spins, so it pays nothing: no pick, no league points, no missions (engine/replay.ts).
        if (replay) {
          set({ phase: 'result', leagueGain: 0 });
          return;
        }
        useCollection.getState().awardRun(playoffs.season.seed, runOutcome(playoffs));
        if (daily) useDaily.getState().record(daily, 'draft', result);
        if (weekly) {
          const o = runOutcome(playoffs);
          useWeekly.getState().update(weekly, { result: { w: o.wins, l: o.losses, depth: depthOf(o), sr: Math.round(squadRating(playoffs.season.teams[0])) } });
          void useWeekly.getState().submit(weekly);
        }
        const v = crisis?.objective ? boardVerdict(verdict(crisis.objective, playoffs.season, playoffs), crisis.board) : null;
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
          kind: career ? 'career' : crisis ? 'crisis' : daily || weekly ? 'daily' : (MODE_BY_ID[poolId]?.kind ?? 'current'),
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
      quit: () => set({ phase: 'idle', replay: null, challenge: null, daily: null, weekly: null, crisis: null, career: false, draft: null, season: null, playoffs: null, deadline: null }),
    });
    },
    {
      name: 'tendeep-run',
      version: 2,
      // v2: one respin per draft; a draft saved with more keeps only one.
      migrate: (persisted, from) => {
        const st = persisted as Partial<GameStore>;
        if (from < 2) {
          const cap = (d: DraftState | null | undefined) => (d ? { ...d, respinsLeft: Math.min(d.respinsLeft, RESPINS_PER_DRAFT) } : d);
          if (st.draft) st.draft = cap(st.draft)!;
          if (st.parked?.draft) st.parked = { ...st.parked, draft: cap(st.parked.draft)! };
        }
        return st as GameStore;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ replay: s.replay, division: s.division, parked: s.parked, phase: s.phase, poolId: s.poolId, challenge: s.challenge, stake: s.stake, leagueGain: s.leagueGain, daily: s.daily, weekly: s.weekly, crisis: s.crisis, career: s.career, draft: s.draft, season: s.season, playoffs: s.playoffs, deadline: s.deadline }),
    },
  ),
);

export const isChampion = (ps: PlayoffState | null) => !!ps && champion(ps) === 0;
