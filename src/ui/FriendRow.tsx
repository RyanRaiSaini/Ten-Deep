import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import type { Friend } from '../store/friends';
import { Avatar } from './Avatar';
import { Icon } from './icons';
import { Text } from './Text';
import { TierBadge } from './TierBadge';
import { C, FONT, R, S } from './theme';

/** A friend in the list: avatar, name, league badge and your W-L-D against them. */
export function FriendRow({ f }: { f: Friend }) {
  const { t } = useTranslation();
  const { w, l, d } = f.record;
  const lead = w > l ? '#14A86B' : w < l ? C.danger : C.muted;
  return (
    <Pressable onPress={() => router.push({ pathname: '/friends/[pin]', params: { pin: f.pin } })} testID={`friend-${f.pin}`} accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}>
      <Avatar id={f.snap.avatar} size={46} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.name} numberOfLines={1}>{f.snap.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{t('friends.cards', { n: f.snap.stats.cards })}</Text>
          <Icon name="trophy" size={15} />
          <Text style={styles.meta}>{f.snap.stats.titles}</Text>
        </View>
      </View>
      <TierBadge tier={f.snap.stats.tier} size={34} />
      <View style={[styles.rec, { borderColor: lead }]}>
        <Text style={[styles.recText, { color: lead }]}>{w}-{l}{d ? `-${d}` : ''}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.sm + 2, borderRadius: R.lg, backgroundColor: '#FFFFFF',
    borderWidth: 2, borderColor: C.line, borderBottomWidth: 5, borderBottomColor: C.edge,
  },
  name: { fontSize: 17, fontWeight: '900', color: C.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 13, color: C.muted, fontWeight: '700' },
  rec: { minWidth: 58, alignItems: 'center', borderWidth: 2.5, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 },
  recText: { fontFamily: FONT.display, fontSize: 18 },
});
