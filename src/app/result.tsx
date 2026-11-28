import { HistoryGate } from '../ui/HistoryGate';
import { runNeedsHistory } from '../data/historyReady';
import { track } from '../net/campaign';
import { useForm } from '../store/form';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { feel } from '../audio/feel';
import { CONFERENCES } from '../engine/conference';
import { champion, outInPlayIn, runOutcome, seriesFor, seriesWinner } from '../engine/playoffs';
import { RunRewards } from '../ui/RunRewards';
import { SeasonBreakdown } from '../ui/SeasonBreakdown';
import { seedOf } from '../engine/season';
import { ALL_SLOTS } from '../engine/types';
import { contractUp, useCareer } from '../store/career';
import { useCollection } from '../store/collection';
import { useGame } from '../store/game';
import { goHome } from '../ui/nav';
import { BackButton, Button, Card, Display, Header, Screen } from '../ui/components';
import { Confetti, CountUp } from '../ui/fx';
import { useRunColors } from '../ui/runColors';
import { RosterBoard } from '../ui/RosterBoard';
import { alpha, C, F, FONT, R, S } from '../ui/theme';
import { AWARDS, awardRace, teamLeaders } from '../engine/story/leaders';
import { Icon } from '../ui/icons';
import { CAST } from '../engine/board/cards';
import { shareText } from '../ui/share';
import { useProfile } from '../store/profile';
import { runShareText } from '../engine/share';
import { RarityBadge } from '../ui/RarityBadge';
import { SquadBadge } from '../ui/SquadBadge';
import { squadRating } from '../engine/rotation';
import { useFriends } from '../store/friends';
import { MODE_BY_ID } from '../data/modes';
import { CONFIG } from '../config';
import { LeagueGain } from '../ui/LeagueGain';
import { canRunItBack, compareFinish, finishOf } from '../engine/replay';

const VERDICT_ICON = { legend: 'crown', extended: 'medal', survived: 'clock', fired: 'flame' } as const;

function ResultScreen() {
  const { t } = useTranslation();
  const g = useGame();
  const ps = g.playoffs;
  const won = !!ps && champion(ps) === 0;
  const career = useCareer();
  const pendingPicks = useCollection((s) => s.pending.length);
  const colors = useRunColors();
  const [shared, setShared] = useState<'shared' | 'copied' | null>(null);
  const profileName = useProfile((s) => s.name);
  // Career seasons are recorded once, as soon as the result is shown.
  useEffect(() => { if (g.career) useCareer.getState().recordSeason(); }, [g.career]);
  useEffect(() => { if (won) feel('fanfare'); }, [won]);
  if (!ps) return <Redirect href="/" />;

  const season = ps.season;
  const rec = season.records[0];
  const { seed, conf } = seedOf(season, 0);
  const mine = seriesFor(ps, 0);
  const playIn = outInPlayIn(ps, 0);
  const outcome = won
    ? t('result.champions')
    : mine && seriesWinner(mine.series) !== 0
      ? t('result.lostIn', { round: t(`playoffs.round${mine.round}`) })
      : playIn ? t('result.playIn') : t('result.missed');

  // "Run it back": how this try compares with your best on the same spins.
  const replayCmp = g.replay ? compareFinish(finishOf(runOutcome(ps)), g.replay) : 0;
  const replayable = canRunItBack(g);

  const user = season.teams[0];
  const top = ALL_SLOTS.map((s) => user.slots[s])
    .map((p) => ({ p, tot: season.totals[p.id] }))
    .filter((x) => x.tot?.gp)
    .sort((a, b) => b.tot.pts / b.tot.gp - a.tot.pts / a.tot.gp)[0];
  // The playoff path: each round won, the round that ended the run, and the rounds never reached.
  const pathOf = (r: number): 'won' | 'lost' | 'none' => (won ? 'won' : mine ? (r < mine.round ? 'won' : r === mine.round ? 'lost' : 'none') : 'none');
  const leave = () => { g.quit(); goHome(); };

  return (
    <Screen tint={won ? C.gold : colors[0]} overlay={won ? <Confetti colors={[C.gold, colors[0], colors[1], '#FFFFFF']} /> : null}>
      <Header title={MODE_BY_ID[g.poolId]?.title ?? t('playoffs.title')} left={<BackButton onPress={leave} />} />
      {g.challenge && (
        <View style={[styles.challenge, { borderColor: rec.w > g.challenge.w ? '#14A86B' : C.danger }]} testID="challenge-result">
          <Icon name={rec.w > g.challenge.w ? 'crown' : 'vs'} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.challengeTitle}>
              {rec.w > g.challenge.w ? t('challenge.won', { name: g.challenge.name }) : rec.w === g.challenge.w ? t('challenge.tied', { name: g.challenge.name }) : t('challenge.lost', { name: g.challenge.name })}
            </Text>
            <Text style={styles.challengeSub}>{rec.w}-{rec.l} vs {g.challenge.w}-{g.challenge.l}</Text>
          </View>
        </View>
      )}
      {g.replay && (
        <View style={[styles.challenge, { borderColor: replayCmp > 0 ? '#14A86B' : replayCmp === 0 ? C.gold : C.danger }]} testID="replay-result">
          <Icon name={replayCmp > 0 ? 'crown' : 'reroll'} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.challengeTitle}>{t(replayCmp > 0 ? 'replay.better' : replayCmp === 0 ? 'replay.same' : 'replay.worse')}</Text>
            <Text style={styles.challengeSub}>{t('replay.vs', { best: `${g.replay.w}-${g.replay.l}`, now: `${rec.w}-${rec.l}` })}</Text>
          </View>
        </View>
      )}
      <Card style={styles.board} testID="scoreboard">
        <View style={[styles.trophyRing, { backgroundColor: won ? '#FFE9A8' : C.surface2 }]}>
          <Icon name={won ? 'trophy' : mine ? 'ball' : 'chart'} size={56} />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={styles.scoreRow} testID="result-record" accessibilityLabel={`${rec.w}-${rec.l}`}>
            <CountUp to={rec.w} format={(n) => String(n)} style={[styles.scoreW, won && { color: C.gold }]} />
            <Text style={styles.scoreDash}>–</Text>
            <Text style={styles.scoreL}>{rec.l}</Text>
          </View>
          <View style={styles.pills}>
            <View style={styles.pill}><Text style={styles.pillText}>{conf === null ? t('result.seed') : t(`conf.${CONFERENCES[conf]}`)} #{seed}</Text></View>
            <SquadBadge value={squadRating(season.teams[0])} size="sm" />
          </View>
          {top && <Text style={styles.topScorer} numberOfLines={1}>{(top.tot.pts / top.tot.gp).toFixed(1)} · {top.p.name} · {t('result.topScorer')}</Text>}
        </View>
      </Card>
      <View style={styles.hero}>
        <Display size={won ? 40 : 30} color={won ? '#FFC53D' : '#FFFFFF'}>{outcome}</Display>
        <View style={styles.path} testID="playoff-path">
          {[0, 1, 2, 3].map((r) => {
            const st = pathOf(r);
            return (
              <View key={r} style={[styles.pathCell, st === 'won' && styles.pathWon, st === 'lost' && styles.pathLost]}>
                <Text style={styles.pathLabel} numberOfLines={2}>{t(`playoffs.round${r}`)}</Text>
                <Text style={[styles.pathMark, st === 'won' && { color: C.neon }, st === 'lost' && { color: C.danger }]}>{st === 'won' ? '✓' : st === 'lost' ? '✗' : '–'}</Text>
              </View>
            );
          })}
        </View>
        {g.crisis?.verdict && g.crisis.objective && (
          <View style={styles.verdict} testID="crisis-verdict">
            <Icon name={VERDICT_ICON[g.crisis.verdict]} size={44} />
            <Text style={styles.verdictBig}>
              {t(`crisis.v_${g.crisis.verdict}`)}
            </Text>
            <Text style={styles.verdictSub}>{t('crisis.objective')}: {t(`crisis.obj_${g.crisis.objective.tier}`)}</Text>
            {g.crisis.board ? (
              <>
                {g.crisis.board.firedAt !== undefined && (
                  <Text style={styles.verdictSub} testID="board-fired">
                    {t('board.fired', { g: g.crisis.board.firedAt })}. {t('board.firedSub', { owner: CAST.owner })}
                  </Text>
                )}
                <Text style={styles.verdictSub} testID="board-final">{t('board.finalConfidence', { n: g.crisis.board.confidence })}</Text>
                <Text style={styles.verdictSub}>{t('board.recap')}: {g.crisis.board.played.map((p) => t(`board.c.${p.id}.title`)).join('  ·  ')}</Text>
              </>
            ) : (
              <Text style={styles.verdictSub}>{g.crisis.drawn.map((id) => t(`crisis.cards.${id}.title`)).join('  ·  ')}</Text>
            )}
          </View>
        )}
      </View>
      <SeasonBreakdown season={season} />
      <RarityBadge wins={rec.w} />
      {!g.replay && <LeagueGain gained={g.leagueGain} stake={g.stake} />}
      <Card style={{ gap: S.sm }} testID="team-leaders">
        <View style={styles.awardsHead}><Icon name="chart" size={26} /><Text style={styles.awardsTitle}>{t('result.teamLeaders')}</Text></View>
        {teamLeaders(season).map((l) => (
          <View key={l.stat} style={styles.awardRow}>
            <Text style={styles.awardName}>{t(`league.${l.stat}`)}</Text>
            <Text style={styles.awardWinner} numberOfLines={1}>{l.player.name} · {l.value.toFixed(1)}</Text>
          </View>
        ))}
      </Card>
      <Card style={{ gap: S.sm }} testID="awards">
        <View style={styles.awardsHead}><Icon name="medal" size={26} /><Text style={styles.awardsTitle}>{t('result.awards')}</Text></View>
        {AWARDS.map((a) => {
          const w = awardRace(season, a, 1)[0];
          if (!w) return null;
          return (
            <View key={a} style={styles.awardRow}>
              <Text style={styles.awardName}>{t(`league.${a}`)}</Text>
              <Text style={[styles.awardWinner, w.team === 0 && { color: C.gold }]} numberOfLines={1}>
                {w.player.name}{w.team === 0 ? ' ★' : ''}
              </Text>
            </View>
          );
        })}
      </Card>
      <RosterBoard roster={user.slots} />
      <RunRewards outcome={runOutcome(ps)} replay={!!g.replay} />
      {g.weekly && (
        <Button label={t('weekly.seeBoard')} variant="gold" icon={<Icon name="trophy" size={22} />} onPress={() => router.push('/weekly')} testID="weekly-board-link" />
      )}
      {pendingPicks > 0 && (
        <Button label={t('collect.claim')} icon={<Icon name="gift" size={22} />} variant="gold" onPress={() => router.push('/packs')} testID="claim-pick" />
      )}
      {g.career ? (
        <Button
          label={career.ended ? t('career.over') : contractUp(career) ? t('career.contractUp') : t('career.toOffseason')}
          variant="gold"
          onPress={() => {
            // A contract that's up is settled on the career page (extend or retire) before the offseason.
            if (career.ended || contractUp(career)) return router.replace('/career');
            career.beginOffseason();
            router.replace('/offseason');
          }}
          testID="career-continue"
        />
      ) : null}
      {!g.career && (
        <Button label={shared ? t(`challenge.${shared}`) : t('challenge.share')} variant="dark" icon={<Icon name="swap" size={22} />} testID="share"
          onPress={async () => {
            const text = runShareText({
              wins: rec.w, losses: rec.l, result: won ? 'champion' : mine ? `round${mine.round}` : playIn ? 'playin' : 'missed', resultLabel: outcome,
              mode: MODE_BY_ID[g.poolId]?.title ?? 'Ten Deep', ovrs: ALL_SLOTS.map((k) => user.slots[k].ovr), seed: season.seed,
              poolId: g.poolId, name: profileName || t('home.player'), url: CONFIG.webUrl,
              pin: useFriends.getState().pin, depth: won ? 4 : mine ? mine.round + 1 : 0,
              fair: g.draft?.scheme === 2, formDay: useForm.getState().day ?? undefined,
            });
            const r = await shareText(text);
            if (r !== 'failed') { setShared(r); track('shared'); }
          }} />
      )}
      {replayable && (
        <View style={{ gap: 4 }}>
          <Button label={t('replay.button')} variant="blue" icon={<Icon name="reroll" size={22} />} testID="run-it-back"
            onPress={() => { if (g.runItBack()) router.replace('/draft'); }} />
          <Text style={styles.replayHint}>{t('replay.hint')}</Text>
        </View>
      )}
      {!g.career && <Button label={t('result.playAgain')} onPress={() => { if (g.crisis?.rebuild) { router.replace('/rebuild'); return; } if (g.crisis) g.newCrisis(g.poolId); else g.newRun(g.poolId); router.replace('/draft'); }} testID="play-again" />}
      <Button label={t('result.home')} variant="ghost" onPress={leave} testID="go-home" />
    </Screen>
  );
}


/** Waits for the full history when this run needs it (an era, All-Time, a franchise, Crisis, Career). */
export default function Result() {
  const needs = useGame((s) => runNeedsHistory(s));
  return <HistoryGate when={needs}><ResultScreen /></HistoryGate>;
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  trophyRing: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.line, borderBottomWidth: 5, borderBottomColor: C.edge },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  scoreW: { fontFamily: FONT.condensed, fontSize: 54, lineHeight: 56, color: C.neon },
  scoreDash: { fontFamily: FONT.condensed, fontSize: 34, color: C.muted },
  scoreL: { fontFamily: FONT.condensed, fontSize: 54, lineHeight: 56, color: C.danger },
  pills: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: R.sm, backgroundColor: C.surface2 },
  pillText: { color: C.text, fontSize: 12, fontWeight: '700' },
  topScorer: { color: C.muted, fontSize: 12, fontWeight: '600' },
  hero: { alignItems: 'center', paddingTop: S.sm, gap: S.md },
  path: { flexDirection: 'row', gap: 4, alignSelf: 'stretch' },
  pathCell: { flex: 1, borderRadius: R.sm, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center', gap: 2 },
  pathWon: { backgroundColor: alpha(C.neon, 0.14), borderColor: alpha(C.neon, 0.5) },
  pathLost: { backgroundColor: alpha(C.danger, 0.14), borderColor: C.danger },
  pathLabel: { color: C.muted, fontSize: 11, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },
  pathMark: { color: C.muted, fontFamily: FONT.condensed, fontSize: 16 },
  awardsHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  verdict: { alignItems: 'center', gap: 4, marginTop: S.sm },
  verdictBig: { color: C.hardwood, fontSize: 22, textAlign: 'center', ...F.display },
  verdictSub: { color: C.muted, fontSize: 13, textAlign: 'center' },
  challenge: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: 20, borderWidth: 2, backgroundColor: C.surface, marginTop: S.sm },
  challengeTitle: { fontWeight: '800', fontSize: 17, color: C.text },
  challengeSub: { color: C.muted, fontWeight: '700' },
  replayHint: { color: C.muted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  awardsTitle: { color: C.text, fontWeight: '800', fontSize: 15 },
  awardRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  awardName: { color: C.muted, fontSize: 12, flex: 1 },
  awardWinner: { color: C.text, fontWeight: '800', flex: 1, textAlign: 'right' },
});
