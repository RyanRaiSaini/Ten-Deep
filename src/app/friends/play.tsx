import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { feel } from '../../audio/feel';
import { lineupRoster, cardLevel } from '../../engine/collect/lineup';
import { BEST_OF, friendLineupRoster, friendSeries, teamRoster, type BestOf } from '../../engine/friends/match';
import { useCollection } from '../../store/collection';
import { useFriends } from '../../store/friends';
import { useProfile } from '../../store/profile';
import { Avatar } from '../../ui/Avatar';
import { BackButton, Button, Display, Header, Screen } from '../../ui/components';
import { Confetti } from '../../ui/fx';
import { Icon } from '../../ui/icons';
import { goBack } from '../../ui/nav';
import { Text } from '../../ui/Text';
import { C, FONT, R, S } from '../../ui/theme';

const ME: [string, string] = ['#FF7417', '#17121E'];
const THEM: [string, string] = ['#3B6CF0', '#17121E'];

/**
 * A series against a friend's team. The whole series is simulated (and counted) as soon as it starts, then
 * revealed game by game, so backing out of a losing series doesn't dodge the loss.
 */
export default function FriendPlay() {
  const { pin, mode = 'clash', n = '3' } = useLocalSearchParams<{ pin: string; mode?: 'clash' | 'finals'; n?: string }>();
  const { t } = useTranslation();
  const f = useFriends((s) => s.friends.find((x) => x.pin === pin));
  const myTeam = useFriends((s) => s.lastTeam);
  const me = useProfile();
  const [round, setRound] = useState(0);
  const [shown, setShown] = useState(0);
  const counted = useRef(-1);
  const [visit] = useState(() => Date.now().toString(36));
  const bestOf = (BEST_OF.includes(Number(n) as BestOf) ? Number(n) : 3) as BestOf;

  const series = useMemo(() => {
    if (!f) return null;
    const myName = me.name || t('friends.you');
    const seed = `${mode}:${f.pin}:${visit}:${round}`;
    if (mode === 'finals') {
      if (!myTeam || !f.snap.team) return null;
      return friendSeries(teamRoster(myTeam.players, 'me', myName, ME), teamRoster(f.snap.team.players, `friend-${f.pin}`, f.snap.name, THEM), 7, seed);
    }
    const col = useCollection.getState();
    const levels = Object.fromEntries(Object.entries(col.owned).map(([id, o]) => [id, cardLevel(o.count)]));
    return friendSeries({ ...lineupRoster(col.lineup, levels), name: myName, colors: ME }, friendLineupRoster(f.snap, THEM), bestOf, seed);
    // A new series only on mount or rematch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Count the result the moment the series exists.
  useEffect(() => {
    if (!series || !f || counted.current === round) return;
    counted.current = round;
    useFriends.getState().result(f.pin, mode, series.winner === 'a' ? 'w' : 'l', `${series.winsA}-${series.winsB}`);
  }, [series, f, mode, round]);

  if (!f || !series) return <Screen><Header title={t('friends.title')} left={<BackButton onPress={goBack} />} /></Screen>;
  const games = series.games.slice(0, shown);
  const wa = games.filter((g) => g.scoreA > g.scoreB).length;
  const wb = games.length - wa;
  const over = shown >= series.games.length;
  const won = series.winner === 'a';

  const next = () => {
    const g = series.games[shown];
    setShown(shown + 1);
    feel(shown + 1 >= series.games.length ? (won ? 'fanfare' : 'buzzer') : g.scoreA > g.scoreB ? 'swish' : 'tick');
  };

  return (
    <Screen tint={mode === 'finals' ? C.gold : C.purple} overlay={over && won ? <Confetti /> : undefined}>
      <Header title={mode === 'finals' ? t('friends.finals') : `${t('friends.clash')} · ${t('friends.bestOf', { n: bestOf })}`} left={<BackButton onPress={goBack} />} />
      <View style={styles.board}>
        <Side avatar={me.avatarId} name={me.name || t('friends.you')} wins={wa} color={ME[0]} />
        <Icon name="vs" size={54} />
        <Side avatar={f.snap.avatar} name={f.snap.name} wins={wb} color={THEM[0]} />
      </View>
      <View style={{ gap: 6 }}>
        {games.map((g, i) => {
          const mine = g.scoreA > g.scoreB;
          return (
            <View key={i} style={[styles.game, { borderColor: mine ? ME[0] : THEM[0] }]} testID={`fgame-${i}`}>
              <Text style={styles.gameNo}>G{i + 1}</Text>
              <Text style={[styles.score, mine && { color: ME[0] }]}>{g.scoreA}</Text>
              <Text style={styles.dash}>–</Text>
              <Text style={[styles.score, !mine && { color: THEM[0] }]}>{g.scoreB}</Text>
              <View style={[styles.dot, { backgroundColor: mine ? ME[0] : THEM[0] }]} />
            </View>
          );
        })}
      </View>
      {!over ? (
        <>
          <Button label={t('friends.nextGame', { n: shown + 1 })} onPress={next} icon={<Icon name="play" size={20} />} testID="fnext" />
          <Button label={t('friends.simAll')} variant="ghost" onPress={() => { setShown(series.games.length); feel(won ? 'fanfare' : 'buzzer'); }} testID="fsim" />
        </>
      ) : (
        <>
          <Display size={32} testID="fwinner">{won ? t('friends.youWin', { w: series.winsA, l: series.winsB }) : t('friends.winner', { name: f.snap.name, w: series.winsB, l: series.winsA })}</Display>
          <Text style={styles.record}>{t('friends.h2h')}: {t('friends.record', f.record)}</Text>
          <Button label={t('friends.rematch')} variant="gold" icon={<Icon name="swap" size={20} />} onPress={() => { setShown(0); setRound(round + 1); }} testID="frematch" />
          <Button label={t('friends.back', { name: f.snap.name })} variant="ghost" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}

function Side({ avatar, name, wins, color }: { avatar: string; name: string; wins: number; color: string }) {
  return (
    <View style={styles.side}>
      <View style={[styles.ring, { borderColor: color }]}><Avatar id={avatar} size={64} /></View>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <Text style={[styles.wins, { color }]}>{wins}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 2.5, borderColor: C.ink, borderBottomWidth: 7, padding: S.md },
  side: { flex: 1, alignItems: 'center', gap: 2 },
  ring: { borderRadius: 40, borderWidth: 4, backgroundColor: C.surface2 },
  name: { fontWeight: '900', color: C.ink, fontSize: 15, maxWidth: 130 },
  wins: { fontFamily: FONT.display, fontSize: 52, lineHeight: 56 },
  game: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: '#FFFFFF', borderRadius: R.md, borderWidth: 2, paddingHorizontal: S.md, paddingVertical: 8 },
  gameNo: { fontWeight: '900', color: C.muted, width: 34 },
  score: { flex: 1, textAlign: 'center', fontFamily: FONT.display, fontSize: 24, color: C.ink },
  dash: { color: C.muted, fontWeight: '900' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  record: { textAlign: 'center', color: C.muted, fontWeight: '800' },
});
