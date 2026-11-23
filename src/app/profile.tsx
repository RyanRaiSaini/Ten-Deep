import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../ui/Text';
import { useProfile } from '../store/profile';
import { useSettings } from '../store/settings';
import { Avatar } from '../ui/Avatar';
import { AVATARS, avatarById } from '../ui/avatars';
import { BackButton, Card, Header, Label, Screen } from '../ui/components';
import { C, F, FONT, R, S } from '../ui/theme';
import { goBack } from '../ui/nav';

const GAP = 8;

export default function Profile() {
  // Four across on phones (more on wide screens), edge to edge.
  const [gridW, setGridW] = useState(358);
  const cols = Math.max(4, Math.floor((gridW + GAP) / (96 + GAP)));
  const cell = Math.floor((gridW - GAP * (cols - 1)) / cols) - 10;
  const { t } = useTranslation();
  const p = useProfile();
  const flag = useSettings((s) => s.nationality);
  const current = avatarById(p.avatarId);

  return (
    <Screen>
      <Header title={t('profile.title')} left={<BackButton onPress={() => goBack()} />} />
      <View style={styles.hero}>
        <Avatar id={current.id} size={132} />
        <View style={styles.nameRow}>
          <Text style={styles.flagBig}>{flag}</Text>
          <TextInput
            value={p.name}
            onChangeText={(name) => p.set({ name: name.slice(0, 18) })}
            placeholder={t('profile.namePlaceholder')}
            placeholderTextColor={C.muted}
            style={styles.nameInput}
            maxLength={18}
            autoCorrect={false}
            testID="profile-name"
            accessibilityLabel={t('profile.namePlaceholder')}
          />
        </View>
      </View>
      <Card style={styles.stats}>
        <Stat label={t('home.draftsPlayed')} value={String(p.draftsPlayed)} testID="stat-drafts" />
        <Stat label={t('home.titles')} value={String(p.titles)} />
        <Stat label={t('home.best')} value={p.draftsPlayed ? `${p.bestWins}-${p.bestLosses}` : '—'} />
      </Card>
      <Label>{t('profile.pick')}</Label>
      <View style={styles.grid} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
        {AVATARS.map((a) => (
          <Pressable
            key={a.id}
            testID={`avatar-${a.id}`}
            onPress={() => p.set({ avatarId: a.id })}
            style={[styles.cell, a.id === current.id && styles.on]}
            accessibilityRole="button"
            accessibilityState={{ selected: a.id === current.id }}
          >
            <Avatar id={a.id} size={cell} />
            {a.id === current.id && <Text style={styles.check}>✓</Text>}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function Stat({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={styles.value} testID={testID}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: S.sm, paddingVertical: S.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  flagBig: { fontSize: 28 },
  nameInput: { fontFamily: FONT.display, fontSize: 26, color: C.ink, minWidth: 160, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: C.line, borderBottomWidth: 4, borderBottomColor: C.edge },
  name: { color: C.text, fontSize: 20, ...F.display },
  stats: { flexDirection: 'row' },
  value: { color: C.text, fontSize: 22, ...F.display },
  label: { color: C.muted, fontSize: 11, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: { padding: 3, borderRadius: R.pill, borderWidth: 2, borderColor: 'transparent' },
  on: { borderColor: C.neon },
  check: { position: 'absolute', right: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, overflow: 'hidden', backgroundColor: C.bg, color: C.neon, textAlign: 'center', lineHeight: 22, fontWeight: '900', borderWidth: 2, borderColor: C.neon },
});
