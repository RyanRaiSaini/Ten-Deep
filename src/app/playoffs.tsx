import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { feel } from '../audio/feel';
import { champion, seriesFor, seriesOver, seriesWinner, type Series } from '../engine/playoffs';
import { useGame } from '../store/game';
import { Button, Card, Header, Label, Screen } from '../ui/components';
import { C, F, S } from '../ui/theme';

export default function Playoffs() {
  const { t } = useTranslation();
  const g = useGame();
  const ps = g.playoffs;
  if (!ps) return <Redirect href="/" />;

  const name = (i: number) => (i === 0 ? 'You' : ps.season.teams[i].name);
  const mine = seriesFor(ps, 0);
  const champ = champion(ps);
  const alive = !!mine && (!seriesOver(mine.series) || seriesWinner(mine.series) === 0) && mine.round === ps.rounds.length - 1;
  const finished = champ !== null || !alive;

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
    <Screen>
      <Header title={t('playoffs.title')} />

      {!mine && <Text style={styles.big}>{t('playoffs.missed')}</Text>}

      {mine && (
        <Card style={{ gap: S.md }}>
          <Label color={C.hardwood}>{t(`playoffs.round${mine.round}`)}</Label>
          <View style={styles.matchup}>
            <Team name={name(mine.series.hi)} seed={mine.series.seedHi} wins={mine.series.winsHi} me={mine.series.hi === 0} />
            <Text style={styles.vs}>vs</Text>
            <Team name={name(mine.series.lo)} seed={mine.series.seedLo} wins={mine.series.winsLo} me={mine.series.lo === 0} />
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
          {alive && champ === null && (
            <Button label={t('playoffs.next', { n: mine.series.games.length + 1 })} onPress={nextGame} testID="playoff-next" />
          )}
          {!alive && champ === null && <Text style={styles.status}>{t('playoffs.eliminated')}</Text>}
        </Card>
      )}

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

function Team({ name, seed, wins, me }: { name: string; seed: number; wins: number; me: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={[styles.wins, me && { color: C.hardwood }]}>{wins}</Text>
      <Text style={styles.team} numberOfLines={2}>{name}</Text>
      <Text style={styles.seed}>#{seed}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  big: { color: C.text, fontSize: 20, textAlign: 'center', ...F.display },
  matchup: { flexDirection: 'row', alignItems: 'center' },
  vs: { color: C.muted, fontWeight: '800' },
  wins: { color: C.text, fontSize: 48, ...F.display },
  team: { color: C.text, fontWeight: '800', textAlign: 'center' },
  seed: { color: C.muted, fontSize: 12 },
  status: { color: C.text, textAlign: 'center', fontWeight: '700' },
  gameLine: { fontWeight: '700' },
  bracket: { color: C.muted, fontSize: 13 },
});
