import { HistoryGate } from '../ui/HistoryGate';
import { modeNeedsHistory } from '../data/historyReady';
import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { MODE_BY_ID } from '../data/modes';
import { parseChallenge } from '../engine/share';
import { useGame } from '../store/game';
import { useFriends } from '../store/friends';
import { useForm } from '../store/form';
import { raceOutcome } from '../engine/friends/match';
import { BrandLogo } from '../ui/BrandLogo';
import { Button, Card, Display, Screen } from '../ui/components';
import { Icon } from '../ui/icons';
import { goHome } from '../ui/nav';
import { Text } from '../ui/Text';
import { C, FONT, S } from '../ui/theme';

/** A friend's "beat my draft" link: same spins, their record to beat. */
function ChallengeScreen() {
  const { t } = useTranslation();
  const formDay = useForm((s) => s.day);
  const params = useLocalSearchParams();
  const c = parseChallenge(params);
  const mode = c ? MODE_BY_ID[c.poolId] : undefined;
  // Their reply to a race you already ran: settle it (once) instead of replaying the same spins.
  const mine = c ? useFriends.getState().races[c.seed] : undefined;
  const outcome = c && mine ? raceOutcome({ w: mine.w, depth: c.depth === undefined ? 0 : mine.depth }, { w: c.w, depth: c.depth ?? 0 }) : null;
  useEffect(() => {
    if (c?.pin && mine && outcome) useFriends.getState().settle(c.seed, c.pin, outcome, `${mine.w}-${c.w}`);
  }, [c?.seed, c?.pin, mine, outcome]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!c || !mode) {
    return (
      <Screen>
        <View style={styles.wrap}>
          <BrandLogo />
          <Text style={styles.body}>{t('challenge.invalid')}</Text>
          <Button label={t('result.home')} variant="dark" onPress={goHome} />
        </View>
      </Screen>
    );
  }

  if (mine && outcome) {
    const color = outcome === 'w' ? '#14A86B' : outcome === 'l' ? C.danger : C.muted;
    return (
      <Screen tint={color}>
        <View style={styles.wrap}>
          <Card style={styles.card}>
            <Icon name={outcome === 'w' ? 'crown' : 'vs'} size={72} />
            <Display size={30} testID="race-outcome">{t(outcome === 'w' ? 'challenge.won' : outcome === 'l' ? 'challenge.lost' : 'challenge.tied', { name: c.name })}</Display>
            <Text style={[styles.record, { color }]}>{mine.w}-{mine.l}</Text>
            <Text style={styles.mode}>vs {c.w}-{c.l}</Text>
            {c.pin && useFriends.getState().friends.some((f) => f.pin === c.pin) && (
              <Button label={t('friends.back', { name: c.name })} variant="dark" onPress={() => router.replace({ pathname: '/friends/[pin]', params: { pin: c.pin! } })} />
            )}
          </Card>
          <Button label={t('result.home')} variant="ghost" onPress={goHome} />
        </View>
      </Screen>
    );
  }

  const accept = () => {
    useGame.getState().newChallenge(c.poolId, c.seed, { name: c.name, w: c.w, l: c.l, pin: c.pin, depth: c.depth, fair: c.fair, formDay: c.formDay });
    router.replace('/draft');
  };

  return (
    <Screen tint={mode.colors[0]}>
      <View style={styles.wrap}>
        <BrandLogo scale={0.9} />
        <Card style={styles.card}>
          <Icon name="vs" size={64} />
          <Display size={30}>{t('challenge.title', { name: c.name })}</Display>
          <Text style={styles.record} testID="challenge-record">{c.w}-{c.l}</Text>
          <Text style={styles.mode}>{mode.title}</Text>
          <Text style={styles.body}>{t(c.fair ? 'challenge.body' : 'challenge.bodyOld')}</Text>
          {c.formDay && formDay && c.formDay !== formDay ? <Text style={styles.note} testID="ratings-moved">{t('challenge.ratingsMoved', { name: c.name, day: c.formDay })}</Text> : null}
          <Button label={t('challenge.accept')} onPress={accept} testID="challenge-accept" icon={<Icon name="play" size={22} />} />
        </Card>
        <Button label={t('result.home')} variant="ghost" onPress={goHome} />
      </View>
    </Screen>
  );
}

/** A link to an era, All-Time or a franchise waits for the full history first. */
export default function Challenge() {
  const c = parseChallenge(useLocalSearchParams());
  return <HistoryGate when={modeNeedsHistory(c?.poolId)}><ChallengeScreen /></HistoryGate>;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', gap: S.lg, paddingVertical: S.xl },
  card: { alignItems: 'center', gap: S.sm },
  record: { fontFamily: FONT.display, fontSize: 56, color: C.text },
  mode: { fontWeight: '900', color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
  body: { color: C.muted, fontWeight: '700', textAlign: 'center' },
  note: { color: C.gold, fontWeight: '700', fontSize: 13, textAlign: 'center' },
});
