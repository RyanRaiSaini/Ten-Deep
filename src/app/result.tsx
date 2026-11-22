import { Redirect, router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { feel } from '../audio/feel';
import { champion, seriesFor, seriesWinner } from '../engine/playoffs';
import { standings } from '../engine/season';
import { ALL_SLOTS } from '../engine/types';
import { useGame } from '../store/game';
import { goHome } from '../ui/nav';
import { Button, Card, Screen } from '../ui/components';
import { RosterBoard } from '../ui/RosterBoard';
import { C, F, S } from '../ui/theme';

export default function Result() {
  const { t } = useTranslation();
  const g = useGame();
  const ps = g.playoffs;
  const won = !!ps && champion(ps) === 0;
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
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.trophy}>{won ? '🏆' : mine ? '🏀' : '📉'}</Text>
        <Text style={[styles.outcome, won && { color: C.gold }]}>{outcome}</Text>
      </View>
      <Card style={styles.stats}>
        <Stat label={t('result.record')} value={`${rec.w}-${rec.l}`} />
        <Stat label={t('result.seed')} value={`#${seed}`} />
        {top && <Stat label={t('result.topScorer')} value={`${(top.tot.pts / top.tot.gp).toFixed(1)}`} sub={top.p.name} />}
      </Card>
      <RosterBoard roster={user.slots} />
      <Button label={t('result.playAgain')} onPress={() => { g.newRun(g.poolId); router.replace('/draft'); }} testID="play-again" />
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
  stats: { flexDirection: 'row' },
  value: { color: C.text, fontSize: 26, ...F.display },
  sub: { color: C.muted, fontSize: 12 },
});
