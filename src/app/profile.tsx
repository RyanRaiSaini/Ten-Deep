import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { useProfile } from '../store/profile';
import { useSettings } from '../store/settings';
import { Avatar } from '../ui/Avatar';
import { AVATARS, avatarById } from '../ui/avatars';
import { BackButton, Card, Header, Label, Screen } from '../ui/components';
import { C, F, R, S } from '../ui/theme';

export default function Profile() {
  const { t } = useTranslation();
  const p = useProfile();
  const flag = useSettings((s) => s.nationality);
  const current = avatarById(p.avatarId);

  return (
    <Screen>
      <Header title={t('profile.title')} left={<BackButton onPress={() => router.back()} />} />
      <View style={styles.hero}>
        <Avatar id={current.id} size={132} />
        <Text style={styles.name}>{flag}</Text>
      </View>
      <Card style={styles.stats}>
        <Stat label={t('home.draftsPlayed')} value={String(p.draftsPlayed)} />
        <Stat label={t('home.titles')} value={String(p.titles)} />
        <Stat label={t('home.best')} value={p.draftsPlayed ? `${p.bestWins}-${p.bestLosses}` : '—'} />
      </Card>
      <Label>{t('profile.pick')}</Label>
      <View style={styles.grid}>
        {AVATARS.map((a) => (
          <Pressable
            key={a.id}
            testID={`avatar-${a.id}`}
            onPress={() => p.set({ avatarId: a.id })}
            style={[styles.cell, a.id === current.id && styles.on]}
            accessibilityRole="button"
            accessibilityState={{ selected: a.id === current.id }}
          >
            <Avatar id={a.id} size={72} />
            {a.id === current.id && <Text style={styles.check}>✓</Text>}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: S.sm, paddingVertical: S.md },
  name: { color: C.text, fontSize: 20, ...F.display },
  stats: { flexDirection: 'row' },
  value: { color: C.text, fontSize: 22, ...F.display },
  label: { color: C.muted, fontSize: 11, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, justifyContent: 'center' },
  cell: { padding: 3, borderRadius: R.pill, borderWidth: 2, borderColor: 'transparent' },
  on: { borderColor: C.neon },
  check: { position: 'absolute', right: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, overflow: 'hidden', backgroundColor: C.bg, color: C.neon, textAlign: 'center', lineHeight: 22, fontWeight: '900', borderWidth: 2, borderColor: C.neon },
});
