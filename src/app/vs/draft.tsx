import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { feel } from '../../audio/feel';
import { POOLS } from '../../data';
import { capRoom } from '../../engine/cap';
import { isComplete, options } from '../../engine/draft';
import { DUEL_DRAFT_POOL } from '../../engine/friends/challenge';
import { partialSquadRating } from '../../engine/rotation';
import type { SlotId } from '../../engine/types';
import { answerChallenge, mySide, sendChallenge, type Fail } from '../../net/duels';
import { useChallenges } from '../../store/challenges';
import { useFriends } from '../../store/friends';
import { BackButton, Button, Card, Header, Label, Screen } from '../../ui/components';
import { MODE_LOOK } from '../../ui/duelParts';
import { Icon } from '../../ui/icons';
import { goBack } from '../../ui/nav';
import { PlayerCard } from '../../ui/PlayerCard';
import { RosterBoard } from '../../ui/RosterBoard';
import { SquadBadge } from '../../ui/SquadBadge';
import { Text } from '../../ui/Text';
import { C, F, R, S, money } from '../../ui/theme';

/**
 * A draft duel's draft: the same ten spins your friend gets (the challenge's seed), Current Day, one respin.
 * When your ten are in, the challenge goes out (or, answering one, the face-off is played).
 */
export default function DuelDraft() {
  const { t } = useTranslation();
  const draft = useChallenges((s) => s.draft);
  const byId = useChallenges((s) => s.byId);
  const friends = useFriends((s) => s.friends);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const st = draft?.state;
  const complete = !!st && isComplete(st);

  // Every round lands its spin straight away.
  useEffect(() => {
    if (st && !st.spin && !isComplete(st)) useChallenges.getState().draftSpin();
  }, [st]);

  if (!draft || !st) return <Redirect href="/duel" />;
  const pool = POOLS[DUEL_DRAFT_POOL];
  const answering = draft.id ? byId[draft.id] : null;
  const rivalName = answering ? answering.a.name : friends.find((f) => f.pin === draft.to)?.snap.name ?? t('vs.friend');
  const opts = st.spin ? options(st, pool) : [];
  const usable = opts.filter((o) => o.affordable);
  const chosenOpt = opts.find((o) => o.player.id === chosen);

  const place = (id: string, slot: SlotId) => {
    useChallenges.getState().draftPick(id, slot);
    setChosen(null);
    feel('pickChime');
  };

  const finish = async () => {
    const side = mySide('draft', st.roster);
    if (!('code' in side)) return;
    setBusy(true);
    setError(null);
    const r = answering ? await answerChallenge(answering.id, true, side.code)
      : await sendChallenge(draft.to!, 'draft', 7, side.code, draft.seed);
    setBusy(false);
    if (!r.ok) {
      const why: Fail = r.reason;
      setError(t(why === 'no-friend' ? 'vs.noFriend' : why === 'expired' ? 'vs.expired' : why === 'offline' ? 'vs.offline' : 'vs.failed', { name: rivalName }));
      feel('buzzer');
      return;
    }
    useChallenges.getState().clearDraft();
    feel(answering ? 'crowd' : 'pickChime');
    // Back to the challenge's screen if it's under this one (you came from Accept), so it isn't open twice.
    router.dismissTo({ pathname: '/vs/[id]', params: { id: r.data.id } });
  };

  return (
    <Screen tint={MODE_LOOK.draft.color}>
      <Header title={t('vs.mode.draft')} left={<BackButton onPress={goBack} />} />
      <View style={styles.banner} testID="vs-draft-banner">
        <Icon name="vs" size={30} />
        <Text style={styles.bannerText}>{t(answering ? 'vs.draftAnswer' : 'vs.draftFor', { name: rivalName })}</Text>
      </View>
      <View style={styles.stats}>
        <Text style={styles.stat}>{complete ? t('vs.teamReady') : t('draft.pick', { n: st.round + 1 })}</Text>
        <Text style={styles.stat}>{money(capRoom(st.roster))}</Text>
        <SquadBadge value={partialSquadRating(st.roster)} size="sm" />
      </View>

      {!complete && st.spin && (
        <Card style={{ gap: S.sm }}>
          <Label>{t('draft.landed')}</Label>
          <Text style={styles.spin} testID="vs-spin-team">{st.spin.label}</Text>
          {opts.map((o) => (
            <PlayerCard
              key={o.player.id}
              player={o.player}
              testID={o.affordable ? 'vs-option' : undefined}
              disabled={!o.affordable}
              selected={chosen === o.player.id}
              note={!o.affordable ? (o.slots.length ? t('draft.overCap') : t('draft.noSlot')) : undefined}
              onPress={() => (o.slots.length === 1 ? place(o.player.id, o.slots[0]) : setChosen(o.player.id))}
            />
          ))}
          {usable.length === 0 && (
            <Button label={t('draft.nothingFits')} variant="ghost" onPress={() => { useChallenges.getState().draftFallback(); feel('pickChime'); }} testID="vs-fallback" />
          )}
          {st.respinsLeft > 0 && (
            <Button label={t('draft.respin', { n: st.respinsLeft })} variant="secondary" icon={<Icon name="reroll" size={22} />}
              onPress={() => { useChallenges.getState().draftRespin(); setChosen(null); feel('flip'); }} testID="vs-respin" />
          )}
        </Card>
      )}
      {chosenOpt && <Text style={styles.choose}>{t('draft.chooseSlot')}</Text>}
      <RosterBoard
        roster={st.roster}
        highlight={chosenOpt?.slots}
        onSlot={chosenOpt ? (slot) => chosenOpt.slots.includes(slot) && place(chosenOpt.player.id, slot) : undefined}
      />
      {complete && (
        <>
          {error && <Text style={styles.error} testID="vs-draft-error">{error}</Text>}
          <Button label={busy ? t('vs.sending') : answering ? t('vs.faceOff') : t('vs.sendTo', { name: rivalName })} icon={<Icon name="vs" size={24} />}
            onPress={finish} disabled={busy} testID="vs-draft-done" />
        </>
      )}
      <Button label={t('vs.cancelDraft')} variant="ghost" onPress={() => { useChallenges.getState().clearDraft(); goBack(); }} testID="vs-draft-cancel" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.surface, borderRadius: R.md, padding: S.md, borderWidth: 2, borderColor: C.hardwood },
  bannerText: { flex: 1, color: C.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  stats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md },
  stat: { ...F.condensed, fontSize: 20, color: C.text },
  spin: { ...F.condensed, fontSize: 26, color: C.text, textAlign: 'center' },
  choose: { color: C.accent, fontWeight: '800', textAlign: 'center' },
  error: { color: C.danger, fontWeight: '800', textAlign: 'center' },
});
