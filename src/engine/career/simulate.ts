/** Headless multi-season career (auto decisions) — used by tests and balance checks. */
import { draftLeague } from '../aiDraft';
import { salaryFor } from '../cap';
import { simPlayoffsToEnd, startPlayoffs } from '../playoffs';
import { createRng } from '../rng';
import { advance, createSeason } from '../season';
import { ALL_SLOTS, type Player, type Pool, type Roster } from '../types';
import { initialContracts } from './contracts';
import { aiFreeAgency, finalizeOffseason, resolveExpiring, rookieDraft, seasonLabel, startOffseason, RESIGN_THRESHOLD } from './offseason';

/** Career start: everyone's salary is locked in at today's rating. */
export function withSignedSalaries(teams: Roster[]): Roster[] {
  return teams.map((t) => ({ ...t, slots: Object.fromEntries(ALL_SLOTS.map((k) => [k, { ...t.slots[k], salary: salaryFor(t.slots[k].ovr) }])) as Roster['slots'] }));
}

export function simulateCareer(user: Roster, pool: Pool, seed: string, seasons: number) {
  const mine = new Set(ALL_SLOTS.map((k) => user.slots[k].name));
  const leaguePool = new Set(pool.teams.flatMap((t) => t.players).filter((p) => mine.has(p.name)).map((p) => p.id));
  let teams: Roster[] = withSignedSalaries([user, ...draftLeague(pool, leaguePool, 29, createRng(`${seed}:league`))]);
  const rostered = new Set(teams.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k].name)));
  let freeAgents: Player[] = [...new Map(pool.teams.flatMap((t) => t.players).filter((p) => !rostered.has(p.name)).map((p) => [p.name, p])).values()];
  let contracts = initialContracts(teams.flatMap((t) => ALL_SLOTS.map((k) => t.slots[k])), seed);
  const out: { label: string; teams: Roster[]; wins: number }[] = [];

  for (let n = 1; n <= seasons; n++) {
    out.push({ label: seasonLabel(n), teams, wins: 0 });
    const season = advance(advance(createSeason(teams[0], teams.slice(1), `${seed}:s${n}`), 82), 82);
    out[out.length - 1].wins = season.records[0].w;
    if (n === seasons) break;
    const ps = simPlayoffsToEnd(startPlayoffs(season));
    const playoff = new Set(ps.rounds[0].flatMap((s) => [s.hi, s.lo]));
    let st = startOffseason({ teams: season.teams, contracts, freeAgents, season: n + 1, seed, wins: season.records.map((r) => r.w), playoff });
    const keep = st.expiring.filter((id) => (ALL_SLOTS.map((k) => st.teams[0].slots[k]).find((p) => p?.id === id)?.ovr ?? 0) >= RESIGN_THRESHOLD);
    st = resolveExpiring(st, keep);
    st = rookieDraft(st);
    st = aiFreeAgency(st, true);
    teams = finalizeOffseason(st);
    contracts = st.contracts;
    freeAgents = st.freeAgents;
  }
  return { seasons: out };
}
