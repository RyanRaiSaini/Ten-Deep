import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { feel } from '../audio/feel';
import { champion, seriesFor, seriesOver, seriesWinner, type Series } from '../engine/playoffs';
import { useGame } from '../store/game';
import { Button, Card, Header, Label, Screen } from '../ui/components';
import { C, F, S } from '../ui/theme';
import { useRunColors } from '../ui/runColors';
import { recap } from '../engine/story/recap';
import { RecapCard } from '../ui/story';
import { Icon } from '../ui/icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function Playoffs() {
  const { t } = useTranslation();
  const runColors = useRunColors();
  const g = useGame();
  const ps = g.playoffs;
  if (!ps) return <Redirect href="/" />;

  const name = (i: number) => (i === 0 ? 'You' : ps.season.teams[i].name);
  const mine = seriesFor(ps, 0);
  const champ = champion(ps);
  const alive = !!mine && (!seriesOver(mine.series) || seriesWinner(mine.series) === 0) && mine.round === ps.rounds.length - 1;
  const finished = champ !== null || !alive;
  // The story of your latest playoff game.
  const lastGame = mine?.series.games[mine.series.games.length - 1];
  const last = mine && lastGame ? (() => {
    const home = lastGame.homeIsHi ? mine.series.hi : mine.series.lo;
    const away = lastGame.homeIsHi ? mine.series.lo : mine.series.hi;
    const label = (i: number) => (i === 0 ? t('league.you') : ps.season.teams[i].name);
    return {
      names: [label(home), label(away)] as [string, string],
      recap: recap(lastGame.result, ps.season.teams[home], ps.season.teams[away], `${ps.season.seed}:${mine.round}:${mine.series.games.length}`),
    };
  })() : null;

  const nextGame = () => {
    g.playoffGame();
    const after = useGame.getState().playoffs!;
    const s = seriesFor(after, 0);
    if (champion(after) === 0) feel('fanfare');
    else if (s && seriesOver(s.series)) feel(seriesWinner(s.series) === 0 ? 'crowd' : 'buzzer');
    else feel('swish');
  };

  const status = (s: Series) => {
    const [a, b] = [s.winsHi, s.winsLo];
    if (seriesOver(s)) return t('playoffs.won', { team: name(seriesWinner(s)!), w: Math.max(a, b), l: Math.min(a, b) });
    if (a === b) return t('playoffs.tied', { w: a, l: b });
    return t('playoffs.leads', { team: name(a > b ? s.hi : s.lo), w: Math.max(a, b), l: Math.min(a, b) });
  };

  return (
    <Screen tint={runColors[0]}>
      <Header title={t('playoffs.title')} />

      {!mine && <Text style={styles.big}>{t('playoffs.missed')}</Text>}

      {mine && (
        <Card style={{ gap: S.md }}>
          <Label color={C.hardwood}>{t(`playoffs.round${mine.round}`)}</Label>
          <View style={styles.matchup}>
            <LinearGradient colors={['#1B1626', '#2A2140']} style={StyleSheet.absoluteFill} />
            <Team name={name(mine.series.hi)} seed={mine.series.seedHi} wins={mine.series.winsHi} me={mine.series.hi === 0} color={ps.season.teams[mine.series.hi].colors[0]} />
            <View style={styles.vsBadge}><Icon name="vs" size={46} /></View>
            <Team name={name(mine.series.lo)} seed={mine.series.seedLo} wins={mine.series.winsLo} me={mine.series.lo === 0} color={ps.season.teams[mine.series.lo].colors[0]} />
          </View>
          <Text style={styles.status}>{status(mine.series)}</Text>
          {mine.series.games.map((gm, i) => {
            const hiScore = gm.homeIsHi ? gm.result.homeScore : gm.result.awayScore;
            const loScore = gm.homeIsHi ? gm.result.awayScore : gm.result.homeScore;
            const meHi = mine.series.hi === 0;
            const us = meHi ? hiScore : loScore;
            const them = meHi ? loScore : hiScore;
            return (
              <Text key={i} style={[styles.gameLine, { color: us > them ? C.neon : C.danger }]}>
                G{i + 1}  {us > them ? 'W' : 'L'} {us}-{them}{gm.result.ot ? ` (${gm.result.ot}OT)` : ''}
              </Text>
            );
          })}
          {last && (
            <View style={styles.recap}>
              <Label>{t('recap.title')} · G{mine.series.games.length}</Label>
              <RecapCard recap={last.recap} names={last.names} />
            </View>
          )}
          {alive && champ === null && (
            <Button
              label={seriesOver(mine.series) ? t('common.continue') : t('playoffs.next', { n: mine.series.games.length + 1 })}
              onPress={nextGame}
              testID="playoff-next"
            />
          )}
          {!alive && champ === null && <Text style={styles.status}>{t('playoffs.eliminated')}</Text>}
        </Card>
      )}

      <Button label={t('league.title')} icon={<Icon name="chart" size={22} />} variant="ghost" onPress={() => router.push('/league')} />
      {champ === null && (
        <Button label={t('playoffs.simRest')} variant="secondary" onPress={() => { g.simPlayoffs(); if (champion(useGame.getState().playoffs!) === 0) feel('fanfare'); }} testID="playoff-sim" />
      )}
      {finished && (
        <Button label={t('playoffs.seeResult')} variant="gold" onPress={() => { g.finish(); router.replace('/result'); }} testID="see-result" />
      )}

      {ps.rounds.map((round, r) => (
        <View key={r} style={{ gap: 4 }}>
          <Label>{t(`playoffs.round${r}`)}</Label>
          {round.map((s, i) => (
            <Text key={i} style={[styles.bracket, (s.hi === 0 || s.lo === 0) && { color: C.text }]}>
              ({s.seedHi}) {name(s.hi)} {s.winsHi}–{s.winsLo} {name(s.lo)} ({s.seedLo})
            </Text>
          ))}
        </View>
      ))}
    </Screen>
  );
}

function Team({ name, seed, wins, me, color }: { name: string; seed: number; wins: number; me: boolean; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4, paddingVertical: S.md }}>
      <View style={[styles.teamBar, { backgroundColor: color }]} />
      <Text style={[styles.wins, { color: me ? '#FFC53D' : '#FFFFFF' }]}>{wins}</Text>
      <Text style={styles.team} numberOfLines={2}>{name}</Text>
      <View style={styles.seedPill}><Text style={styles.seed}>#{seed}</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  big: { color: C.text, fontSize: 20, textAlign: 'center', ...F.display },
  matchup: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: C.ink },
  vsBadge: { marginHorizontal: -8 },
  teamBar: { position: 'absolute', top: 0, left: 8, right: 8, height: 6, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  seedPill: { backgroundColor: '#3A3050', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  vs: { color: C.muted, fontWeight: '800' },
  wins: { fontSize: 56, ...F.display },
  team: { color: '#FFFFFF', fontWeight: '900', textAlign: 'center' },
  seed: { color: '#D9D2E8', fontSize: 12, fontWeight: '900' },
  status: { color: C.text, textAlign: 'center', fontWeight: '700' },
  gameLine: { fontWeight: '700' },
  bracket: { color: C.muted, fontSize: 13 },
  recap: { gap: S.sm, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
});
