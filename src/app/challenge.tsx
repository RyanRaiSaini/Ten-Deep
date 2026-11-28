import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { feel } from '../audio/feel';
import { CHALLENGE_MODES, type ChallengeMode } from '../engine/friends/challenge';
import { BEST_OF, type BestOf } from '../engine/friends/match';
import { duelSeed, mySide, sendChallenge, type Fail } from '../net/duels';
import { useChallenges } from '../store/challenges';
import { useFriends } from '../store/friends';
import { Avatar } from '../ui/Avatar';
import { BackButton, Button, Header, Label, Screen, Segmented } from '../ui/components';
import { FormatTile, MODE_LOOK } from '../ui/duelParts';
import { Icon } from '../ui/icons';
import { goBack } from '../ui/nav';
import { Text } from '../ui/Text';
import { C, F, R, S } from '../ui/theme';

/** The challenge page: pick a friend, pick a format, send it. A draft duel drafts your team first. */
export default function NewChallenge() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ to?: string; mode?: string }>();
  const friends = useFriends((s) => s.friends);
  const [to, setTo] = useState<string | null>(params.to && friends.some((f) => f.pin === params.to) ? params.to : friends.length === 1 ? friends[0].pin : null);
  const [mode, setMode] = useState<ChallengeMode>(CHALLENGE_MODES.includes(params.mode as ChallengeMode) ? (params.mode as ChallengeMode) : 'draft');
  const [bestOf, setBestOf] = useState<BestOf>(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const friend = friends.find((f) => f.pin === to) ?? null;

  const lockedFor = (m: ChallengeMode): string | null => {
    if (m === 'draft') return null;
    const side = mySide(m);
    return 'missing' in side ? t(side.missing === 'lineup' ? 'friends.needLineup' : 'friends.needTeam') : null;
  };
  const failText = (r: Fail) => t(r === 'no-friend' ? 'vs.noFriend' : r === 'rate-limited' ? 'vs.slowDown' : r === 'offline' ? 'vs.offline' : 'vs.failed', { name: friend?.snap.name ?? '' });

  const send = async () => {
    if (!friend || lockedFor(mode)) return;
    setError(null);
    if (mode === 'draft') {
      // Draft first: the challenge goes out with your team once it's complete.
      useChallenges.getState().beginDraft({ seed: duelSeed(), to: friend.pin });
      router.push('/vs/draft');
      return;
    }
    const side = mySide(mode);
    if (!('code' in side)) return;
    setBusy(true);
    const r = await sendChallenge(friend.pin, mode, bestOf, side.code, duelSeed());
    setBusy(false);
    if (!r.ok) { setError(failText(r.reason)); feel('buzzer'); return; }
    feel('pickChime');
    router.replace({ pathname: '/vs/[id]', params: { id: r.data.id } });
  };

  return (
    <Screen tint={C.blue}>
      <Header title={t('vs.newTitle')} left={<BackButton onPress={goBack} />} />
      {friends.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="friends" size={72} />
          <Text style={styles.emptyText}>{t('vs.noFriends')}</Text>
          <Button label={t('friends.add')} variant="green" icon={<Icon name="plus" size={20} />} onPress={() => router.push('/friends/add')} testID="challenge-add-friend" />
        </View>
      ) : (
        <>
          <Label>{t('vs.pickFriend')}</Label>
          <View style={{ gap: S.sm }}>
            {friends.map((f) => {
              const on = f.pin === to;
              return (
                <Pressable key={f.pin} onPress={() => setTo(f.pin)} testID={`pick-${f.pin}`} accessibilityRole="radio" accessibilityState={{ selected: on }}
                  style={[styles.friend, on && styles.friendOn]}>
                  <Avatar id={f.snap.avatar} size={44} />
                  <Text style={styles.friendName} numberOfLines={1}>{f.snap.name}</Text>
                  <Text style={styles.friendRec}>{f.record.w}-{f.record.l}{f.record.d ? `-${f.record.d}` : ''}</Text>
                  <View style={[styles.radio, on && { borderColor: C.accent }]}>{on && <View style={styles.radioDot} />}</View>
                </Pressable>
              );
            })}
          </View>

          <Label>{t('vs.pickFormat')}</Label>
          <View style={{ gap: S.sm }}>
            {CHALLENGE_MODES.map((m) => (
              <FormatTile key={m} mode={m} selected={m === mode} locked={lockedFor(m)} onPress={() => setMode(m)}>
                {m === 'clash' && <Segmented options={BEST_OF} value={bestOf} onChange={setBestOf} format={(n) => t('friends.bestOf', { n })} />}
              </FormatTile>
            ))}
          </View>

          {error && <Text style={styles.error} testID="challenge-error">{error}</Text>}
          <Button
            label={busy ? t('vs.sending') : mode === 'draft' ? t('vs.draftFirst') : friend ? t('vs.sendTo', { name: friend.snap.name }) : t('vs.send')}
            icon={<Icon name={MODE_LOOK[mode].icon} size={24} />}
            onPress={send} disabled={!friend || busy || !!lockedFor(mode)} testID="challenge-send"
          />
          <Text style={styles.note}>{t(mode === 'draft' ? 'vs.noteDraft' : 'vs.note')}</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: S.md, paddingVertical: S.xl },
  emptyText: { color: C.text, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  friend: {
    flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.sm + 2, borderRadius: R.lg, backgroundColor: C.surface,
    borderWidth: 2, borderColor: C.line, borderBottomWidth: 5, borderBottomColor: C.edge,
  },
  friendOn: { borderColor: C.accent, backgroundColor: C.surface2 },
  friendName: { flex: 1, fontSize: 17, fontWeight: '800', color: C.text },
  friendRec: { ...F.condensed, fontSize: 18, color: C.muted },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.accent },
  error: { color: C.danger, fontWeight: '800', textAlign: 'center' },
  note: { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
