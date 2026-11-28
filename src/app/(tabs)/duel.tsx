import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../../ui/Text';
import { useProfile } from '../../store/profile';
import { Button, Display, Screen } from '../../ui/components';
import { C, F, FONT, R, S } from '../../ui/theme';
import { Icon } from '../../ui/icons';
import { AVATARS } from '../../ui/avatars';
import { Avatar } from '../../ui/Avatar';
import { CONFIG } from '../../config';
import { encodeFriend, formatPin } from '../../engine/friends/code';
import { mySnapshot, useFriends, type Friend } from '../../store/friends';
import { allChallenges, incomingOpen, unseenResults, useChallenges } from '../../store/challenges';
import { FriendRow } from '../../ui/FriendRow';
import { ChallengeRow, FaceOff } from '../../ui/duelParts';
import { shareText } from '../../ui/share';
import { publishMe } from '../../net/pins';
import { syncDuels } from '../../net/duels';

/** Your toughest rival: the friend you've played most, else the newest friend. */
const topRival = (fs: Friend[]) =>
  [...fs].sort((a, b) => (b.record.w + b.record.l + b.record.d) - (a.record.w + a.record.l + a.record.d))[0] ?? null;

/** How often the open Duels tab checks for new challenges and results. */
const POLL_MS = 30_000;

/** The Duels hub: challenge a friend, answer challenges, see results, your PIN and friends, other ways to play. */
export default function Duel() {
  const { t } = useTranslation();
  const me = useProfile();
  const friends = useFriends((s) => s.friends);
  const myPin = useFriends((s) => s.pin);
  const online = useFriends((s) => !!s.published);
  const byId = useChallenges((s) => s.byId);
  const viewed = useChallenges((s) => s.viewed);
  const [shareState, setShareState] = useState<'shared' | 'copied' | null>(null);
  const wide = useWindowDimensions().width >= 700;

  // Go online and check in whenever the tab is open, and keep checking while it stays open.
  useFocusEffect(useCallback(() => {
    void publishMe().then(() => syncDuels());
    const id = setInterval(() => { void syncDuels(); }, POLL_MS);
    return () => clearInterval(id);
  }, []));

  const challenges = useMemo(() => allChallenges(byId), [byId]);
  const incoming = incomingOpen(challenges, myPin);
  const unseen = new Set(unseenResults(challenges, viewed).map((c) => c.id));
  const mine = challenges.filter((c) => !(c.to === myPin && c.status === 'open')).slice(0, 8);
  const avatarOf = (pin: string) => friends.find((f) => f.pin === pin)?.snap.avatar ?? null;

  const shareCode = async () => {
    const link = `${CONFIG.webUrl}/f?c=${encodeFriend(mySnapshot())}`;
    const r = await shareText(t('friends.shareText', { pin: formatPin(myPin), link }));
    if (r !== 'failed') setShareState(r);
  };
  const total = friends.reduce((acc, f) => ({ w: acc.w + f.record.w, l: acc.l + f.record.l, d: acc.d + f.record.d }), { w: 0, l: 0, d: 0 });
  const rival = topRival(friends);

  return (
    <Screen tint={C.blue} tabbed>
      <View style={{ marginTop: S.md, gap: S.sm }} testID="duel-hero">
        <Display size={40}>{t('tabs.duels')}</Display>
        <FaceOff me={{ name: me.name || t('friends.you'), avatar: me.avatarId }} them={{ name: rival ? rival.snap.name : '???', avatar: rival?.snap.avatar }} />
        <View style={styles.board}>
          <Text style={styles.boardLabel}>{t('friends.h2h')}</Text>
          <View style={styles.boardDigits}>
            <Digit n={total.w} label={t('friends.w')} color={C.neon} />
            <Digit n={total.l} label={t('friends.l')} color={C.danger} />
            <Digit n={total.d} label={t('friends.d')} color={C.muted} />
          </View>
        </View>
      </View>

      <Button label={t('vs.cta')} icon={<Icon name="vs" size={26} />} onPress={() => router.push('/challenge')} testID="to-challenge" />
      <Text style={styles.ctaSub}>{t('vs.ctaSub')}</Text>

      {incoming.length > 0 && (
        <>
          <SectionHead icon={<Icon name="siren" size={28} />} title={`${t('vs.inbox')} · ${incoming.length}`} />
          <View style={{ gap: S.sm }} testID="incoming">
            {incoming.map((c) => <ChallengeRow key={c.id} c={c} myPin={myPin} avatarOf={avatarOf} />)}
          </View>
        </>
      )}

      {mine.length > 0 && (
        <>
          <SectionHead icon={<Icon name="clock" size={28} />} title={t('vs.outbox')} />
          <View style={{ gap: S.sm }}>
            {mine.map((c) => <ChallengeRow key={c.id} c={c} myPin={myPin} avatarOf={avatarOf} unseen={unseen.has(c.id)} />)}
          </View>
        </>
      )}

      <View style={styles.ticket} testID="my-pin">
        <View style={styles.stub}><Icon name="friends" size={28} /></View>
        <View style={{ flex: 1, gap: S.sm, padding: S.md }}>
          <View style={styles.pinTop}>
            <View>
              <Text style={styles.pinLabel}>{t('friends.yourPin')}</Text>
              <View style={styles.status}>
                <View style={[styles.statusDot, { backgroundColor: online ? C.neon : C.line }]} />
                <Text style={styles.statusText}>{online ? t('friends.online') : t('friends.notOnline')}</Text>
              </View>
            </View>
            <Text style={styles.pin} selectable numberOfLines={1} adjustsFontSizeToFit>{formatPin(myPin)}</Text>
          </View>
          <Button label={shareState ? t(`friends.${shareState}`) : t('friends.shareCode')} variant="dark" icon={<Icon name="share" size={20} />} onPress={shareCode} testID="share-code" />
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Icon name="friends" size={28} />
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

      <SectionHead icon={<Icon name="ball" size={28} />} title={t('vs.otherWays')} />
      <View style={[styles.tiles, wide && { flexDirection: 'row' }]}>
        <ModeTile
          colors={['#1F7A52', '#0E3B28']} title={t('party.title')} sub={t('party.tagline')} testID="to-party" wide={wide}
          art={<View style={styles.tileFaces}>{[AVATARS[15], AVATARS[0], AVATARS[38]].map((a, i) => <View key={a.id} style={[styles.tileFace, { marginLeft: i ? -12 : 0 }]}><Avatar id={a.id} size={34} /></View>)}</View>}
          badge={<View style={styles.liveDot}><Text style={styles.liveText}>LIVE</Text></View>}
          onPress={() => router.push('/party')}
        />
        <ModeTile
          colors={['#8A3A12', '#3B1A0A']} title={t('friends.couch')} sub={t('friends.couchDesc')} testID="to-couch" wide={wide}
          art={<Icon name="vs" size={44} />}
          onPress={() => router.push('/couch')}
        />
      </View>
    </Screen>
  );
}

const SectionHead = ({ icon, title }: { icon: ReactNode; title: string }) => (
  <View style={styles.sectionHead}>{icon}<Text style={styles.section}>{title}</Text></View>
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
      style={({ pressed }) => [styles.tile, wide ? styles.tileWide : styles.tileRow, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 2 }]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={wide ? { alignItems: 'flex-start', gap: S.sm } : { flexDirection: 'row', alignItems: 'center', gap: S.md, flex: 1 }}>
        <View style={styles.tileArt}>{art}</View>
        <View style={{ flex: wide ? undefined : 1, gap: 2 }}>
          <Text style={styles.tileTitle}>{title}</Text>
          <Text style={styles.tileSub} numberOfLines={wide ? 3 : 2}>{sub}</Text>
        </View>
      </View>
      {badge ? <View style={styles.tileBadge}>{badge}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderRadius: R.md,
    paddingHorizontal: S.lg, paddingVertical: S.sm, borderWidth: 2, borderColor: C.line, borderBottomWidth: 5, borderBottomColor: C.edge,
  },
  boardLabel: { ...F.label, color: C.muted },
  boardDigits: { flexDirection: 'row', gap: S.sm },
  digit: { alignItems: 'center', backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, borderWidth: 1.5, borderColor: C.line, minWidth: 46 },
  digitNum: { fontFamily: FONT.condensed, fontSize: 26 },
  digitLabel: { color: C.muted, fontWeight: '800', fontSize: 11, marginTop: -2 },
  ctaSub: { color: C.muted, fontSize: 14, textAlign: 'center', marginTop: -S.xs },

  tiles: { gap: S.md },
  tile: { borderRadius: R.lg, overflow: 'hidden', borderWidth: 2, borderColor: C.line, borderBottomWidth: 6, borderBottomColor: C.edge, padding: S.md },
  tileRow: { flexDirection: 'row', alignItems: 'center', minHeight: 88 },
  tileWide: { flex: 1, minHeight: 150, justifyContent: 'space-between' },
  tileArt: { minWidth: 56, minHeight: 48, justifyContent: 'center' },
  tileFaces: { flexDirection: 'row' },
  tileFace: { borderRadius: 20, borderWidth: 2, borderColor: C.text, backgroundColor: C.surface2 },
  tileTitle: { ...F.condensed, fontSize: 22, color: C.text },
  tileSub: { color: 'rgba(242,244,248,0.85)', fontWeight: '700', fontSize: 13, lineHeight: 18 },
  tileBadge: { position: 'absolute', top: S.sm, right: S.sm },
  liveDot: { backgroundColor: C.danger, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 3 },
  liveText: { color: C.onColor, fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },

  ticket: {
    flexDirection: 'row', borderRadius: R.lg, backgroundColor: C.surface, overflow: 'hidden',
    borderWidth: 2, borderColor: C.line, borderBottomWidth: 5, borderBottomColor: C.edge,
  },
  stub: { width: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface2, borderRightWidth: 2, borderStyle: 'dashed', borderRightColor: C.line },
  pinTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusText: { fontSize: 12, fontWeight: '800', color: C.muted },
  pinLabel: { ...F.label, color: C.muted },
  pin: { fontFamily: FONT.condensed, fontSize: 36, color: C.text, letterSpacing: 2, flexShrink: 1 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.md },
  section: { flex: 1, ...F.condensed, fontSize: 24, color: C.text },
  addBtn: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 14 },
  emptyCard: { alignItems: 'center', gap: S.sm, padding: S.lg, borderRadius: R.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: C.line, backgroundColor: C.surface },
  ghosts: { flexDirection: 'row', alignItems: 'center' },
  ghost: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderStyle: 'dashed', borderColor: C.muted, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', marginHorizontal: -6 },
  ghostMid: { width: 64, height: 64, borderRadius: 32, zIndex: 2, borderColor: C.blue, backgroundColor: '#1B2A44' },
  ghostPlus: { fontFamily: FONT.display, fontSize: 26, color: C.muted },
  empty: { color: C.muted, fontWeight: '700', textAlign: 'center' },
});
