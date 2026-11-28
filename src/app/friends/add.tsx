import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import { feel } from '../../audio/feel';
import { decodeFriend, parsePin } from '../../engine/friends/code';
import { lookupPin } from '../../net/pins';
import { sayHello } from '../../net/duels';
import { useFriends } from '../../store/friends';
import { BackButton, Button, Card, Header, Screen } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { goBack } from '../../ui/nav';
import { pasteText } from '../../ui/share';
import { Text } from '../../ui/Text';
import { C, FONT, R, S } from '../../ui/theme';

/** Add a friend by pasting their code or link. */
export default function AddFriend() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [pinText, setPinText] = useState('');
  const [busy, setBusy] = useState(false);
  const byPin = async () => {
    const pin = parsePin(pinText);
    if (!pin) return;
    if (pin === useFriends.getState().pin) { setError(t('friends.self')); return; }
    setBusy(true);
    const r = await lookupPin(pin);
    setBusy(false);
    if (!r.ok) { setError(t(r.reason === 'offline' ? 'friends.offline' : 'friends.notFound')); feel('buzzer'); return; }
    const res = useFriends.getState().add(r.snap);
    // Tell them, so they get you as a friend too.
    void sayHello(r.snap.pin);
    feel('fanfare');
    router.replace({ pathname: '/friends/[pin]', params: { pin: r.snap.pin, fresh: res === 'self' ? 'updated' : res } });
  };

  const submit = (value = text) => {
    const snap = decodeFriend(value);
    if (!snap) { setError(t('friends.invalid')); feel('buzzer'); return; }
    const r = useFriends.getState().add(snap);
    if (r === 'self') { setError(t('friends.self')); return; }
    void sayHello(snap.pin);
    feel('fanfare');
    router.replace({ pathname: '/friends/[pin]', params: { pin: snap.pin, fresh: r } });
  };

  return (
    <Screen tint={C.blue}>
      <Header title={t('friends.addTitle')} left={<BackButton onPress={goBack} />} />
      <View style={styles.hero}><Icon name="friends" size={96} /></View>
      <Text style={styles.lead}>{t('friends.addHint')}</Text>
      {error && <Text style={styles.error} testID="friend-error">{error}</Text>}
      <Card style={{ gap: S.md }}>
        <Text style={styles.cardTitle}>{t('friends.pinTitle')}</Text>
        <TextInput
          value={pinText}
          onChangeText={(v) => { setPinText(v.toUpperCase()); setError(null); }}
          placeholder="K7Q-2XM"
          placeholderTextColor={C.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={7}
          style={styles.pinInput}
          testID="friend-pin"
        />
        <Button label={busy ? '…' : t('friends.find')} variant="green" icon={<Icon name="plus" size={20} />} onPress={byPin} disabled={!parsePin(pinText) || busy} testID="friend-pin-add" />
      </Card>
      <Text style={styles.hint}>{t('friends.orCode')}</Text>
      <Card style={{ gap: S.md }}>
        <TextInput
          value={text}
          onChangeText={(v) => { setText(v); setError(null); }}
          placeholder={t('friends.placeholder')}
          placeholderTextColor={C.muted}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          style={styles.input}
          testID="friend-code"
        />
        <View style={styles.row}>
          <Button label={t('friends.paste')} variant="secondary" style={{ flex: 1 }} onPress={async () => { const v = await pasteText(); if (v) { setText(v); submit(v); } }} testID="friend-paste" />
          <Button label={t('friends.addBtn')} variant="green" style={{ flex: 1 }} icon={<Icon name="plus" size={20} />} onPress={() => submit()} disabled={!text.trim()} testID="friend-add" />
        </View>
      </Card>
      <Text style={styles.note}>{t('friends.pinHint')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: S.sm },
  cardTitle: { fontFamily: FONT.display, fontSize: 20, color: C.text, textAlign: 'center' },
  pinInput: { fontFamily: FONT.condensed, fontSize: 36, letterSpacing: 6, textAlign: 'center', color: C.text, borderWidth: 2.5, borderColor: C.ink, borderRadius: R.md, paddingVertical: 10, backgroundColor: C.bg },
  lead: { color: C.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  hint: { color: C.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  input: {
    minHeight: 96, borderWidth: 2, borderColor: C.line, borderRadius: R.md, padding: S.md, backgroundColor: C.bg,
    color: C.text, fontSize: 15, fontFamily: FONT.body, textAlignVertical: 'top',
  },
  error: { color: C.danger, fontWeight: '800', textAlign: 'center' },
  row: { flexDirection: 'row', gap: S.sm },
  note: { color: C.muted, fontSize: 13, textAlign: 'center', fontWeight: '600' },
});
