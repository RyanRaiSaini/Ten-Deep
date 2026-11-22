import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useGame } from '../store/game';
import { useProfile } from '../store/profile';
import { useSettings } from '../store/settings';
import { Button, Card, Label, Screen } from '../ui/components';
import { C, F, R, S } from '../ui/theme';

const MODES = [
  { key: 'current', poolId: 'current-2026', live: true, accent: C.hardwood },
  { key: 'franchise', live: false, accent: '#7C5CFF' },
  { key: 'era', live: false, accent: C.gold },
  { key: 'daily', live: false, accent: C.neon },
  { key: 'duels', live: false, accent: C.danger },
] as const;

const ROUTE: Record<string, '/draft' | '/season' | '/deadline' | '/playoffs' | '/result'> = {
  draft: '/draft', season: '/season', deadline: '/deadline', playoffs: '/playoffs', result: '/result',
};

export default function Home() {
  const { t } = useTranslation();
  const profile = useProfile();
  const flag = useSettings((s) => s.nationality);
  const phase = useGame((s) => s.phase);
  const newRun = useGame((s) => s.newRun);

  return (
    <Screen>
      <View style={styles.top}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{flag}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>TEN DEEP</Text>
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

      {phase !== 'idle' && (
        <Button label={`▶  ${t('home.resume')}`} variant="gold" onPress={() => router.push(ROUTE[phase])} testID="resume" />
      )}

      <Label>{t('home.modes')}</Label>
      {MODES.map((m) => (
        <Card
          key={m.key}
          style={[styles.mode, { borderColor: m.live ? m.accent : C.line, opacity: m.live ? 1 : 0.55 }]}
          onPress={m.live ? () => { newRun(m.poolId); router.push('/draft'); } : undefined}
        >
          <View style={[styles.modeBar, { backgroundColor: m.accent }]} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.modeTitle}>{t(`mode.${m.key}.title`)}</Text>
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
  avatar: { width: 52, height: 52, borderRadius: R.pill, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.hardwood },
  avatarText: { fontSize: 26 },
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
});
