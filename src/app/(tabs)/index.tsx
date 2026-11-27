import { useAccount } from '../../store/account';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { dailyKey } from '../../engine/daily';
import { dailyMissions, missionProgress } from '../../engine/progress/missions';
import { useCollection } from '../../store/collection';
import { useGame } from '../../store/game';
import { useProfile } from '../../store/profile';
import { claimableCount, useProgress } from '../../store/progress';
import { useSettings } from '../../store/settings';
import { Die } from '../../ui/Dice';
import { useShop } from '../../store/shop';
import { DailyTimer } from '../../ui/DailyTimer';
import { HotStrip } from '../../ui/HotStrip';
import { Avatar } from '../../ui/Avatar';
import { AVATARS } from '../../ui/avatars';
import { Button, Chip, Display, IconButton, Label , Screen } from '../../ui/components';
import { CourtArt, Icon, type IconName } from '../../ui/icons';
import { BrandLogo } from '../../ui/BrandLogo';
import { useLeague } from '../../store/league';
import { LeagueCard } from '../../ui/LeagueCard';
import { TierBadge, tierName } from '../../ui/TierBadge';
import { Text } from '../../ui/Text';
import { C, FONT, R, S } from '../../ui/theme';

type ModeKey = 'weekly' | 'franchise' | 'crisis' | 'daily';
/** Magic vs. Bird → Jordan → Kobe → LeBron → Steph → Modern, left to right across the Time Machine banner. */
const ERA_COLORS = ['#552583', '#CE1141', '#FDB927', '#860038', '#1D428A', '#0E7C86'];
/** Each mode is a court banner in its own colors (court tint, light streak). */
const MODE_H = 128;

const MODES: { key: ModeKey; icon: IconName; accent: string; court: string; streak: string; go: () => void; badge?: string }[] = [
  { key: 'weekly', icon: 'trophy', accent: C.purple, court: '#5B21B6', streak: '#FFC53D', go: () => router.push('/weekly'), badge: 'NEW' },
  { key: 'franchise', icon: 'history', accent: C.purple, court: '#4B2BC2', streak: '#F5C451', go: () => router.push('/modes/franchise') },
  { key: 'crisis', icon: 'siren', accent: C.danger, court: '#B3202E', streak: '#FF9A3D', go: () => router.push('/modes/crisis'), badge: 'HOT' },
  { key: 'daily', icon: 'calendar', accent: C.blue, court: '#1F4FD1', streak: '#5BD7FF', go: () => router.navigate('/daily') },
];

const ROUTE: Record<string, '/draft' | '/season' | '/deadline' | '/crisis' | '/rebuild' | '/playoffs' | '/result'> = {
  draft: '/draft', season: '/season', deadline: '/deadline', crisis: '/crisis', rebuild: '/rebuild', playoffs: '/playoffs', result: '/result',
};

const shiftDay = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export default function Home() {
  const signedIn = useAccount((s) => !!s.provider);
  const { t, i18n } = useTranslation();
  const profile = useProfile();
  const flag = useSettings((s) => s.nationality);
  const onboarded = useSettings((s) => s.onboarded);
  const phase = useGame((s) => s.phase);
  const pendingPicks = useCollection((s) => s.pending.length);
  const streak = useCollection((s) => s.streak);
  const freezes = useCollection((s) => s.freezes ?? 0);
  const freezesUsed = useCollection((s) => s.freezesUsed ?? 0);
  const lastDay = useCollection((s) => s.lastDay);
  const claimable = useProgress(claimableCount);
  const progress = useProgress();
  const [heroW, setHeroW] = useState(360);
  const winW = useWindowDimensions().width;
  const leagueResult = useLeague((s) => s.result);
  // Hooks stay above the redirect: the hook count must not change when `onboarded` flips.
  const rerolls = useShop((s) => s.rerolls);
  const freeReady = useShop((s) => s.freeDay !== dailyKey());
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
    <Screen tint={C.hardwood} tabbed>
      <View style={styles.top}>
        <Chip label={t('home.streak')} testID="streak-chip">
          <Icon name="flame" size={26} /><Text style={styles.chipNum}>{streak}</Text>
          {freezes > 0 && <><Icon name="freeze" size={20} /><Text style={styles.freezeNum}>{freezes}</Text></>}
        </Chip>
        <Chip onPress={() => router.push('/shop')} testID="shop-chip" label={t('shop.title')}>
          <Die size={26} color="white" /><Text style={styles.chipNum}>{rerolls}</Text>
          {freeReady && <View style={styles.freeDot} />}
        </Chip>
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
          <BrandLogo scale={winW < 380 ? 1 : 1.15} testID="brand-logo" />
          <Text style={styles.tagline} numberOfLines={1} adjustsFontSizeToFit>{t('app.tagline')}</Text>
        </View>
        <Pressable onPress={() => router.push('/packs')} style={styles.tile} testID="picks-banner" accessibilityRole="button" accessibilityLabel={t('collect.waiting', { count: pendingPicks })}>
          <Icon name="gift" size={40} />
          <Text style={styles.tileLabel}>{t('home.picks')}</Text>
          {pendingPicks > 0 && <View style={styles.dot}><Text style={styles.dotText}>{pendingPicks}</Text></View>}
        </Pressable>
      </View>

      <View style={styles.streakBoard} testID="streak-board">
        <LinearGradient colors={['#1C2A57', '#101734']} style={StyleSheet.absoluteFill} />
        <View style={styles.streakHead}>
          <Icon name="flame" size={24} />
          <Text style={styles.streakNum}>{streak}</Text>
          <Text style={styles.streakLabel}>{t('home.streak')}</Text>
        </View>
        <View style={styles.week}>
          {days.map((d, i) => {
            const isToday = d === today;
            const done = checked(d);
            const chained = done && i > 0 && checked(days[i - 1]);
            return (
              <View key={d} style={styles.day}>
                {chained && <View style={styles.chain} />}
                <Text style={[styles.dayName, isToday && { color: '#FFC53D' }, d > today && { opacity: 0.35 }]}>{weekday(d)}</Text>
                <View style={[styles.dayCircle, done && styles.dayDone, isToday && styles.dayCircleToday, d > today && { opacity: 0.35 }]}>
                  {done ? <Text style={styles.dayCheck}>✓</Text> : <Text style={styles.dayNum}>{Number(d.slice(8))}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {!signedIn && (
        <Pressable onPress={() => router.push('/signin')} style={({ pressed }) => [styles.signin, pressed && { transform: [{ translateY: 2 }] }]}
          testID="home-signin" accessibilityRole="button" accessibilityLabel={t('signin.cta')}>
          <Icon name="globe" size={30} />
          <View style={{ flex: 1 }}>
            <Text style={styles.signinTitle}>{t('signin.cta')}</Text>
            <Text style={styles.signinSub}>{t('signin.ctaSub')}</Text>
          </View>
          <Text style={styles.signinGo}>›</Text>
        </Pressable>
      )}

      {freezesUsed > 0 && (
        <View style={styles.saved} testID="streak-saved">
          <Icon name="freeze" size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.resultTitle}>{t('home.streakSaved')}</Text>
            <Text style={styles.resultSub}>{t('home.streakSavedBody', { count: freezesUsed })}</Text>
          </View>
          <Button label="OK" variant="blue" onPress={() => useCollection.setState({ freezesUsed: 0 })} style={{ paddingHorizontal: 18, minHeight: 44, paddingVertical: 8 }} />
        </View>
      )}
      {leagueResult && (
        <View style={styles.result} testID="league-result">
          <TierBadge tier={leagueResult.tier} size={54} />
          <View style={{ flex: 1 }}>
            <Text style={styles.resultTitle}>
              {leagueResult.tier > leagueResult.from ? t('ladder.promoted', { tier: tierName(leagueResult.tier, (g) => t(`ladder.${g}`)) })
                : leagueResult.tier < leagueResult.from ? t('ladder.relegated', { tier: tierName(leagueResult.tier, (g) => t(`ladder.${g}`)) })
                : t('ladder.stayed', { tier: tierName(leagueResult.tier, (g) => t(`ladder.${g}`)) })}
            </Text>
            <Text style={styles.resultSub}>{t('ladder.finished', { rank: leagueResult.rank })}{leagueResult.reward ? ` · ${t(`collect.t_${leagueResult.reward}`)}` : ''}</Text>
          </View>
          <Button label="OK" variant="dark" onPress={() => useLeague.getState().dismiss()} style={{ paddingHorizontal: 18, minHeight: 44, paddingVertical: 8 }} />
        </View>
      )}
      <LeagueCard />

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

      <HotStrip />

      <Pressable onPress={() => router.navigate('/duel')} testID="duel-banner" accessibilityRole="button"
        style={({ pressed }) => [styles.duel, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 3 }]}>
        <Icon name="vs" size={64} />
        <View style={{ flex: 1, gap: 6 }}>
          <Display size={22} align="left">{t('home.duelTitle')}</Display>
          <View style={styles.duelRow}>
            <View style={styles.faces}>
              {[3, 8, 25].map((i, k) => (
                <View key={i} style={[styles.face, { marginLeft: k ? -12 : 0, zIndex: 3 - k }]}><Avatar id={AVATARS[i].id} size={30} /></View>
              ))}
            </View>
            <View style={styles.duelPill}><Text style={styles.duelPillText}>{t('home.duelCta')}</Text></View>
          </View>
        </View>
      </Pressable>

      <Label>{t('home.modes')}</Label>
      {/* The eras: the second-biggest banner on Home, first among the modes. */}
      <Pressable onPress={() => router.push('/modes/era')} testID="mode-era" accessibilityRole="button" accessibilityLabel={t('mode.era.title')}
        style={({ pressed }) => [styles.hero, { marginTop: 0 }, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 4 }]}>
        <View style={StyleSheet.absoluteFill}><CourtArt width={heroW} height={190} color="#2B1B6B" color2="#FFC53D" /></View>
        <LinearGradient colors={ERA_COLORS.map((c) => `${c}C8`) as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(8,10,30,0)', 'rgba(8,10,30,0.45)']} style={StyleSheet.absoluteFill} />
        <View style={styles.heroBody}>
          <Text style={styles.heroKicker}>1958 – 2026</Text>
          <Display size={38} align="left">{t('mode.era.title')}</Display>
          <Text style={styles.heroDesc}>{t('mode.era.desc')}</Text>
        </View>
        <View style={styles.heroPlay}><Text style={styles.heroPlayText}>{t('home.play').toUpperCase()}</Text></View>
      </Pressable>
      {MODES.map((m) => (
        <Pressable key={m.key} onPress={m.go} testID={`mode-${m.key}`} accessibilityRole="button" accessibilityLabel={t(`mode.${m.key}.title`)}
          style={({ pressed }) => [styles.mode, pressed && { transform: [{ translateY: 3 }], borderBottomWidth: 4 }]}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: 'hidden' }]}>
            <CourtArt width={heroW} height={MODE_H} color={m.court} color2={m.streak} />
            <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(8,10,30,0.45)']} start={{ x: 0.3, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Display size={26} align="left">{t(`mode.${m.key}.title`)}</Display>
            <Text style={styles.modeDesc} numberOfLines={3}>{t(`mode.${m.key}.desc`)}</Text>
            {m.key === 'daily' && <DailyTimer small testID="home-daily-timer" />}
          </View>
          <View style={styles.modeIcon}><Icon name={m.icon} size={44} /></View>
          {m.badge && <View style={[styles.ribbon, { backgroundColor: m.accent }]}><Text style={styles.ribbonText}>{m.badge}</Text></View>}
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  signin: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 6, padding: S.md },
  signinTitle: { color: C.ink, fontWeight: '900', fontSize: 15 },
  signinSub: { color: C.muted, fontWeight: '700', fontSize: 12 },
  signinGo: { color: C.muted, fontSize: 24, fontWeight: '900' },
  freeDot: { position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderRadius: 7, backgroundColor: C.danger, borderWidth: 2, borderColor: '#FFFFFF' },
  top: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingTop: S.md, justifyContent: 'space-between' },
  chipNum: { fontFamily: FONT.display, fontSize: 22, color: C.ink },
  chipFlag: { fontSize: 20 },
  freezeNum: { fontFamily: FONT.display, fontSize: 16, color: C.blue },
  saved: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: 20, backgroundColor: '#E6F4FF', borderWidth: 2.5, borderColor: C.blue, borderBottomWidth: 6 },
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
  tagline: { fontWeight: '800', color: C.ink, fontSize: 12.5, marginTop: 2, textAlign: 'center' },
  streakBoard: {
    marginTop: S.sm, borderRadius: 22, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 6,
    paddingHorizontal: S.md, paddingTop: S.sm, paddingBottom: S.md, gap: 6,
  },
  streakHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakNum: { fontFamily: FONT.display, fontSize: 22, color: '#FFC53D' },
  streakLabel: { color: '#C9D2EE', fontWeight: '900', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { flex: 1, alignItems: 'center', gap: 4 },
  chain: { position: 'absolute', bottom: 18, right: '50%', width: '100%', height: 6, borderRadius: 3, backgroundColor: '#FF7417', shadowColor: '#FF9A3D', shadowOpacity: 0.9, shadowRadius: 6 },
  dayName: { fontWeight: '800', color: '#AEB6CC', fontSize: 12 },
  dayCircle: { width: 38, height: 38, borderRadius: 19, borderWidth: 2.5, borderColor: '#3B4A7A', backgroundColor: '#1A2447', alignItems: 'center', justifyContent: 'center' },
  dayDone: { backgroundColor: '#FF7417', borderColor: '#FFC53D', shadowColor: '#FF9A3D', shadowOpacity: 0.9, shadowRadius: 8 },
  dayCircleToday: { width: 44, height: 44, borderRadius: 22, borderColor: '#FFC53D', borderWidth: 3.5 },
  dayCheck: { color: '#FFFFFF', fontFamily: FONT.display, fontSize: 20, marginTop: -1 },
  dayNum: { fontFamily: FONT.display, fontSize: 16, color: '#C9D2EE' },
  hero: {
    height: 190, borderRadius: 26, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, marginTop: S.sm,
    justifyContent: 'center',
  },
  heroBody: { paddingHorizontal: S.xl, gap: 2, paddingBottom: 40, maxWidth: '100%' },
  heroKicker: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 2, fontSize: 13 },
  heroDesc: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, maxWidth: '58%', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  heroPlay: {
    position: 'absolute', right: 16, bottom: 16, backgroundColor: '#FFFFFF', borderRadius: R.pill, paddingHorizontal: 22, paddingVertical: 10,
    borderWidth: 3, borderColor: C.ink, borderBottomWidth: 6,
  },
  heroPlayText: { fontFamily: FONT.display, fontSize: 22, color: C.ink },
  duel: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: C.line, borderBottomWidth: 6, borderBottomColor: C.edge },
  duelRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  faces: { flexDirection: 'row' },
  face: { borderRadius: 18, borderWidth: 2.5, borderColor: '#FFFFFF' },
  duelPill: { borderRadius: R.pill, borderWidth: 2.5, borderColor: C.ink, borderBottomWidth: 4, paddingHorizontal: 14, paddingVertical: 5, backgroundColor: '#FFFFFF' },
  duelPillText: { fontWeight: '900', color: C.ink, fontSize: 14 },
  mode: {
    flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md, minHeight: MODE_H,
    borderRadius: 24, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, overflow: 'visible',
  },
  modeIcon: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: C.ink, borderBottomWidth: 5,
  },
  badge: { width: 62, height: 62, borderRadius: 16, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  modeDesc: { color: '#FFFFFF', fontSize: 13, lineHeight: 17, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  result: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: 20, backgroundColor: '#FFF1D6', borderWidth: 2.5, borderColor: C.gold, borderBottomWidth: 6 },
  resultTitle: { fontFamily: FONT.display, fontSize: 19, color: C.ink },
  resultSub: { color: C.muted, fontWeight: '800', fontSize: 13 },
  ribbon: { position: 'absolute', top: -12, right: 18, paddingHorizontal: 12, paddingVertical: 3, borderRadius: R.pill, borderWidth: 2, borderColor: '#FFFFFF' },
  ribbonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
});
