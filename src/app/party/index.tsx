import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';
import { feel } from '../../audio/feel';
import { parseRoomCode } from '../../engine/party';
import { createRoom, joinRoom } from '../../net/party';
import { Avatar } from '../../ui/Avatar';
import { AVATARS } from '../../ui/avatars';
import { BackButton, Button, Display, Screen } from '../../ui/components';
import { Icon, CourtArt, type IconName } from '../../ui/icons';
import { goBack } from '../../ui/nav';
import { Text } from '../../ui/Text';
import { C, FONT, R, S } from '../../ui/theme';

/** Live Party hub: create a room, or join one with its code. */
export default function PartyHub() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [w, setW] = useState(360);

  const fail = (e: string) => { setError(t(`party.err.${e}`, { defaultValue: t('party.err.unavailable') })); feel('buzzer'); };
  const create = async (kind: 'draft' | 'takeover' = 'draft') => {
    setBusy('create'); setError(null);
    const r = await createRoom(kind);
    setBusy(null);
    if (!r.ok) return fail(r.error);
    feel('swish');
    router.push({ pathname: '/party/[code]', params: { code: r.data.code } });
  };
  const join = async () => {
    const c = parseRoomCode(code);
    if (!c) return fail('bad-code');
    setBusy('join'); setError(null);
    const r = await joinRoom(c);
    setBusy(null);
    if (!r.ok) return fail(r.error);
    feel('swish');
    router.push({ pathname: '/party/[code]', params: { code: c } });
  };

  const crowd = [AVATARS[15], AVATARS[4], AVATARS[0], AVATARS[14], AVATARS[38]];
  return (
    <Screen>
      <View style={styles.hero} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <View style={StyleSheet.absoluteFill}><CourtArt width={w} height={250} color="#1E9E5A" color2="#0B6B3A" /></View>
        <View style={styles.back}><BackButton onPress={goBack} /></View>
        <View style={styles.crowd}>
          {crowd.map((a, i) => (
            <View key={a.id} style={[styles.face, i === 2 && styles.faceBig, { marginLeft: i ? -14 : 0, zIndex: i === 2 ? 5 : 5 - Math.abs(2 - i) }]}>
              {i === 2 && <View style={styles.crown}><Icon name="crown" size={34} /></View>}
              <Avatar id={a.id} size={i === 2 ? 84 : 62} />
            </View>
          ))}
        </View>
        <Display size={40} extrude="#0B6B3A">{t('party.title')}</Display>
        <Text style={styles.tag}>{t('party.tagline')}</Text>
      </View>

      <Feature icon="friends" title={t('party.f1')} body={t('party.f1Body')} />
      <Feature icon="cards" title={t('party.f2')} body={t('party.f2Body')} />
      <Feature icon="trophy" title={t('party.f3')} body={t('party.f3Body')} />

      {error && <Text style={styles.error} testID="party-error">{error}</Text>}
      <View style={styles.joinRow}>
        <TextInput
          value={code}
          onChangeText={(v) => { setCode(v.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5)); setError(null); }}
          placeholder={t('party.codePlaceholder')}
          placeholderTextColor={C.line}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={5}
          style={styles.codeInput}
          testID="party-code"
        />
        <Button label={busy === 'join' ? '…' : t('party.join')} variant="green" onPress={join} disabled={code.length !== 5 || !!busy} testID="party-join" style={{ flex: 1 }} />
      </View>
      <Button label={busy === 'create' ? '…' : t('party.create')} variant="dark" icon={<Icon name="plus" size={22} />} onPress={() => create()} disabled={!!busy} testID="party-create" />
      <Button label={busy === 'create' ? '…' : t('partyTk.create')} variant="blue" icon={<Icon name="briefcase" size={22} />} onPress={() => create('takeover')} disabled={!!busy} testID="party-create-takeover" />
      <Text style={styles.tkHint}>{t('partyTk.createHint')}</Text>
    </Screen>
  );
}

function Feature({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureTile}><Icon name={icon} size={40} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tkHint: { color: C.muted, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  hero: { height: 250, borderRadius: 26, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: S.sm },
  back: { position: 'absolute', top: 12, left: 12 },
  crowd: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  face: { borderRadius: 40, borderWidth: 3.5, borderColor: '#FFFFFF', backgroundColor: C.surface2 },
  faceBig: { borderColor: '#FFC53D', borderWidth: 4.5 },
  crown: { position: 'absolute', top: -26, alignSelf: 'center', zIndex: 2 },
  tag: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
  feature: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  featureTile: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#E9F7EF', borderWidth: 2, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontFamily: FONT.display, fontSize: 21, color: C.ink },
  featureBody: { color: C.muted, fontWeight: '700', fontSize: 14 },
  error: { color: C.danger, fontWeight: '800', textAlign: 'center' },
  joinRow: { flexDirection: 'row', gap: S.sm, alignItems: 'center', marginTop: S.sm },
  codeInput: {
    flex: 1.2, fontFamily: FONT.display, fontSize: 26, letterSpacing: 5, textAlign: 'center', color: C.ink, borderWidth: 2.5,
    borderColor: C.ink, borderRadius: R.pill, paddingVertical: 8, backgroundColor: '#FFFFFF',
  },
});
