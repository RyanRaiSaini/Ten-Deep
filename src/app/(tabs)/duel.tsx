import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../../ui/Text';
import { DUEL_COLORS, useDuel } from '../../store/duel';
import { useProfile } from '../../store/profile';
import { Button, Display, Screen } from '../../ui/components';
import { C, FONT, R, S } from '../../ui/theme';
import { Icon } from '../../ui/icons';
import { AVATARS } from '../../ui/avatars';
import { Avatar } from '../../ui/Avatar';
import { CONFIG } from '../../config';
import { encodeFriend, formatPin } from '../../engine/friends/code';
import { mySnapshot, useFriends, type Friend } from '../../store/friends';
import { FriendRow } from '../../ui/FriendRow';
import { shareText } from '../../ui/share';
import { publishMe } from '../../net/pins';
import { useReducedMotion } from '../../ui/fx';

const native = Platform.OS !== 'web';

/** Your toughest rival: the friend you've played most, else the newest friend. */
const topRival = (fs: Friend[]) =>
  [...fs].sort((a, b) => (b.record.w + b.record.l + b.record.d) - (a.record.w + a.record.l + a.record.d))[0] ?? null;

export default function Duel() {
  const { t } = useTranslation();
  const d = useDuel();
  const me = useProfile();
  const [p1, setP1] = useState(d.names.a);
  const [p2, setP2] = useState(d.names.b);
  const friends = useFriends((s) => s.friends);
  const myPin = useFriends((s) => s.pin);
  const online = useFriends((s) => !!s.published);
  useEffect(() => { void publishMe(); }, []);
  const [shareState, setShareState] = useState<'shared' | 'copied' | null>(null);
  const wide = useWindowDimensions().width >= 700;
  const shareCode = async () => {
    const link = `${CONFIG.webUrl}/f?c=${encodeFriend(mySnapshot())}`;
    const r = await shareText(t('friends.shareText', { pin: formatPin(myPin), link }));
    if (r !== 'failed') setShareState(r);
  };
  const total = friends.reduce((acc, f) => ({ w: acc.w + f.record.w, l: acc.l + f.record.l, d: acc.d + f.record.d }), { w: 0, l: 0, d: 0 });
  const rival = topRival(friends);
  const startCouch = () => { d.start(p1, p2); router.push('/couch'); };

  return (
    <Screen tint={C.purple} tabbed>
      <Hero meAvatar={me.avatarId} meName={me.name || t('friends.you')} rival={rival} total={total} />

      <View style={[styles.tiles, wide && { flexDirection: 'row' }]}>
        <ModeTile
          colors={['#2BC07A', '#0B6B3A']} title={t('party.title')} sub={t('party.tagline')} testID="to-party" wide={wide}
          art={<View style={styles.tileFaces}>{[AVATARS[15], AVATARS[0], AVATARS[38]].map((a, i) => <View key={a.id} style={[styles.tileFace, { marginLeft: i ? -12 : 0 }]}><Avatar id={a.id} size={34} /></View>)}</View>}
          badge={<View style={styles.liveDot}><Text style={styles.liveText}>LIVE</Text></View>}
          onPress={() => router.push('/party')}
        />
        <ModeTile
          colors={['#8F6BFF', '#4B2BC2']} title={t('friends.banner')} sub={t('friends.bannerSub')} testID="to-friends" wide={wide}
          art={<Icon name="handshake" size={44} />}
          onPress={() => (rival ? router.push({ pathname: '/friends/[pin]', params: { pin: rival.pin } }) : router.push('/friends/add'))}
        />
        <ModeTile
          colors={['#FF9A3D', '#E5484D']} title={t('friends.couch')} sub={t('friends.couchDesc')} testID="to-couch" wide={wide}
          art={<Icon name="vs" size={44} />}
          onPress={() => (d.state ? router.push('/couch') : startCouch())}
        />
      </View>

      <View style={styles.ticket} testID="my-pin">
        <LinearGradient colors={['#FFC53D', '#FF9A3D']} style={styles.stub}>
          <Icon name="friends" size={28} />
        </LinearGradient>
        <View style={styles.perforation} />
        <View style={{ flex: 1, gap: S.sm, padding: S.md, paddingLeft: S.sm + 2 }}>
          <View style={styles.pinTop}>
            <View>
              <Text style={styles.pinLabel}>{t('friends.yourPin')}</Text>
              <View style={styles.status}>
                <View style={[styles.statusDot, { backgroundColor: online ? '#14A86B' : C.line }]} />
                <Text style={styles.statusText}>{online ? t('friends.online') : t('friends.notOnline')}</Text>
              </View>
            </View>
            <Text style={styles.pin} selectable numberOfLines={1} adjustsFontSizeToFit>{formatPin(myPin)}</Text>
          </View>
          <Button label={shareState ? t(`friends.${shareState}`) : t('friends.shareCode')} variant="dark" icon={<Icon name="share" size={20} />} onPress={shareCode} testID="share-code" />
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Icon name="friends" size={30} />
        <Text style={styles.section}>{t('friends.title')}{friends.length ? ` · ${friends.length}` : ''}</Text>
        <Button label={t('friends.add')} variant="green" icon={<Icon name="plus" size={20} />} onPress={() => router.push('/friends/add')} testID="add-friend" style={styles.addBtn} />
      </View>
      {friends.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.ghosts}>
            {[0, 1, 2].map((i) => <View key={i} style={[styles.ghost, i === 1 && styles.ghostMid]}><Text style={styles.ghostPlus}>+</Text></View>)}
          </View>
          <Text style={styles.empty}>{t('friends.empty')}</Text>
        </View>
      ) : (
        <View style={{ gap: S.sm }}>{friends.map((f) => <FriendRow key={f.pin} f={f} />)}</View>
      )}

      <View style={styles.sectionHead}>
        <Icon name="vs" size={30} />
        <Text style={styles.section}>{t('friends.couch')}</Text>
      </View>
      <Text style={styles.lead}>{t('duel.passPlay')}</Text>
      <View style={styles.versus}>
        <View style={[styles.side, { backgroundColor: DUEL_COLORS.a[0], paddingRight: S.xl }]}>
          <Text style={styles.sideLabel}>{t('duel.p1')}</Text>
          <TextInput value={p1} onChangeText={setP1} style={styles.input} maxLength={16} testID="p1" />
        </View>
        <View style={[styles.side, { backgroundColor: DUEL_COLORS.b[0], paddingLeft: S.xl }]}>
          <Text style={[styles.sideLabel, { color: C.text }]}>{t('duel.p2')}</Text>
          <TextInput value={p2} onChangeText={setP2} style={styles.input} maxLength={16} testID="p2" />
        </View>
        <View style={styles.versusBadge} pointerEvents="none"><Icon name="vs" size={52} /></View>
      </View>
      {d.state ? (
        <>
          <Button label={`${t('career.resume')} · ${d.names.a} vs ${d.names.b}`} icon={<Icon name="play" size={22} />} onPress={() => router.push('/couch')} testID="duel-resume" />
          <Button label={t('duel.newDuel')} variant="ghost" onPress={startCouch} testID="duel-start" />
        </>
      ) : (
        <Button label={t('duel.start')} icon={<Icon name="shield" size={22} />} onPress={startCouch} testID="duel-start" />
      )}
    </Screen>
  );
}

/** Night-arena faceoff: you vs your top rival under two spotlights, with your record against friends. */
function Hero({ meAvatar, meName, rival, total }: { meAvatar: string; meName: string; rival: Friend | null; total: { w: number; l: number; d: number } }) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse, reduce]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  return (
    <View style={styles.hero} testID="duel-hero">
      <LinearGradient colors={['#1C2448', '#0B1020']} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(229,72,77,0.85)', 'rgba(229,72,77,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 0.55, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(59,108,240,0)', 'rgba(59,108,240,0.85)']} start={{ x: 0.45, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']} style={[styles.beam, { left: '14%', transform: [{ rotate: '-18deg' }] }]} />
      <LinearGradient colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']} style={[styles.beam, { right: '14%', transform: [{ rotate: '18deg' }] }]} />
      <View style={styles.midLine} />
      <View style={styles.centerCircle} />

      <View style={styles.faceoff}>
        <Fighter avatar={<Avatar id={meAvatar} size={84} />} name={meName} ring="#FF6B6B" />
        <Animated.View style={{ transform: [{ scale }], zIndex: 2, marginHorizontal: -4 }}><Icon name="vs" size={70} /></Animated.View>
        <Fighter
          avatar={rival ? <Avatar id={rival.snap.avatar} size={84} /> : <View style={styles.mystery}><Text style={styles.mysteryText}>?</Text></View>}
          name={rival ? rival.snap.name : '???'} ring="#6B9BFF"
        />
      </View>
      <Display size={36} extrude="#7A4DFF">{t('duel.title')}</Display>
      <Text style={styles.tagline}>{t('home.duelCta')}</Text>

      <View style={styles.board}>
        <Text style={styles.boardLabel}>{t('friends.h2h')}</Text>
        <View style={styles.boardDigits}>
          <Digit n={total.w} label={t('friends.w')} color="#3DF29A" />
          <Digit n={total.l} label={t('friends.l')} color="#FF6B6B" />
          <Digit n={total.d} label={t('friends.d')} color="#C9CED8" />
        </View>
      </View>
    </View>
  );
}

const Fighter = ({ avatar, name, ring }: { avatar: ReactNode; name: string; ring: string }) => (
  <View style={{ alignItems: 'center', gap: 4, width: 110 }}>
    <View style={[styles.fighterRing, { borderColor: ring, shadowColor: ring }]}>{avatar}</View>
    <Text style={styles.fighterName} numberOfLines={1}>{name}</Text>
  </View>
);

const Digit = ({ n, label, color }: { n: number; label: string; color: string }) => (
  <View style={styles.digit}>
    <Text style={[styles.digitNum, { color }]}>{n}</Text>
    <Text style={styles.digitLabel}>{label}</Text>
  </View>
);

function ModeTile({ colors, title, sub, art, badge, onPress, testID, wide }: {
  colors: [string, string]; title: string; sub: string; art: ReactNode; badge?: ReactNode; onPress: () => void; testID: string; wide: boolean;
}) {
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="button" accessibilityLabel={title}
      style={({ pressed }) => [styles.tile, wide ? styles.tileWide : styles.tileRow, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 4 }]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.tileShine} />
      <View style={wide ? { alignItems: 'flex-start', gap: S.sm } : { flexDirection: 'row', alignItems: 'center', gap: S.md, flex: 1 }}>
        <View style={styles.tileArt}>{art}</View>
        <View style={{ flex: wide ? undefined : 1, gap: 2 }}>
          <Display size={22} align="left">{title}</Display>
          <Text style={styles.tileSub} numberOfLines={wide ? 3 : 2}>{sub}</Text>
        </View>
      </View>
      {badge ? <View style={styles.tileBadge}>{badge}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 26, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, alignItems: 'center',
    paddingTop: S.lg, gap: 2, marginTop: S.md,
  },
  beam: { position: 'absolute', top: -40, width: 90, height: 260 },
  midLine: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 3, marginLeft: -1.5, backgroundColor: 'rgba(255,255,255,0.35)' },
  centerCircle: { position: 'absolute', top: 18, width: 150, height: 150, borderRadius: 75, borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' },
  faceoff: { flexDirection: 'row', alignItems: 'center' },
  fighterRing: { borderRadius: 50, borderWidth: 4, backgroundColor: C.surface, shadowOpacity: 0.8, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  fighterName: { color: '#FFFFFF', fontWeight: '900', fontSize: 13, maxWidth: 110 },
  mystery: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#25305A', alignItems: 'center', justifyContent: 'center' },
  mysteryText: { fontFamily: FONT.display, fontSize: 44, color: '#6B9BFF' },
  tagline: { color: '#FFC53D', fontWeight: '900', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },
  board: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: S.md,
    backgroundColor: '#070B16', paddingHorizontal: S.lg, paddingVertical: S.sm, borderTopWidth: 2, borderColor: 'rgba(255,255,255,0.12)',
  },
  boardLabel: { color: '#C9CED8', fontWeight: '900', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  boardDigits: { flexDirection: 'row', gap: S.sm },
  digit: { alignItems: 'center', backgroundColor: '#0B1020', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', minWidth: 46 },
  digitNum: { fontFamily: FONT.display, fontSize: 24 },
  digitLabel: { color: '#8B93A7', fontWeight: '900', fontSize: 10, marginTop: -2 },

  tiles: { gap: S.md },
  tile: { borderRadius: 22, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, padding: S.md },
  tileRow: { flexDirection: 'row', alignItems: 'center', minHeight: 92 },
  tileWide: { flex: 1, minHeight: 170, justifyContent: 'space-between' },
  tileShine: { position: 'absolute', top: -60, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.14)' },
  tileArt: { minWidth: 56, minHeight: 48, justifyContent: 'center' },
  tileFaces: { flexDirection: 'row' },
  tileFace: { borderRadius: 20, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: C.surface2 },
  tileSub: { color: '#FFFFFF', fontWeight: '800', fontSize: 13, lineHeight: 18 },
  tileBadge: { position: 'absolute', top: S.sm, right: S.sm },
  liveDot: { backgroundColor: C.danger, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 2, borderColor: '#FFFFFF' },
  liveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },

  ticket: {
    flexDirection: 'row', borderRadius: R.lg, backgroundColor: C.surface, overflow: 'hidden',
    borderWidth: 2.5, borderColor: C.ink, borderBottomWidth: 6,
  },
  stub: { width: 52, alignItems: 'center', justifyContent: 'center' },
  perforation: { width: 0, borderLeftWidth: 2.5, borderStyle: 'dashed', borderColor: C.ink },
  pinTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusText: { fontSize: 12, fontWeight: '800', color: C.muted },
  pinLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, color: C.muted, textTransform: 'uppercase' },
  pin: { fontFamily: FONT.display, fontSize: 32, color: C.text, letterSpacing: 2, flexShrink: 1 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.md },
  section: { flex: 1, fontFamily: FONT.display, fontSize: 24, color: C.text },
  addBtn: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 14 },
  emptyCard: { alignItems: 'center', gap: S.sm, padding: S.lg, borderRadius: R.lg, borderWidth: 2.5, borderStyle: 'dashed', borderColor: C.edge, backgroundColor: 'rgba(255,255,255,0.6)' },
  ghosts: { flexDirection: 'row', alignItems: 'center' },
  ghost: { width: 52, height: 52, borderRadius: 26, borderWidth: 2.5, borderStyle: 'dashed', borderColor: C.muted, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', marginHorizontal: -6 },
  ghostMid: { width: 64, height: 64, borderRadius: 32, zIndex: 2, borderColor: C.purple, backgroundColor: '#EFE9FF' },
  ghostPlus: { fontFamily: FONT.display, fontSize: 26, color: C.muted },
  empty: { color: C.muted, fontWeight: '700', textAlign: 'center' },

  lead: { color: C.text, fontSize: 15, lineHeight: 22 },
  versus: { flexDirection: 'row', borderRadius: 22, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7 },
  side: { flex: 1, padding: S.md, paddingVertical: S.lg, gap: S.sm },
  sideLabel: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  input: { color: C.text, fontSize: 17, fontWeight: '800', borderWidth: 2.5, borderColor: C.ink, borderRadius: R.md, paddingVertical: S.sm, paddingHorizontal: S.md, backgroundColor: C.surface, fontFamily: 'Montserrat_700Bold' },
  versusBadge: { position: 'absolute', left: '50%', top: '50%', marginLeft: -26, marginTop: -26 },
});
