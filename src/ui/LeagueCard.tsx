import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { standings, weekFraction } from '../engine/league/ladder';
import { useLeague } from '../store/league';
import { Display } from './components';
import { Icon } from './icons';
import { Text } from './Text';
import { TierBadge, tierName } from './TierBadge';
import { alpha, C, FONT, R, S } from './theme';

/** "3d 4h" / "5h 12m" until next Monday 00:00 local. */
export function useWeekCountdown(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - ((now.getDay() + 6) % 7)));
  const mins = Math.max(0, Math.round((next.getTime() - now.getTime()) / 60000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${mins % 60}m`;
}

const ZONE = {
  promote: { color: C.neon, bg: alpha(C.neon, 0.16) },
  safe: { color: C.muted, bg: C.surface },
  relegate: { color: C.danger, bg: alpha(C.danger, 0.16) },
} as const;

/** League card: tier, countdown, your rank, and the zone you're in. */
export function LeagueCard() {
  const { t } = useTranslation();
  const league = useLeague();
  const countdown = useWeekCountdown();
  if (!league.week) return null;
  const me = standings(league.week, league.tier, league.points, weekFraction(new Date())).find((r) => r.you)!;
  const z = ZONE[me.zone];
  return (
    <Pressable onPress={() => router.push('/ladder')} testID="league-card" accessibilityRole="button"
      style={({ pressed }) => [styles.card, { borderColor: z.color, borderBottomColor: z.color }, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 3 }]}>
      <LinearGradient colors={[z.bg, C.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
      {me.zone !== 'safe' && (
        <View style={[styles.ribbon, { backgroundColor: z.color }]}><Text style={styles.ribbonText}>{t(`ladder.${me.zone}`)}</Text></View>
      )}
      <TierBadge tier={league.tier} size={62} />
      <View style={{ flex: 1, gap: 2 }}>
        <Display size={22} align="left">{t('ladder.title')}</Display>
        <View style={styles.meta}>
          <Text style={styles.tier}>{tierName(league.tier, (g) => t(`ladder.${g}`))}</Text>
          <Icon name="clock" size={18} />
          <Text style={styles.time}>{countdown}</Text>
        </View>
      </View>
      <View style={[styles.rank, { borderColor: z.color }]}>
        <Text style={[styles.rankText, { color: z.color }]}>#{me.rank}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, paddingTop: S.lg, borderRadius: 22, borderWidth: 2.5, borderBottomWidth: 6,
    backgroundColor: C.surface, marginTop: S.sm,
  },
  ribbon: { position: 'absolute', top: -13, right: 18, paddingHorizontal: 12, paddingVertical: 3, borderRadius: R.pill, borderWidth: 2, borderColor: C.bg },
  ribbonText: { color: C.ink, fontWeight: '800', fontSize: 12, letterSpacing: 1.5 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tier: { fontWeight: '900', color: C.text, fontSize: 15, marginRight: 6 },
  time: { fontWeight: '800', color: C.muted, fontSize: 14 },
  rank: { borderWidth: 2.5, borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: alpha(C.bg, 0.6) },
  rankText: { fontFamily: FONT.display, fontSize: 22 },
});
