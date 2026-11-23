import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCollection } from '../store/collection';
import { useGame } from '../store/game';
import { useProfile } from '../store/profile';
import { useSettings } from '../store/settings';
import { Avatar } from '../ui/Avatar';
import { Logo } from '../ui/Logo';
import { Button, Card, Label, Screen } from '../ui/components';
import { C, F, R, S } from '../ui/theme';
import { ACHIEVEMENTS } from '../engine/progress/achievements';
import { claimableCount, useProgress } from '../store/progress';

const MODES = [
  { key: 'current', poolId: 'current-2026', live: true, accent: C.hardwood },
  { key: 'collection', route: '/collection', live: true, accent: '#B26BFF', badge: 'NEW' },
  { key: 'career', route: '/career', live: true, accent: '#E84393', badge: 'NEW' },
  { key: 'crisis', picker: 'crisis', live: true, accent: '#FF7A1A' },
  { key: 'franchise', picker: 'franchise', live: true, accent: '#7C5CFF' },
  { key: 'era', picker: 'era', live: true, accent: C.gold },
  { key: 'daily', route: '/daily', live: true, accent: C.neon },
  { key: 'duels', route: '/duel', live: true, accent: C.danger },
] as const;

const ROUTE: Record<string, '/draft' | '/season' | '/deadline' | '/crisis' | '/playoffs' | '/result'> = {
  draft: '/draft', season: '/season', deadline: '/deadline', crisis: '/crisis', playoffs: '/playoffs', result: '/result',
};

export default function Home() {
  const { t } = useTranslation();
  const profile = useProfile();
  const flag = useSettings((s) => s.nationality);
  const phase = useGame((s) => s.phase);
  const newRun = useGame((s) => s.newRun);
  const pendingPicks = useCollection((s) => s.pending.length);
  const onboarded = useSettings((s) => s.onboarded);
  const claimable = useProgress(claimableCount);
  const achieved = useProgress((s) => Object.keys(s.unlocked).length);
  if (!onboarded) return <Redirect href="/welcome" />;

  return (
    <Screen tint={C.hardwood}>
      <View style={styles.top}>
        <Pressable onPress={() => router.push('/profile')} style={styles.avatar} testID="avatar" accessibilityLabel="Profile">
          <Avatar id={profile.avatarId} size={52} />
          <Text style={styles.flag}>{flag}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={styles.brandRow}>
            <Logo size={30} />
            <Text style={styles.brand}>TEN DEEP</Text>
          </View>
          <Text style={styles.tagline}>{t('app.tagline')}</Text>
        </View>
        <Pressable accessibilityLabel={t('settings.title')} onPress={() => router.push('/settings')} style={styles.gear}>
          <Text style={{ fontSize: 22, color: C.text }}>⚙</Text>
        </Pressable>
      </View>

      <Card style={styles.stats}>
        <Stat label={t('home.draftsPlayed')} value={`🔥 ${profile.draftsPlayed}`} />
        <Stat label={t('home.titles')} value={`🏆 ${profile.titles}`} />
        <Stat label={t('home.best')} value={profile.draftsPlayed ? `${profile.bestWins}-${profile.bestLosses}` : '—'} />
      </Card>

      {pendingPicks > 0 && (
        <Button label={`🎁  ${t('collect.waiting', { n: pendingPicks })}`} variant="gold" onPress={() => router.push('/packs')} testID="picks-banner" />
      )}
      <Card style={[styles.missions, claimable > 0 && { borderColor: C.gold }]} onPress={() => router.push('/missions')} testID="to-missions">
        <Text style={styles.missionsIcon}>🎯</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.modeTitle}>{t('missions.title')}</Text>
          <Text style={styles.modeDesc}>{t('missions.achievements')} · {achieved}/{ACHIEVEMENTS.length}</Text>
        </View>
        {claimable > 0 && <Text style={styles.claimBadge}>{t('missions.ready', { n: claimable })}</Text>}
      </Card>
      {phase !== 'idle' && (
        <Button label={`▶  ${t('home.resume')}`} variant="gold" onPress={() => router.push(ROUTE[phase])} testID="resume" />
      )}

      <Label>{t('home.modes')}</Label>
      {MODES.map((m) => (
        <Card
          key={m.key}
          style={[styles.mode, { borderColor: m.live ? m.accent : C.line, opacity: m.live ? 1 : 0.55 }]}
          onPress={
            !m.live ? undefined
              : 'picker' in m ? () => router.push(`/modes/${m.picker}`)
              : 'route' in m ? () => router.push(m.route)
              : () => { newRun(m.poolId); router.push('/draft'); }
          }
        >
          <View style={[styles.modeBar, { backgroundColor: m.accent }]} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.modeTitle}>
              {t(`mode.${m.key}.title`)}
              {'badge' in m && <Text style={[styles.badge, { color: m.accent }]}>  {m.badge}</Text>}
            </Text>
            <Text style={styles.modeDesc}>{t(`mode.${m.key}.desc`)}</Text>
          </View>
          <Text style={[styles.modeCta, { color: m.live ? m.accent : C.muted }]}>
            {m.live ? t('home.play') : t('common.comingSoon')}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingTop: S.lg },
  avatar: { width: 56, height: 56, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.hardwood },
  flag: { position: 'absolute', bottom: -6, right: -8, fontSize: 18 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { color: C.text, fontSize: 30, ...F.display, letterSpacing: 2 },
  tagline: { color: C.muted, fontSize: 13 },
  gear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', paddingVertical: S.lg },
  statValue: { color: C.text, fontSize: 22, ...F.display },
  statLabel: { color: C.muted, fontSize: 11, textAlign: 'center' },
  mode: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.lg },
  modeBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  modeTitle: { color: C.text, fontSize: 18, ...F.display },
  modeDesc: { color: C.muted, fontSize: 13 },
  modeCta: { fontWeight: '800', fontSize: 13 },
  missions: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  missionsIcon: { fontSize: 28 },
  claimBadge: { color: C.bg, backgroundColor: C.gold, fontWeight: '900', fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, overflow: 'hidden' },
  badge: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});
