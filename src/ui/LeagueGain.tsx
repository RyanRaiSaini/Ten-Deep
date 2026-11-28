import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { LADDER, PROMOTE, standings, weekFraction } from '../engine/league/ladder';
import { useLeague } from '../store/league';
import { Text } from './Text';
import { TierBadge } from './TierBadge';
import { C, FONT, R, S } from './theme';

/** "+38 league pts" with a bar filling toward the promotion line — every run visibly moves you. */
export function LeagueGain({ gained, stake }: { gained: number; stake?: 'snap' | 'safe' | null }) {
  const { t } = useTranslation();
  const league = useLeague();
  const [fill] = useState(() => new Animated.Value(0));
  const rows = league.week ? standings(league.week, league.tier, league.points, weekFraction(new Date())) : [];
  const me = rows.find((r) => r.you);
  const top = league.tier >= LADDER.length - 1;
  // The line to beat: whoever sits in the last promotion spot (not counting you).
  const line = rows.filter((r) => !r.you)[PROMOTE - 1]?.points ?? 0;
  const target = Math.max(1, top ? rows.filter((r) => !r.you)[0]?.points ?? 1 : line + 1);
  const ratio = Math.min(1, league.points / target);

  useEffect(() => {
    Animated.timing(fill, { toValue: ratio, duration: 900, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [fill, ratio]);

  if (!league.week || !me) return null;
  return (
    <Pressable onPress={() => router.push('/ladder')} style={styles.card} testID="league-gain" accessibilityRole="button">
      <TierBadge tier={league.tier} size={46} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.row}>
          <Text style={styles.gain}>+{gained} {t('ladder.pts')}{stake === 'snap' ? ` · ${t('stake.on')}` : ''}</Text>
          <Text style={styles.rank}>#{me.rank}</Text>
        </View>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          {!top && <View style={styles.line} />}
        </View>
        <Text style={styles.hint}>{me.zone === 'promote' ? t('ladder.inPromotion') : t('ladder.toPromotion', { n: Math.max(0, target - league.points) })}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: 20, backgroundColor: C.surface,
    borderWidth: 2, borderColor: C.line, borderBottomWidth: 6, borderBottomColor: C.edge,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  gain: { fontFamily: FONT.display, fontSize: 24, color: '#14A86B' },
  rank: { fontFamily: FONT.display, fontSize: 18, color: C.text },
  track: { height: 14, borderRadius: R.pill, backgroundColor: C.surface2, borderWidth: 2, borderColor: C.ink, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#18C08A' },
  line: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#FFC53D' },
  hint: { color: C.muted, fontWeight: '800', fontSize: 12 },
});
