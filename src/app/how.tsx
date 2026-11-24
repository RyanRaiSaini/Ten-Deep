/** How it works: the rules on one page, linked from the draft screen (and shareable: /how). */
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useGame } from '../store/game';
import { BackButton, Button, Display, Header, Screen } from '../ui/components';
import { Icon, type IconName } from '../ui/icons';
import { goBack } from '../ui/nav';
import { Text } from '../ui/Text';
import { C, FONT, R, S } from '../ui/theme';

const STEPS: { key: string; icon: IconName; color: string }[] = [
  { key: 'spin', icon: 'ball', color: C.hardwood },
  { key: 'roster', icon: 'clipboard', color: C.blue },
  { key: 'cap', icon: 'coin', color: C.gold },
  { key: 'rules', icon: 'shield', color: C.purple },
  { key: 'season', icon: 'calendar', color: C.teal },
  { key: 'playoffs', icon: 'trophy', color: C.danger },
  { key: 'challenge', icon: 'vs', color: C.neon },
];

export default function How() {
  const { t } = useTranslation();
  const idle = useGame((s) => s.phase === 'idle');
  const wide = useWindowDimensions().width >= 900;
  return (
    <Screen tint={C.hardwood} wide={wide}>
      <Header title="" left={<BackButton onPress={() => goBack()} />} />
      <View style={styles.hero} testID="how">
        <Display size={wide ? 40 : 32} extrude={C.hardwood}>{t('how.title')}</Display>
        <Text style={styles.intro}>{t('how.intro')}</Text>
      </View>
      <View style={[styles.grid, wide && styles.gridWide]}>
        {STEPS.map((s, i) => (
          <View key={s.key} style={[styles.card, wide && styles.cardWide]} testID={`how-${s.key}`}>
            <View style={styles.cardTop}>
              <View style={[styles.num, { backgroundColor: s.color }]}><Text style={styles.numText}>{i + 1}</Text></View>
              <Icon name={s.icon} size={30} />
              <Text style={styles.cardTitle}>{t(`how.${s.key}T`)}</Text>
            </View>
            <Text style={styles.cardBody}>{t(`how.${s.key}B`)}</Text>
          </View>
        ))}
      </View>
      {idle && (
        <Button label={t('how.play')} variant="gold" icon={<Icon name="play" size={22} />} testID="how-play"
          onPress={() => { useGame.getState().newRun('current-2026'); router.replace('/draft'); }} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: S.sm, paddingVertical: S.md },
  intro: { color: C.text, fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 23, maxWidth: 520 },
  grid: { gap: S.md },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    gap: S.sm, padding: S.md, borderRadius: R.lg, backgroundColor: '#FFFFFF',
    borderWidth: 2.5, borderColor: C.ink, borderBottomWidth: 6,
  },
  cardWide: { width: '48.8%' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  num: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: C.ink },
  numText: { fontFamily: FONT.display, fontSize: 18, color: '#FFFFFF' },
  cardTitle: { flex: 1, fontFamily: FONT.display, fontSize: 22, color: C.ink },
  cardBody: { color: C.text, fontSize: 15, lineHeight: 22 },
});
