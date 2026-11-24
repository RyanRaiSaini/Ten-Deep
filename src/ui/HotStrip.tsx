import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { current2026 } from '../data/current2026';
import { formLocked, normName } from '../engine/form';
import { useForm } from '../store/form';
import { Icon } from './icons';
import { ovrBadge } from './PlayerCard';
import { Text } from './Text';
import { teamGradient } from './teamColors';
import { C, FONT, R, S } from './theme';

/** "Heating up": today's biggest real-life risers (from NBA box scores), as team-coloured chips. */
export function HotStrip() {
  const { t } = useTranslation();
  const deltas = useForm((s) => s.deltas);
  const hot = useMemo(() => {
    const rows = current2026.teams.flatMap((team) =>
      team.players.map((p) => ({ p, team, d: formLocked(p.name) ? 0 : deltas[normName(p.name)]?.d ?? 0 })));
    return rows.filter((r) => r.d >= 3).sort((a, b) => b.d - a.d || b.p.ovr - a.p.ovr).slice(0, 10);
  }, [deltas]);
  if (!hot.length) return null;
  return (
    <View style={styles.wrap} testID="hot-strip">
      <View style={styles.head}>
        <Icon name="flame" size={26} />
        <Text style={styles.title}>{t('home.hot')}</Text>
        <Text style={styles.sub}>{t('home.hotSub')}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingVertical: 2 }}>
        {hot.map(({ p, team, d }) => (
          <View key={p.id} style={[styles.chip, { borderColor: teamGradient(team.colors)[0] }]}>
            <View style={[styles.ovr, { backgroundColor: ovrBadge(p.ovr) }]}><Text style={styles.ovrText}>{p.ovr}</Text></View>
            <View>
              <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.team} numberOfLines={1}>{team.name}</Text>
            </View>
            <View style={styles.delta}><Text style={styles.deltaText}>+{d}</Text></View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontFamily: FONT.display, fontSize: 20, color: C.ink },
  sub: { flex: 1, textAlign: 'right', color: C.muted, fontSize: 12, fontWeight: '700' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 6, paddingRight: 8, borderRadius: R.lg,
    backgroundColor: '#FFFFFF', borderWidth: 2.5, borderBottomWidth: 5, maxWidth: 230,
  },
  ovr: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.ink },
  ovrText: { fontFamily: FONT.display, fontSize: 17, color: '#FFFFFF' },
  name: { fontWeight: '900', color: C.ink, fontSize: 14, maxWidth: 130 },
  team: { color: C.muted, fontSize: 11, fontWeight: '700', maxWidth: 130 },
  delta: { backgroundColor: '#FF6A1A', borderRadius: R.pill, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1.5, borderColor: C.ink },
  deltaText: { color: '#FFFFFF', fontFamily: FONT.display, fontSize: 13 },
});
