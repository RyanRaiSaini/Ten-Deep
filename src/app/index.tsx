import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { dailyKey } from '../engine/daily';
import { dailyMissions, missionProgress } from '../engine/progress/missions';
import { useCollection } from '../store/collection';
import { useGame } from '../store/game';
import { useProfile } from '../store/profile';
import { claimableCount, useProgress } from '../store/progress';
import { useSettings } from '../store/settings';
import { Avatar } from '../ui/Avatar';
import { Button, Chip, Display, IconButton, Label } from '../ui/components';
import { CourtArt, Icon, type IconName } from '../ui/icons';
import { Screen } from '../ui/components';
import { TabBar } from '../ui/TabBar';
import { Text } from '../ui/Text';
import { alpha, C, FONT, R, S } from '../ui/theme';

type ModeKey = 'franchise' | 'era' | 'crisis' | 'daily';
const MODES: { key: ModeKey; icon: IconName; accent: string; go: () => void; badge?: string }[] = [
  { key: 'franchise', icon: 'history', accent: C.purple, go: () => router.push('/modes/franchise') },
  { key: 'era', icon: 'clock', accent: C.teal, go: () => router.push('/modes/era') },
  { key: 'crisis', icon: 'siren', accent: C.danger, go: () => router.push('/modes/crisis'), badge: 'HOT' },
  { key: 'daily', icon: 'calendar', accent: C.blue, go: () => router.replace('/daily') },
];

const ROUTE: Record<string, '/draft' | '/season' | '/deadline' | '/crisis' | '/playoffs' | '/result'> = {
  draft: '/draft', season: '/season', deadline: '/deadline', crisis: '/crisis', playoffs: '/playoffs', result: '/result',
};

const shiftDay = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export default function Home() {
  const { t, i18n } = useTranslation();
  const profile = useProfile();
  const flag = useSettings((s) => s.nationality);
  const onboarded = useSettings((s) => s.onboarded);
  const phase = useGame((s) => s.phase);
  const pendingPicks = useCollection((s) => s.pending.length);
  const streak = useCollection((s) => s.streak);
  const lastDay = useCollection((s) => s.lastDay);
  const claimable = useProgress(claimableCount);
  const progress = useProgress();
  const [heroW, setHeroW] = useState(360);
  if (!onboarded) return <Redirect href="/welcome" />;

  const today = dailyKey();
  const missions = progress.day ? dailyMissions(progress.day) : [];
  const missionsDone = missions.filter((m) => missionProgress(m, progress.stats, progress.dayBase) >= m.target).length;
  const pct = missions.length ? Math.round((missionsDone / missions.length) * 100) : 0;
  // Week strip: the last five days, today, tomorrow. A day is checked if it's inside the current login streak.
  const days = [-5, -4, -3, -2, -1, 0, 1].map((n) => shiftDay(today, n));
  const checked = (d: string) => !!lastDay && d <= lastDay && d > shiftDay(lastDay, -streak);
  const weekday = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(i18n.language, { weekday: 'short', timeZone: 'UTC' });

  const startCurrent = () => { useGame.getState().newRun('current-2026'); router.push('/draft'); };

  return (
    <Screen tint={C.hardwood} footer={<TabBar active="play" />}>
      <View style={styles.top}>
        <Chip label={t('home.streak')} testID="streak-chip"><Icon name="flame" size={26} /><Text style={styles.chipNum}>{streak}</Text></Chip>
        <Chip onPress={() => router.push('/profile')} testID="avatar" label={t('profile.title')}>
          <Avatar id={profile.avatarId} size={30} />
          <Text style={styles.chipFlag}>{flag}</Text>
          <Text style={styles.chipName} numberOfLines={1}>{profile.name || t('home.player')}</Text>
        </Chip>
        <IconButton onPress={() => router.push('/settings')} label={t('settings.title')} testID="settings"><Icon name="gear" size={28} /></IconButton>
      </View>

      <View style={styles.logoRow}>
        <Pressable onPress={() => router.push('/missions')} style={styles.tile} testID="to-missions" accessibilityRole="button" accessibilityLabel={t('missions.title')}>
          <Icon name="clipboard" size={40} />
          <Text style={styles.tilePct}>{pct}%</Text>
          <View style={styles.tileBar}><View style={[styles.tileFill, { width: `${pct}%` }]} /></View>
          {claimable > 0 && <View style={styles.dot}><Text style={styles.dotText}>{claimable}</Text></View>}
        </Pressable>
        <View style={styles.logo}>
          <View style={styles.logoBall}><Icon name="ball" size={40} /></View>
          <Display size={46}>TEN DEEP</Display>
          <Text style={styles.tagline}>{t('app.tagline')}</Text>
        </View>
        <Pressable onPress={() => router.push('/packs')} style={styles.tile} testID="picks-banner" accessibilityRole="button" accessibilityLabel={t('collect.waiting', { count: pendingPicks })}>
          <Icon name="gift" size={40} />
          <Text style={styles.tileLabel}>{t('home.picks')}</Text>
          {pendingPicks > 0 && <View style={styles.dot}><Text style={styles.dotText}>{pendingPicks}</Text></View>}
        </Pressable>
      </View>

      <View style={styles.week}>
        {days.map((d) => {
          const isToday = d === today;
          return (
            <View key={d} style={[styles.day, isToday && styles.dayToday]}>
              <Text style={[styles.dayName, d > today && { opacity: 0.4 }]}>{weekday(d)}</Text>
              <View style={[styles.dayCircle, isToday && styles.dayCircleToday, d > today && { opacity: 0.4 }]}>
                {checked(d) ? <Icon name="check" size={isToday ? 34 : 28} /> : <Text style={styles.dayNum}>{Number(d.slice(8))}</Text>}
              </View>
            </View>
          );
        })}
      </View>

      {phase !== 'idle' && (
        <Button label={t('home.resume')} variant="dark" icon={<Icon name="play" size={20} />} onPress={() => router.push(ROUTE[phase])} testID="resume" />
      )}

      <Pressable onPress={startCurrent} testID="mode-current" accessibilityRole="button" accessibilityLabel={t('mode.current.title')}
        style={({ pressed }) => [styles.hero, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 4 }]}
        onLayout={(e: LayoutChangeEvent) => setHeroW(e.nativeEvent.layout.width)}>
        <View style={StyleSheet.absoluteFill}><CourtArt width={heroW} height={190} color={C.hardwood} /></View>
        <LinearGradient colors={['rgba(255,116,23,0)', 'rgba(214,40,90,0.55)']} start={{ x: 0.2, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.heroBody}>
          <Text style={styles.heroKicker}>2026-27</Text>
          <Display size={38} align="left">{t('mode.current.title')}</Display>
          <Text style={styles.heroDesc}>{t('mode.current.desc')}</Text>
        </View>
        <View style={styles.heroPlay}><Text style={styles.heroPlayText}>{t('home.play').toUpperCase()}</Text></View>
      </Pressable>

      <Label>{t('home.modes')}</Label>
      {MODES.map((m) => (
        <Pressable key={m.key} onPress={m.go} testID={`mode-${m.key}`} accessibilityRole="button" accessibilityLabel={t(`mode.${m.key}.title`)}
          style={({ pressed }) => [styles.mode, { borderColor: m.accent, borderBottomColor: m.accent }, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 3 }]}>
          <LinearGradient colors={[alpha(m.accent, 0.22), alpha(m.accent, 0.04)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          <View style={[styles.badge, { backgroundColor: alpha(m.accent, 0.15), borderColor: C.ink }]}><Icon name={m.icon} size={40} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Display size={22} align="left">{t(`mode.${m.key}.title`)}</Display>
            <Text style={styles.modeDesc} numberOfLines={2}>{t(`mode.${m.key}.desc`)}</Text>
          </View>
          {m.badge && <View style={[styles.ribbon, { backgroundColor: m.accent }]}><Text style={styles.ribbonText}>{m.badge}</Text></View>}
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingTop: S.md, justifyContent: 'space-between' },
  chipNum: { fontFamily: FONT.display, fontSize: 22, color: C.ink },
  chipFlag: { fontSize: 20 },
  chipName: { fontWeight: '900', fontSize: 16, color: C.ink, maxWidth: 110 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.sm },
  tile: {
    width: 76, height: 84, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: C.line, borderBottomWidth: 5,
    borderBottomColor: C.edge, alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  tilePct: { fontFamily: FONT.display, fontSize: 17, color: C.ink },
  tileLabel: { fontFamily: FONT.display, fontSize: 15, color: C.ink },
  tileBar: { width: 50, height: 6, borderRadius: 3, backgroundColor: C.line, overflow: 'hidden' },
  tileFill: { height: 6, backgroundColor: C.hardwood },
  dot: { position: 'absolute', top: -8, right: -8, minWidth: 24, height: 24, borderRadius: 12, backgroundColor: C.danger, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  dotText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  logo: { flex: 1, alignItems: 'center' },
  logoBall: { position: 'absolute', top: -22, right: 4, transform: [{ rotate: '-18deg' }] },
  tagline: { fontWeight: '900', color: C.ink, fontSize: 14, marginTop: 2 },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: S.sm },
  day: { alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 2, borderRadius: 18 },
  dayToday: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: C.line, borderBottomWidth: 5, borderBottomColor: C.edge, paddingHorizontal: 6 },
  dayName: { fontWeight: '800', color: C.muted, fontSize: 13 },
  dayCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, borderColor: C.edge, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  dayCircleToday: { width: 46, height: 46, borderRadius: 23, borderColor: C.ink, borderWidth: 3 },
  dayNum: { fontFamily: FONT.display, fontSize: 17, color: C.muted },
  hero: {
    height: 190, borderRadius: 26, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, marginTop: S.sm,
    justifyContent: 'center',
  },
  heroBody: { paddingHorizontal: S.xl, gap: 2 },
  heroKicker: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 2, fontSize: 13 },
  heroDesc: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, maxWidth: 230, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  heroPlay: {
    position: 'absolute', right: 16, bottom: 16, backgroundColor: '#FFFFFF', borderRadius: R.pill, paddingHorizontal: 22, paddingVertical: 10,
    borderWidth: 3, borderColor: C.ink, borderBottomWidth: 6,
  },
  heroPlayText: { fontFamily: FONT.display, fontSize: 22, color: C.ink },
  mode: {
    flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: 22, borderWidth: 2.5, borderBottomWidth: 6,
    backgroundColor: '#FFFFFF', overflow: 'visible',
  },
  badge: { width: 62, height: 62, borderRadius: 16, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  modeDesc: { color: C.muted, fontSize: 13, fontWeight: '700' },
  ribbon: { position: 'absolute', top: -12, right: 18, paddingHorizontal: 12, paddingVertical: 3, borderRadius: R.pill, borderWidth: 2, borderColor: '#FFFFFF' },
  ribbonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
});
