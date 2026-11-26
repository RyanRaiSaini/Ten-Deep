import { HistoryGate } from '../ui/HistoryGate';
import { runNeedsHistory } from '../data/historyReady';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { AWARDS, awardRace, leaders, type LeaderStat, type Ranked } from '../engine/story/leaders';
import { CONFERENCES } from '../engine/conference';
import { confStandings, divisionLeaders, standings, type SeasonState } from '../engine/season';
import { useGame } from '../store/game';
import { BackButton, Card, Header, Label, Screen, Segmented } from '../ui/components';
import { useRunColors } from '../ui/runColors';
import { C, F, S } from '../ui/theme';
import { goBack } from '../ui/nav';

const STATS: LeaderStat[] = ['pts', 'reb', 'ast'];

/** League leaders and the award races, live during the season and final afterwards. */
function LeagueScreen() {
  const { t } = useTranslation();
  const runColors = useRunColors();
  const [tab, setTab] = useState<'standings' | 'leaders' | 'awards'>('standings');
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
      <Segmented options={['standings', 'leaders', 'awards'] as const} value={tab} onChange={setTab} format={(o) => t(`league.${o}`)} />
      {tab === 'standings' && <Standings season={season} team={team} />}
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

/** Each conference's table (one table in an older save): top 6 in, 7 to 10 play in, ★ division leaders. */
function Standings({ season, team }: { season: SeasonState; team: (i: number) => string }) {
  const { t } = useTranslation();
  const leaders = divisionLeaders(season);
  const tables = season.divs
    ? ([0, 1] as const).map((c) => ({ title: t(`conf.${CONFERENCES[c]}`), rows: confStandings(season, c), cut: [6, 10] }))
    : [{ title: t('league.standings'), rows: standings(season), cut: [16] }];
  return (
    <>
      {season.divs && <Text style={styles.legend}>{t('league.legend')}</Text>}
      {tables.map((tb) => (
        <Card key={tb.title} style={{ gap: 2 }} testID="standings">
          <Label color={C.hardwood}>{tb.title}</Label>
          {tb.rows.map((r, i) => (
            <View key={r.team} style={[styles.row, styles.tableRow, tb.cut.includes(i) && styles.cut, r.team === 0 && styles.me]}>
              <Text style={styles.rank}>{i + 1}</Text>
              <Text style={[styles.name, { flex: 1 }, r.team === 0 && { color: C.hardwood }]} numberOfLines={1}>
                {team(r.team)}{leaders.has(r.team) ? ' ★' : ''}
              </Text>
              <Text style={styles.wl}>{r.w}-{r.l}</Text>
            </View>
          ))}
        </Card>
      ))}
    </>
  );
}


/** Waits for the full history when this run needs it (an era, All-Time, a franchise, Crisis, Career). */
export default function League() {
  const needs = useGame((s) => runNeedsHistory(s));
  return <HistoryGate when={needs}><LeagueScreen /></HistoryGate>;
}

const styles = StyleSheet.create({
  tableRow: { paddingVertical: 4, paddingHorizontal: 4, borderRadius: 8 },
  cut: { borderTopWidth: 2, borderTopColor: C.line, borderStyle: 'dashed', marginTop: 4, paddingTop: 6 },
  me: { backgroundColor: '#FFF1E3' },
  wl: { color: C.text, fontSize: 15, ...F.display, minWidth: 48, textAlign: 'right' },
  legend: { color: C.muted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  rank: { color: C.muted, width: 18, fontWeight: '900' },
  name: { color: C.text, fontWeight: '800' },
  team: { color: C.muted, fontSize: 12 },
  value: { color: C.text, fontSize: 15, ...F.display },
  none: { color: C.muted },
});
