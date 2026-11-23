import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import { feel } from '../../audio/feel';
import { decodeFriend } from '../../engine/friends/code';
import { useFriends } from '../../store/friends';
import { BackButton, Button, Card, Header, Screen } from '../../ui/components';
import { Icon } from '../../ui/icons';
import { goBack } from '../../ui/nav';
import { pasteText } from '../../ui/share';
import { Text } from '../../ui/Text';
import { C, R, S } from '../../ui/theme';

/** Add a friend by pasting their code or link. */
export default function AddFriend() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (value = text) => {
    const snap = decodeFriend(value);
    if (!snap) { setError(t('friends.invalid')); feel('buzzer'); return; }
    const r = useFriends.getState().add(snap);
    if (r === 'self') { setError(t('friends.self')); return; }
    feel('fanfare');
    router.replace({ pathname: '/friends/[pin]', params: { pin: snap.pin, fresh: r } });
  };

  return (
    <Screen tint={C.blue}>
      <Header title={t('friends.addTitle')} left={<BackButton onPress={goBack} />} />
      <View style={styles.hero}><Icon name="friends" size={96} /></View>
      <Text style={styles.hint}>{t('friends.addHint')}</Text>
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
        {error && <Text style={styles.error} testID="friend-error">{error}</Text>}
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
  hint: { color: C.ink, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  input: {
    minHeight: 96, borderWidth: 2, borderColor: C.line, borderRadius: R.md, padding: S.md, backgroundColor: C.bg,
    color: C.ink, fontSize: 15, fontFamily: 'LeagueSpartan_600SemiBold', textAlignVertical: 'top',
  },
  error: { color: C.danger, fontWeight: '800', textAlign: 'center' },
  row: { flexDirection: 'row', gap: S.sm },
  note: { color: C.muted, fontSize: 13, textAlign: 'center', fontWeight: '600' },
});
