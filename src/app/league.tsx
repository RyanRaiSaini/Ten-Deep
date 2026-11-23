import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { AWARDS, awardRace, leaders, type LeaderStat, type Ranked } from '../engine/story/leaders';
import { useGame } from '../store/game';
import { BackButton, Card, Header, Label, Screen, Segmented } from '../ui/components';
import { useRunColors } from '../ui/runColors';
import { C, F, S } from '../ui/theme';
import { goBack } from '../ui/nav';

const STATS: LeaderStat[] = ['pts', 'reb', 'ast'];

/** League leaders and the award races, live during the season and final afterwards. */
export default function League() {
  const { t } = useTranslation();
  const runColors = useRunColors();
  const [tab, setTab] = useState<'leaders' | 'awards'>('leaders');
  const season = useGame((s) => s.playoffs?.season ?? s.season);
  if (!season) return null;
  const team = (i: number) => (i === 0 ? t('league.you') : season.teams[i].name);

  const list = (rows: Ranked[], fmt: (r: Ranked) => string) =>
    rows.length === 0 ? <Text style={styles.none}>{t('league.none')}</Text> : rows.map((r, i) => (
      <View key={r.player.id} style={styles.row}>
        <Text style={styles.rank}>{i + 1}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, r.team === 0 && { color: C.hardwood }]} numberOfLines={1}>{r.player.name}</Text>
          <Text style={styles.team} numberOfLines={1}>{team(r.team)}</Text>
        </View>
        <Text style={styles.value}>{fmt(r)}</Text>
      </View>
    ));

  const line = (r: Ranked) => t('league.line', { p: r.ppg.toFixed(1), r: r.rpg.toFixed(1), a: r.apg.toFixed(1) });

  return (
    <Screen tint={runColors[0]}>
      <Header title={t('league.title')} left={<BackButton onPress={() => goBack()} />} />
      <Segmented options={['leaders', 'awards'] as const} value={tab} onChange={setTab} format={(o) => t(`league.${o}`)} />
      {tab === 'leaders' && STATS.map((st) => (
        <Card key={st} style={{ gap: S.sm }} testID={`leaders-${st}`}>
          <Label color={C.hardwood}>{t(`league.${st}`)}</Label>
          {list(leaders(season, st, 5), (r) => (st === 'pts' ? r.ppg : st === 'reb' ? r.rpg : r.apg).toFixed(1))}
        </Card>
      ))}
      {tab === 'awards' && AWARDS.map((a) => (
        <Card key={a} style={{ gap: S.sm }} testID={`award-${a}`}>
          <Label color={C.gold}>{t(`league.${a}`)}</Label>
          {list(awardRace(season, a, 5), line)}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  rank: { color: C.muted, width: 18, fontWeight: '900' },
  name: { color: C.text, fontWeight: '800' },
  team: { color: C.muted, fontSize: 12 },
  value: { color: C.text, fontSize: 15, ...F.display },
  none: { color: C.muted },
});
