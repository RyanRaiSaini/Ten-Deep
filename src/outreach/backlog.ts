/**
 * A starter idea board, written from the 2026-11-24 audit. Evidence entries are only things that were
 * observed in the code or a test run; everything else is listed as an assumption. Scores are a first
 * pass for the owner to change. Loaded on request from the admin (never automatically).
 */
import type { Evidence, Idea } from './types';

const AT = '2026-11-24T12:00:00.000Z';
const SRC = 'Audit 2026-11-24 (smoke run of the live build + code reading)';

export const STARTER_EVIDENCE: Evidence[] = [
  { id: 'ev_audit_preview', kind: 'observation', text: 'Shared links showed only the title "Ten Deep" with no description or picture. A generic preview image was added on 2026-11-24, but a shared run still shows the same generic picture, not the run.', source: SRC, contactId: '', at: AT },
  { id: 'ev_audit_league', kind: 'observation', text: 'Challenge links give the same spins in the same order, but the AI league is drafted without each player\'s picks, so opponents differ, and a respin shifts every later spin (src/store/game.ts startSeason, src/engine/draft.ts landSpin). The copy that promised "same league" was corrected on 2026-11-24.', source: SRC, contactId: '', at: AT },
  { id: 'ev_audit_rules', kind: 'observation', text: 'The rules are explained only in three welcome slides, which can be skipped. There is no "How it works" page to come back to.', source: SRC, contactId: '', at: AT },
  { id: 'ev_audit_recap', kind: 'bug', text: 'Playoff recap read "You takes the quarter". Fixed on 2026-11-24 in all 11 languages.', source: SRC, contactId: '', at: AT },
  { id: 'ev_audit_daily', kind: 'observation', text: 'The Daily Draft already gives everyone the same spins for a date (seed from the date), so a weekly or creator challenge can reuse that path.', source: SRC, contactId: '', at: AT },
];

const idea = (o: Omit<Idea, 'createdAt' | 'status' | 'nextAction'> & Partial<Pick<Idea, 'status' | 'nextAction'>>): Idea => ({ status: 'Candidate', nextAction: '', createdAt: AT, ...o });

export const STARTER_IDEAS: Idea[] = [
  idea({
    id: 'idea_fair_challenge', title: 'Fair challenge mode (same spins and the same opponents)',
    problem: 'Two people on the same challenge link can face different leagues, and a respin changes later spins, so comparing records is not fully fair.',
    who: 'Creators running a challenge for viewers; friends comparing records.', evidence: ['ev_audit_league'],
    assumptions: 'Creators care about fairness enough that unequal opponents would come up in comments. Not yet confirmed by any creator.',
    change: 'In challenge mode, draft the AI league from the seed before the player picks (swapping any player you take for a seeded replacement), and record respins in the link so a challenger sees the same spin sequence.',
    benefit: 'A record on a challenge link means the same thing for everyone, which makes "beat my draft" content credible.',
    effort: 'M', dependencies: 'Changes to league building in src/store/game.ts; old challenge links keep their current behavior.',
    success: 'Two test devices on one link produce identical opponents and schedules (automated test), and no creator feedback reports unequal conditions.',
    value: 5, shareability: 5, nextAction: 'Prototype league-before-picks and test with two seeded runs.',
  }),
  idea({
    id: 'idea_result_card', title: 'Shareable result card for each run',
    problem: 'A shared run unfurls with the generic preview, so the link doesn\'t show the record or the roster.',
    who: 'Anyone sharing a run, especially creators posting results.', evidence: ['ev_audit_preview'],
    assumptions: 'A preview showing the record gets more clicks than the generic one. Measurable with the "shared" and "visit" events.',
    change: 'Give challenge links their own preview image (record, result, the 10 overall ratings as squares), generated like the existing card-pull images in api/pull.ts.',
    benefit: 'Shared results look like results, which should help the share-to-visit step.',
    effort: 'M', dependencies: 'Reuse of the @vercel/og setup in api/pull.ts; a server route that renders /c links with per-run meta tags.',
    success: 'Campaign visitors arriving via shared links rise relative to shares (shared results / visits), measured over two campaigns.',
    value: 4, shareability: 5, nextAction: 'Sketch the card at 1200x630.',
  }),
  idea({
    id: 'idea_weekly_challenge', title: 'Weekly creator challenge on the Daily Draft path',
    problem: 'A creator who wants their audience to play the same draft has to share a one-off link, and there\'s no shared place to compare results.',
    who: 'Creators and their viewers.', evidence: ['ev_audit_daily'],
    assumptions: 'Viewers would play a named weekly challenge. Unknown until a creator tries it.',
    change: 'A weekly seed with a name and a short page (/w/<code>) showing the challenge and its rules, reusing the Daily Draft seeding.',
    benefit: 'Gives outreach a concrete invitation: "here is this week\'s draft, want to try it on stream?"',
    effort: 'S', dependencies: 'Fair challenge mode makes it stronger, but it can ship first with the honest "same spins" wording.',
    success: 'At least one campaign uses it, with recorded draft_started / visit for that link.',
    value: 4, shareability: 4, nextAction: 'Decide whether it waits for fair challenge mode.',
  }),
  idea({
    id: 'idea_how_it_works', title: '"How it works" page reachable from the draft screen',
    problem: 'Rules are only in skippable welcome slides; someone recording a first run has nothing to point to.',
    who: 'First-time players, creators explaining the game on camera.', evidence: ['ev_audit_rules'],
    assumptions: 'Some first-time players skip the slides. Measurable later as drafts started but not completed.',
    change: 'A short page (cap, real contracts, the two-95+ limit, respins, how the season and playoffs run) linked from the draft header.',
    benefit: 'Fewer confused first drafts, and an easy explainer link for outreach messages.',
    effort: 'S', dependencies: 'Translations for 11 languages.',
    success: 'draft_completed / draft_started for campaign visitors at or above 70%.',
    value: 4, shareability: 2, nextAction: 'Write the copy from src/outreach/facts.ts.',
  }),
  idea({
    id: 'idea_sim_explain', title: 'Explain why a season went the way it did',
    problem: 'A final record has no explanation (team strength, injuries, schedule), which is what analytics people would want to examine.',
    who: 'Analytics creators and writers; players debating results.', evidence: [],
    assumptions: 'Analytics creators want to inspect the sim. No feedback yet.',
    change: 'A season summary: team rating vs league, games missed to injury, close-game record, and the biggest swing games.',
    benefit: 'Gives people something concrete to debate and write about.',
    effort: 'M', dependencies: 'Values already exist in the season state; needs a summary screen.',
    success: 'Mentioned positively in feedback from at least two analytics contacts.',
    value: 3, shareability: 3, nextAction: 'Wait for feedback from the analytics campaign.',
  }),
  idea({
    id: 'idea_replay', title: 'Replay the same spins',
    problem: 'After a run there\'s no way to try the same spins again with different picks.',
    who: 'Players learning the game; creators doing "redraft" segments.', evidence: [],
    assumptions: 'Redrafting the same spins is fun. Unverified.',
    change: '"Replay these spins" on the result screen (same seed, fresh draft).',
    benefit: 'A cheap way to compare strategies, and a natural video format.',
    effort: 'S', dependencies: 'None; newRun already accepts a seed.',
    success: 'Used in at least 10% of completed runs (needs an event).',
    value: 3, shareability: 3, nextAction: 'Add after the fair challenge decision (same code path).',
  }),
  idea({
    id: 'idea_bracket', title: 'Playoff bracket view and season summary card',
    problem: 'Playoffs are shown as a list of series; there\'s no bracket picture to screenshot.',
    who: 'Players sharing a title run.', evidence: [],
    assumptions: 'A bracket is more shareable than the list.',
    change: 'A bracket view on the playoffs and result screens.',
    benefit: 'Better screenshots of deep runs.',
    effort: 'M', dependencies: 'Layout work for phone widths.',
    success: 'Shares per completed run rise after release.',
    value: 2, shareability: 4, nextAction: 'Park until result cards ship.',
  }),
  idea({
    id: 'idea_cap_variants', title: 'Salary-cap variants (tight cap, rookies only)',
    problem: 'Every draft uses the same $200M cap rule, which already exists; variants could keep it fresh.',
    who: 'Returning players.', evidence: [],
    assumptions: 'Returning players want variety. No data yet.',
    change: 'Optional rule presets on the mode screen.',
    benefit: 'More reasons to come back.',
    effort: 'M', dependencies: 'Calibration tests per preset.',
    success: 'return / visit improves for players who try a variant.',
    value: 2, shareability: 2, status: 'Parked', nextAction: 'Revisit once there are returning players to measure.',
  }),
];

/** Rank: owner scores, with effort as the divisor (S=1, M=2, L=3). */
export const ideaScore = (i: Pick<Idea, 'value' | 'shareability' | 'effort'>) => (i.value + i.shareability) / ({ S: 1, M: 2, L: 3 }[i.effort]);
