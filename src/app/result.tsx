import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { feel } from '../audio/feel';
import { champion, seriesFor, seriesWinner } from '../engine/playoffs';
import { standings } from '../engine/season';
import { ALL_SLOTS } from '../engine/types';
import { cardDef } from '../engine/crisis/deck';
import { useCareer } from '../store/career';
import { useCollection } from '../store/collection';
import { useGame } from '../store/game';
import { goHome } from '../ui/nav';
import { Button, Card, Screen } from '../ui/components';
import { Confetti, CountUp } from '../ui/fx';
import { useRunColors } from '../ui/runColors';
import { RosterBoard } from '../ui/RosterBoard';
import { C, F, S } from '../ui/theme';
import { AWARDS, awardRace } from '../engine/story/leaders';

export default function Result() {
  const { t } = useTranslation();
  const g = useGame();
  const ps = g.playoffs;
  const won = !!ps && champion(ps) === 0;
  const career = useCareer();
  const pendingPicks = useCollection((s) => s.pending.length);
  const colors = useRunColors();
  // Career seasons are recorded once, as soon as the result is shown.
  useEffect(() => { if (g.career) useCareer.getState().recordSeason(); }, [g.career]);
  useEffect(() => { if (won) feel('fanfare'); }, [won]);
  if (!ps) return <Redirect href="/" />;

  const season = ps.season;
  const rec = season.records[0];
  const seed = standings(season).findIndex((r) => r.team === 0) + 1;
  const mine = seriesFor(ps, 0);
  const outcome = won
    ? t('result.champions')
    : mine && seriesWinner(mine.series) !== 0
      ? t('result.lostIn', { round: t(`playoffs.round${mine.round}`) })
      : t('result.missed');

  const user = season.teams[0];
  const top = ALL_SLOTS.map((s) => user.slots[s])
    .map((p) => ({ p, tot: season.totals[p.id] }))
    .filter((x) => x.tot?.gp)
    .sort((a, b) => b.tot.pts / b.tot.gp - a.tot.pts / a.tot.gp)[0];

  return (
    <Screen tint={won ? C.gold : colors[0]} overlay={won ? <Confetti colors={[C.gold, colors[0], colors[1], '#FFFFFF']} /> : null}>
      <View style={styles.hero}>
        <Text style={styles.trophy}>{won ? '🏆' : mine ? '🏀' : '📉'}</Text>
        <Text style={[styles.outcome, won && { color: C.gold }]}>{outcome}</Text>
        {g.crisis?.verdict && g.crisis.objective && (
          <View style={styles.verdict} testID="crisis-verdict">
            <Text style={styles.verdictBig}>
              {{ legend: '👑', extended: '✍️', survived: '😐', fired: '🔥' }[g.crisis.verdict]} {t(`crisis.v_${g.crisis.verdict}`)}
            </Text>
            <Text style={styles.verdictSub}>🎯 {t('crisis.objective')}: {t(`crisis.obj_${g.crisis.objective.tier}`)}</Text>
            <Text style={styles.verdictSub}>{g.crisis.drawn.map((id) => `${cardDef(id).icon} ${t(`crisis.cards.${id}.title`)}`).join('  ·  ')}</Text>
          </View>
        )}
      </View>
      <Card style={styles.stats}>
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <CountUp to={rec.w} format={(n) => `${n}-${rec.l}`} style={[styles.value, won && { color: C.gold }]} testID="result-record" />
          <Text style={styles.sub}>{t('result.record')}</Text>
        </View>
        <Stat label={t('result.seed')} value={`#${seed}`} />
        {top && <Stat label={t('result.topScorer')} value={`${(top.tot.pts / top.tot.gp).toFixed(1)}`} sub={top.p.name} />}
      </Card>
      <Card style={{ gap: S.sm }} testID="awards">
        <Text style={styles.awardsTitle}>🏅 {t('result.awards')}</Text>
        {AWARDS.map((a) => {
          const w = awardRace(season, a, 1)[0];
          if (!w) return null;
          return (
            <View key={a} style={styles.awardRow}>
              <Text style={styles.awardName}>{t(`league.${a}`)}</Text>
              <Text style={[styles.awardWinner, w.team === 0 && { color: C.gold }]} numberOfLines={1}>
                {w.team === 0 ? '⭐ ' : ''}{w.player.name}
              </Text>
            </View>
          );
        })}
      </Card>
      <RosterBoard roster={user.slots} />
      {pendingPicks > 0 && (
        <Button label={`🎁  ${t('collect.claim')}`} variant="gold" onPress={() => router.push('/packs')} testID="claim-pick" />
      )}
      {g.career ? (
        <Button
          label={career.ended ? t('career.over') : t('career.toOffseason')}
          variant="gold"
          onPress={() => { if (!career.ended) career.beginOffseason(); router.replace(career.ended ? '/career' : '/offseason'); }}
          testID="career-continue"
        />
      ) : null}
      {!g.career && <Button label={t('result.playAgain')} onPress={() => { if (g.crisis) g.newCrisis(g.poolId); else g.newRun(g.poolId); router.replace('/draft'); }} testID="play-again" />}
      <Button label={t('result.home')} variant="ghost" onPress={() => { g.quit(); goHome(); }} testID="go-home" />
    </Screen>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={styles.value}>{value}</Text>
      {sub && <Text style={styles.sub} numberOfLines={1}>{sub}</Text>}
      <Text style={styles.sub}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: S.xxl, gap: S.sm },
  trophy: { fontSize: 72 },
  outcome: { color: C.text, fontSize: 30, textAlign: 'center', ...F.display },
  verdict: { alignItems: 'center', gap: 4, marginTop: S.sm },
  verdictBig: { color: C.hardwood, fontSize: 22, textAlign: 'center', ...F.display },
  verdictSub: { color: C.muted, fontSize: 13, textAlign: 'center' },
  stats: { flexDirection: 'row' },
  value: { color: C.text, fontSize: 26, ...F.display },
  sub: { color: C.muted, fontSize: 12 },
  awardsTitle: { color: C.text, fontWeight: '900', fontSize: 15 },
  awardRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  awardName: { color: C.muted, fontSize: 12, flex: 1 },
  awardWinner: { color: C.text, fontWeight: '800', flex: 1, textAlign: 'right' },
});
