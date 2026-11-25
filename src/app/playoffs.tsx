import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { feel } from '../audio/feel';
import { CONFERENCES } from '../engine/conference';
import { champion, outInPlayIn, playInFor, seriesFor, seriesOver, seriesWinner, winnerOf, type PlayInGame, type Series } from '../engine/playoffs';
import { useGame } from '../store/game';
import { Button, Card, Display, Header, Label, Screen } from '../ui/components';
import { C, F, S } from '../ui/theme';
import { recap } from '../engine/story/recap';
import { RecapCard } from '../ui/story';
import { Icon } from '../ui/icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PlayoffBackdrop } from '../ui/SparkleBackdrop';

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
  // The story of your latest playoff game.
  const lastGame = mine?.series.games[mine.series.games.length - 1];
  const last = mine && lastGame ? (() => {
    const home = lastGame.homeIsHi ? mine.series.hi : mine.series.lo;
    const away = lastGame.homeIsHi ? mine.series.lo : mine.series.hi;
    const label = (i: number) => (i === 0 ? t('league.you') : ps.season.teams[i].name);
    return {
      names: [label(home), label(away)] as [string, string],
      you: (home === 0 ? 0 : 1) as 0 | 1,
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
    <Screen backdrop={<PlayoffBackdrop finals={ps.rounds.length === 4} />}>
      <Header title={ps.rounds.length === 4 ? t('playoffs.round3') : t('playoffs.title')} light />

      {!mine && <Text style={styles.big}>{outInPlayIn(ps, 0) ? t('playoffs.outPlayIn') : t('playoffs.missed')}</Text>}

      {playInFor(ps, 0).length > 0 && (
        <Card style={{ gap: S.sm }} testID="play-in">
          <Label color={C.hardwood}>{t('playoffs.playIn')}</Label>
          {playInFor(ps, 0).map((gm) => <PlayInLine key={gm.stage + gm.conf} g={gm} name={name} me={0} />)}
          {mine && <Text style={styles.status}>{t('playoffs.inVia', { n: mine.series.hi === 0 ? mine.series.seedHi : mine.series.seedLo })}</Text>}
        </Card>
      )}

      {mine && g.stake === null && mine.round === 0 && mine.series.games.length === 0 && (
        <Card style={styles.stake} testID="stake">
          <Display size={26}>{t('stake.title')}</Display>
          <Text style={styles.stakeBody}>{t('stake.body')}</Text>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <Button label={t('stake.snap')} variant="primary" icon={<Icon name="flame" size={22} />} onPress={() => { g.setStake('snap'); feel('crowd'); }} style={{ flex: 1 }} testID="stake-snap" />
            <Button label={t('stake.safe')} variant="secondary" onPress={() => g.setStake('safe')} style={{ flex: 1 }} testID="stake-safe" />
          </View>
        </Card>
      )}
      {g.stake === 'snap' && <View style={styles.snapBadge}><Icon name="flame" size={18} /><Text style={styles.snapText}>{t('stake.on')}</Text></View>}
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
              <RecapCard recap={last.recap} names={last.names} you={last.you} />
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

      <Button label={t('league.title')} icon={<Icon name="chart" size={22} />} variant="secondary" onPress={() => router.push('/league')} />
      {champ === null && (
        <Button label={t('playoffs.simRest')} variant="secondary" onPress={() => { g.simPlayoffs(); if (champion(useGame.getState().playoffs!) === 0) feel('fanfare'); }} testID="playoff-sim" />
      )}
      {finished && (
        <Button label={t('playoffs.seeResult')} variant="gold" onPress={() => { g.finish(); router.replace('/result'); }} testID="see-result" />
      )}

      {[...ps.rounds].reverse().map((round, ri) => {
        const r = ps.rounds.length - 1 - ri;
        const line = (s: Series, i: number) => (
          <Text key={i} style={[styles.bracket, (s.hi === 0 || s.lo === 0) && { color: '#FFFFFF', fontWeight: '900' }]}>
            ({s.seedHi}) {name(s.hi)} {s.winsHi}–{s.winsLo} {name(s.lo)} ({s.seedLo})
          </Text>
        );
        const confs = [0, 1].filter((c) => round.some((s) => s.conf === c));
        return (
          <View key={r} style={{ gap: 4 }}>
            <Label color="#FFC53D">{t(`playoffs.round${r}`)}</Label>
            {confs.length === 0 ? round.map(line) : confs.map((c) => (
              <View key={c} style={{ gap: 2 }}>
                <Text style={styles.confTag}>{t(`conf.${CONFERENCES[c]}`)}</Text>
                {round.filter((s) => s.conf === c).map(line)}
              </View>
            ))}
          </View>
        );
      })}
      {ps.playIn && (
        <View style={{ gap: 4 }}>
          <Label color="#FFC53D">{t('playoffs.playIn')}</Label>
          {[0, 1].map((c) => (
            <View key={c} style={{ gap: 2 }}>
              <Text style={styles.confTag}>{t(`conf.${CONFERENCES[c]}`)}</Text>
              {ps.playIn!.filter((g) => g.conf === c).map((gm) => <PlayInLine key={gm.stage} g={gm} name={name} />)}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

/** One play-in game: "(7) Home 112–104 Away (8)", winner in bold; from your side (W/L) when `me` is given. */
function PlayInLine({ g, name, me }: { g: PlayInGame; name: (i: number) => string; me?: number }) {
  const { t } = useTranslation();
  const ot = g.result.ot ? ` (${g.result.ot}OT)` : '';
  if (me !== undefined) {
    const home = g.home === me;
    const won = winnerOf(g) === me;
    const us = home ? g.result.homeScore : g.result.awayScore;
    const them = home ? g.result.awayScore : g.result.homeScore;
    return (
      <View>
        <Text style={styles.stage}>{t(`playoffs.stage_${g.stage}`)}</Text>
        <Text style={[styles.gameLine, { color: won ? C.neon : C.danger }]}>
          {won ? 'W' : 'L'} {us}-{them}{ot}  {home ? t('season.vs') : t('season.at')} {name(home ? g.away : g.home)}
        </Text>
      </View>
    );
  }
  const homeWon = winnerOf(g) === g.home;
  return (
    <Text style={[styles.bracket, (g.home === 0 || g.away === 0) && { color: '#FFFFFF' }]}>
      <Text style={homeWon ? styles.win : undefined}>({g.seedHome}) {name(g.home)}</Text> {g.result.homeScore}–{g.result.awayScore}{ot}{' '}
      <Text style={!homeWon ? styles.win : undefined}>{name(g.away)} ({g.seedAway})</Text>
    </Text>
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
  stake: { gap: S.sm, alignItems: 'center', borderColor: C.hardwood, borderBottomColor: '#C2500A', backgroundColor: '#FFF1E3' },
  stakeBody: { color: C.ink, fontWeight: '700', textAlign: 'center' },
  snapBadge: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6, backgroundColor: C.hardwood, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 4 },
  snapText: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 1 },
  big: { color: '#FFFFFF', fontSize: 20, textAlign: 'center', ...F.display },
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
  bracket: { color: '#C9C2D6', fontSize: 13 },
  confTag: { color: C.hardwood, fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  stage: { color: C.muted, fontSize: 11, fontWeight: '800' },
  win: { fontWeight: '900' },
  recap: { gap: S.sm, borderTopWidth: 1, borderTopColor: C.line, paddingTop: S.md },
});
