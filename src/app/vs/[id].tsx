import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { feel } from '../../audio/feel';
import { outcomeFor, sideOf, sideRoster, SIDE_COLORS, type Challenge } from '../../engine/friends/challenge';
import { answerChallenge, challengeLink, fetchChallenge, mySide, type Fail } from '../../net/duels';
import { allChallenges, useChallenges } from '../../store/challenges';
import { useFriends } from '../../store/friends';
import { useProfile } from '../../store/profile';
import { BackButton, Button, Display, Header, Label, Screen } from '../../ui/components';
import { FaceOff, ME_COLOR, MODE_LOOK, THEM_COLOR } from '../../ui/duelParts';
import { Confetti } from '../../ui/fx';
import { Icon } from '../../ui/icons';
import { goBack } from '../../ui/nav';
import { RosterBoard } from '../../ui/RosterBoard';
import { shareText } from '../../ui/share';
import { Text } from '../../ui/Text';
import { C, F, FONT, R, S } from '../../ui/theme';

/** While you wait on a friend, check every few seconds: the face-off appears the moment they accept. */
const WAIT_POLL_MS = 8_000;

/** One challenge, face to face: answer it, wait for it, or watch the series play out game by game. */
export default function VersusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const myPin = useFriends((s) => s.pin);
  const friends = useFriends((s) => s.friends);
  const me = useProfile();
  const stored = useChallenges((s) => (id ? s.byId[id] : undefined));
  const seen = useChallenges((s) => !!id && s.viewed.includes(id));
  const [loadError, setLoadError] = useState<Fail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState<string | null>(null);
  // How many games are on the board; a result you've already watched shows in full.
  const [shown, setShown] = useState<number | null>(null);
  const c: Challenge | undefined = stored ? allChallenges({ [stored.id]: stored })[0] : undefined;

  // Not on this device yet (a link): load it. Waiting on your friend: keep checking.
  useEffect(() => {
    if (!id) return;
    if (!stored) { void fetchChallenge(id).then((r) => { if (!r.ok) setLoadError(r.reason); }); return; }
    if (stored.status !== 'open' || stored.from !== myPin) return;
    const tick = setInterval(() => { void fetchChallenge(id); }, WAIT_POLL_MS);
    return () => clearInterval(tick);
  }, [id, stored, myPin]);

  if (!c) {
    return (
      <Screen tint={C.blue}>
        <Header title={t('vs.title')} left={<BackButton onPress={goBack} />} />
        <Text style={styles.center} testID="vs-loading">{loadError ? t(loadError === 'offline' ? 'vs.offline' : 'vs.notFound') : t('vs.loading')}</Text>
        {loadError && <Button label={t('vs.toDuels')} variant="secondary" onPress={() => router.replace('/duel')} />}
      </Screen>
    );
  }

  const side = sideOf(c, myPin);
  const mineIsA = side !== 'b';
  const mySideData = mineIsA ? c.a : c.b;
  const theirSide = mineIsA ? c.b : c.a;
  const theirPin = mineIsA ? c.to : c.from;
  const friend = friends.find((f) => f.pin === theirPin);
  const theirName = theirSide?.name ?? friend?.snap.name ?? t('vs.friend');
  const theirAvatar = theirSide?.avatar || friend?.snap.avatar || null;
  const myName = me.name || t('friends.you');
  const incoming = c.to === myPin;
  const look = MODE_LOOK[c.mode];

  // --- Settled: the series, game by game ----------------------------------------------------------
  if (c.status === 'done' && c.result) {
    const games = c.result.games.map(([a, b]) => (mineIsA ? [a, b] : [b, a]) as [number, number]);
    const n = shown ?? (seen ? games.length : 0);
    const onBoard = games.slice(0, n);
    const myWins = onBoard.filter(([x, y]) => x > y).length;
    const over = n >= games.length;
    const won = outcomeFor(c, myPin) === 'w';
    const finishReveal = () => { setShown(games.length); useChallenges.getState().view(c.id); feel(won ? 'fanfare' : 'buzzer'); };
    const next = () => {
      if (n + 1 >= games.length) return finishReveal();
      setShown(n + 1);
      feel(games[n][0] > games[n][1] ? 'swish' : 'tick');
    };
    const mine = mySideData && sideRoster(c.mode, mySideData, SIDE_COLORS[mineIsA ? 'a' : 'b']);
    const theirs = theirSide && sideRoster(c.mode, theirSide, SIDE_COLORS[mineIsA ? 'b' : 'a']);
    return (
      <Screen tint={over ? (won ? C.gold : C.blue) : look.color} overlay={over && won ? <Confetti /> : undefined}>
        <Header title={t('vs.title')} left={<BackButton onPress={goBack} />} />
        <FaceOff me={{ name: myName, avatar: me.avatarId }} them={{ name: theirName, avatar: theirAvatar }} wins={[myWins, onBoard.length - myWins]} mode={c.mode} testID="vs-faceoff" />
        <View style={{ gap: 6 }}>
          {onBoard.map(([x, y], i) => {
            const w = x > y;
            return (
              <View key={i} style={[styles.game, { borderColor: w ? ME_COLOR : THEM_COLOR }]} testID={`vs-game-${i}`}>
                <Text style={styles.gameNo}>G{i + 1}</Text>
                <Text style={[styles.score, w && { color: ME_COLOR }]}>{x}</Text>
                <Text style={styles.dash}>–</Text>
                <Text style={[styles.score, !w && { color: THEM_COLOR }]}>{y}</Text>
                <View style={[styles.dot, { backgroundColor: w ? ME_COLOR : THEM_COLOR }]} />
              </View>
            );
          })}
        </View>
        {!over ? (
          <>
            <Button label={t('friends.nextGame', { n: n + 1 })} icon={<Icon name="play" size={20} />} onPress={next} testID="vs-next" />
            <Button label={t('friends.simAll')} variant="ghost" onPress={finishReveal} testID="vs-sim" />
          </>
        ) : (
          <>
            <Display size={32} testID="vs-winner">{won ? t('friends.youWin', { w: Math.max(myWins, games.length - myWins), l: Math.min(myWins, games.length - myWins) }) : t('friends.winner', { name: theirName, w: games.length - myWins, l: myWins })}</Display>
            {friend && <Text style={styles.record} testID="vs-record">{t('friends.h2h')}: {t('friends.record', friend.record)}</Text>}
            <Button label={t('friends.rematch')} variant="gold" icon={<Icon name="swap" size={20} />} testID="vs-rematch"
              onPress={() => router.push({ pathname: '/challenge', params: { to: theirPin, mode: c.mode } })} />
            <Button label={t('vs.toDuels')} variant="ghost" onPress={() => router.replace('/duel')} />
            {mine && <><Label color={ME_COLOR}>{t('vs.yourTeam')}</Label><RosterBoard roster={mine.slots} color={ME_COLOR} /></>}
            {theirs && <><Label color={THEM_COLOR}>{t('vs.theirTeam', { name: theirName })}</Label><RosterBoard roster={theirs.slots} color={THEM_COLOR} /></>}
          </>
        )}
      </Screen>
    );
  }

  // --- Open, declined or expired ------------------------------------------------------------------
  const accept = async () => {
    setError(null);
    if (c.mode === 'draft') {
      // Draft from the same spins first; the face-off is played when your ten are in.
      useChallenges.getState().beginDraft({ seed: c.seed, id: c.id });
      router.push('/vs/draft');
      return;
    }
    const s = mySide(c.mode);
    if (!('code' in s)) return;
    setBusy(true);
    const r = await answerChallenge(c.id, true, s.code);
    setBusy(false);
    if (!r.ok) { setError(t(r.reason === 'expired' ? 'vs.expired' : r.reason === 'offline' ? 'vs.offline' : 'vs.failed', { name: theirName })); feel('buzzer'); return; }
    setShown(0);
    feel('crowd');
  };
  const decline = async () => {
    setBusy(true);
    const r = await answerChallenge(c.id, false);
    setBusy(false);
    if (!r.ok) setError(t('vs.offline'));
  };
  const share = async () => {
    const r = await shareText(t('vs.shareText', { mode: t(`vs.mode.${c.mode}`), link: challengeLink(c.id) }));
    if (r !== 'failed') setShared(t(`friends.${r}`));
  };
  const missing = incoming && c.mode !== 'draft' ? (() => { const s = mySide(c.mode); return 'missing' in s ? s.missing : null; })() : null;

  return (
    <Screen tint={look.color}>
      <Header title={t('vs.title')} left={<BackButton onPress={goBack} />} />
      <FaceOff me={{ name: myName, avatar: me.avatarId }} them={{ name: theirName, avatar: theirAvatar }} mode={c.mode} testID="vs-faceoff" />
      <Text style={styles.desc}>{t(`vs.desc.${c.mode}`)}{c.mode === 'clash' ? ` ${t('friends.bestOf', { n: c.bestOf })}.` : ''}</Text>
      {c.status === 'open' && incoming && (
        <>
          <Display size={28} testID="vs-incoming">{t('vs.incomingTitle', { name: theirName })}</Display>
          {missing && <Text style={styles.error}>{t(missing === 'lineup' ? 'friends.needLineup' : 'friends.needTeam')}</Text>}
          {error && <Text style={styles.error} testID="vs-error">{error}</Text>}
          <Button label={busy ? t('vs.sending') : t(c.mode === 'draft' ? 'vs.acceptDraft' : 'vs.accept')} icon={<Icon name="vs" size={24} />}
            onPress={accept} disabled={busy || !!missing} testID="vs-accept" />
          <Button label={t('vs.decline')} variant="ghost" onPress={decline} disabled={busy} testID="vs-decline" />
        </>
      )}
      {c.status === 'open' && !incoming && (
        <View style={styles.wait} testID="vs-waiting">
          <Text style={styles.waitTitle}>{t('vs.waiting', { name: theirName })}</Text>
          <Text style={styles.waitHint}>{t('vs.waitingHint')}</Text>
          <Button label={shared ?? t('vs.shareLink')} variant="dark" icon={<Icon name="share" size={20} />} onPress={share} testID="vs-share" />
        </View>
      )}
      {c.status === 'declined' && <Text style={styles.center} testID="vs-declined">{incoming ? t('vs.declinedYou') : t('vs.declined', { name: theirName })}</Text>}
      {c.status === 'expired' && <Text style={styles.center} testID="vs-expired">{t('vs.expired')}</Text>}
      {(c.status === 'declined' || c.status === 'expired') && (
        <Button label={t('vs.again')} variant="secondary" onPress={() => router.push({ pathname: '/challenge', params: { to: theirPin, mode: c.mode } })} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { color: C.text, fontSize: 16, textAlign: 'center', paddingVertical: S.lg },
  desc: { color: C.muted, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  error: { color: C.danger, fontWeight: '800', textAlign: 'center' },
  wait: { gap: S.sm, padding: S.md, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: 2, borderColor: C.line, borderBottomWidth: 5, borderBottomColor: C.edge },
  waitTitle: { ...F.condensed, fontSize: 22, color: C.text, textAlign: 'center' },
  waitHint: { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 19 },
  game: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 2, paddingHorizontal: S.md, paddingVertical: 8 },
  gameNo: { ...F.condensed, color: C.muted, width: 34, fontSize: 16 },
  score: { flex: 1, textAlign: 'center', fontFamily: FONT.condensed, fontSize: 26, color: C.text },
  dash: { color: C.muted, fontWeight: '900' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  record: { textAlign: 'center', color: C.muted, fontWeight: '800' },
});
