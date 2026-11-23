import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../../ui/Text';
import { DUEL_COLORS, useDuel } from '../../store/duel';
import { Button, Card, Display, Label, Screen } from '../../ui/components';
import { C, F, FONT, R, S } from '../../ui/theme';
import { Icon } from '../../ui/icons';
import { AVATARS } from '../../ui/avatars';
import { Avatar } from '../../ui/Avatar';
import { CONFIG } from '../../config';
import { encodeFriend, formatPin } from '../../engine/friends/code';
import { mySnapshot, useFriends } from '../../store/friends';
import { FriendRow } from '../../ui/FriendRow';
import { shareText } from '../../ui/share';
import { publishMe } from '../../net/pins';

export default function Duel() {
  const { t } = useTranslation();
  const d = useDuel();
  const [p1, setP1] = useState(d.names.a);
  const [p2, setP2] = useState(d.names.b);
  const friends = useFriends((s) => s.friends);
  const myPin = useFriends((s) => s.pin);
  const online = useFriends((s) => !!s.published);
  useEffect(() => { void publishMe(); }, []);
  const [shareState, setShareState] = useState<'shared' | 'copied' | null>(null);
  const shareCode = async () => {
    const link = `${CONFIG.webUrl}/f?c=${encodeFriend(mySnapshot())}`;
    const r = await shareText(t('friends.shareText', { pin: formatPin(myPin), link }));
    if (r !== 'failed') setShareState(r);
  };

  // --- Setup -------------------------------------------------------------------------------
  return (
    <Screen tint={C.danger} tabbed>
      <View style={styles.banner}>
        <View style={[styles.half, { backgroundColor: '#E5484D' }]} />
        <View style={[styles.half, { backgroundColor: '#3B6CF0', left: '50%' }]} />
        <View style={styles.courtLine} />
        <View style={styles.centerCircle} />
        <View style={styles.faceoff}>
          <View style={styles.faceRing}><Avatar id={AVATARS[11].id} size={78} /></View>
          <View style={styles.vsBadge}><Icon name="vs" size={64} /></View>
          <View style={styles.faceRing}><Avatar id={AVATARS[20].id} size={78} /></View>
        </View>
        <Display size={38}>{t('duel.title')}</Display>
      </View>

      <Pressable onPress={() => router.push('/party')} testID="to-party" accessibilityRole="button"
        style={({ pressed }) => [styles.partyCard, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 4 }]}>
        <LinearGradient colors={['#2BC07A', '#0B6B3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.partyFaces}>
          {[AVATARS[15], AVATARS[0], AVATARS[38]].map((a, i) => (
            <View key={a.id} style={[styles.partyFace, { marginLeft: i ? -12 : 0 }]}><Avatar id={a.id} size={40} /></View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Display size={24} align="left">{t('party.banner')}</Display>
          <Text style={styles.partySub}>{t('party.bannerSub')}</Text>
        </View>
        <View style={styles.liveDot}><Text style={styles.liveText}>LIVE</Text></View>
      </Pressable>

      <View style={styles.pinCard} testID="my-pin">
        <View style={styles.pinTop}>
          <View>
            <Text style={styles.pinLabel}>{t('friends.yourPin')}</Text>
            <View style={styles.status}>
              <View style={[styles.statusDot, { backgroundColor: online ? '#14A86B' : C.line }]} />
              <Text style={styles.statusText}>{online ? t('friends.online') : t('friends.notOnline')}</Text>
            </View>
          </View>
          <Text style={styles.pin} selectable numberOfLines={1}>{formatPin(myPin)}</Text>
        </View>
        <Button label={shareState ? t(`friends.${shareState}`) : t('friends.shareCode')} variant="dark" icon={<Icon name="share" size={20} />} onPress={shareCode} testID="share-code" />
      </View>

      <View style={styles.sectionHead}>
        <Icon name="friends" size={30} />
        <Text style={styles.section}>{t('friends.title')}{friends.length ? ` · ${friends.length}` : ''}</Text>
        <Button label={t('friends.add')} variant="green" icon={<Icon name="plus" size={20} />} onPress={() => router.push('/friends/add')} testID="add-friend" style={styles.addBtn} />
      </View>
      {friends.length === 0 ? (
        <Text style={styles.empty}>{t('friends.empty')}</Text>
      ) : (
        <View style={{ gap: S.sm }}>{friends.map((f) => <FriendRow key={f.pin} f={f} />)}</View>
      )}

      <View style={styles.sectionHead}>
        <Icon name="vs" size={30} />
        <Text style={styles.section}>{t('friends.couch')}</Text>
      </View>
      <Text style={styles.lead}>{t('duel.passPlay')}</Text>
      <Card style={{ gap: S.md }}>
        <Label color={DUEL_COLORS.a[0]}>{t('duel.p1')}</Label>
        <TextInput value={p1} onChangeText={setP1} style={[styles.input, { borderColor: DUEL_COLORS.a[0] }]} maxLength={16} testID="p1" />
        <Label color={DUEL_COLORS.b[0]}>{t('duel.p2')}</Label>
        <TextInput value={p2} onChangeText={setP2} style={[styles.input, { borderColor: DUEL_COLORS.b[0] }]} maxLength={16} testID="p2" />
      </Card>
      {d.state ? (
        <>
          <Button label={`${t('career.resume')} · ${d.names.a} vs ${d.names.b}`} icon={<Icon name="play" size={22} />} onPress={() => router.push('/couch')} testID="duel-resume" />
          <Button label={t('duel.newDuel')} variant="ghost" onPress={() => { d.start(p1, p2); router.push('/couch'); }} testID="duel-start" />
        </>
      ) : (
        <Button label={t('duel.start')} icon={<Icon name="shield" size={22} />} onPress={() => { d.start(p1, p2); router.push('/couch'); }} testID="duel-start" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { height: 210, borderRadius: 26, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: S.md },
  half: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '50%' },
  courtLine: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 4, marginLeft: -2, backgroundColor: 'rgba(255,255,255,0.55)' },
  centerCircle: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  faceoff: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  faceRing: { borderRadius: 50, borderWidth: 4, borderColor: '#FFC53D', backgroundColor: '#FFFFFF' },
  vsBadge: { marginHorizontal: -6, zIndex: 2 },
  lead: { color: C.text, fontSize: 15, lineHeight: 22 },
  partyCard: {
    flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: 22, overflow: 'hidden',
    borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7,
  },
  partyFaces: { flexDirection: 'row' },
  partyFace: { borderRadius: 24, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: C.surface2 },
  partySub: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  liveDot: { backgroundColor: C.danger, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 2, borderColor: '#FFFFFF' },
  liveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  pinTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md },
  pinCard: {
    gap: S.sm, padding: S.md, borderRadius: R.lg, backgroundColor: '#FFFFFF',
    borderWidth: 2.5, borderColor: C.ink, borderBottomWidth: 6,
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusText: { fontSize: 12, fontWeight: '800', color: C.muted },
  pinLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, color: C.muted, textTransform: 'uppercase' },
  pin: { fontFamily: FONT.display, fontSize: 32, color: C.ink, letterSpacing: 2 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.md },
  section: { flex: 1, fontFamily: FONT.display, fontSize: 24, color: C.ink },
  addBtn: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 14 },
  empty: { color: C.muted, fontWeight: '700', textAlign: 'center', paddingVertical: S.md },
  note: { color: C.muted, fontSize: 12, textAlign: 'center' },
  input: { color: C.text, fontSize: 18, fontWeight: '800', borderWidth: 2, borderRadius: R.md, padding: S.md, backgroundColor: C.bg, fontFamily: 'Montserrat_700Bold' },
  turn: { borderRadius: R.lg, padding: S.lg, alignItems: 'center', gap: 2 },
  turnText: { color: C.ink, fontSize: 22, ...F.display },
  turnSub: { color: C.ink, fontWeight: '800' },
  spin: { color: C.text, fontSize: 24, textAlign: 'center', ...F.display },
  choose: { fontWeight: '800', textAlign: 'center' },
  board: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.xl },
  wins: { fontSize: 56, ...F.display },
  side: { color: C.text, fontWeight: '800' },
  vs: { color: C.muted, fontWeight: '800' },
  game: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  winner: { color: C.gold, fontSize: 22, textAlign: 'center', ...F.display },
});
