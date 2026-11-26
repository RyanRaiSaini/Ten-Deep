/**
 * The first time someone opens any game mode, a short "how to play" card pops up over the draft before their first
 * spin. Shown once (settings.introSeen); anyone who has already finished a draft never sees it.
 */
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useProfile } from '../store/profile';
import { useSettings } from '../store/settings';
import { Button, Display } from './components';
import { Icon, type IconName } from './icons';
import { Text } from './Text';
import { C, FONT, R, S } from './theme';

const STEPS: { key: string; icon: IconName; color: string }[] = [
  { key: 's1', icon: 'ball', color: C.hardwood },
  { key: 's2', icon: 'coin', color: C.gold },
  { key: 's3', icon: 'calendar', color: C.teal },
  { key: 's4', icon: 'trophy', color: C.danger },
];

export function FirstRunIntro() {
  const { t } = useTranslation();
  const seen = useSettings((s) => s.introSeen);
  const played = useProfile((s) => s.draftsPlayed);
  if (seen || played > 0) return null;
  const close = () => useSettings.getState().set({ introSeen: true });
  return (
    <Modal transparent animationType="fade" onRequestClose={close}>
      <View style={styles.scrim}>
        <View style={styles.card} testID="intro">
          <Display size={30} extrude={C.hardwood}>{t('intro.title')}</Display>
          <Text style={styles.lead}>{t('intro.lead')}</Text>
          {STEPS.map((s, i) => (
            <View key={s.key} style={styles.step}>
              <View style={[styles.num, { backgroundColor: s.color }]}><Text style={styles.numText}>{i + 1}</Text></View>
              <Icon name={s.icon} size={28} />
              <Text style={styles.stepText}>{t(`intro.${s.key}`)}</Text>
            </View>
          ))}
          <Button label={t('intro.go')} variant="gold" icon={<Icon name="play" size={22} />} onPress={close} testID="intro-go" />
          <Pressable onPress={() => { close(); router.push('/how'); }} accessibilityRole="link" testID="intro-rules">
            <Text style={styles.rules}>{t('intro.rules')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(8,10,30,0.6)', alignItems: 'center', justifyContent: 'center', padding: S.lg },
  card: {
    width: '100%', maxWidth: 460, backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 8,
    padding: S.lg, gap: S.md, alignItems: 'stretch',
  },
  lead: { color: C.text, fontSize: 15, fontWeight: '700', textAlign: 'center', lineHeight: 21 },
  step: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  num: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.ink },
  numText: { color: '#FFFFFF', fontFamily: FONT.display, fontSize: 15 },
  stepText: { flex: 1, color: C.text, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  rules: { color: C.blue, fontWeight: '900', textAlign: 'center', fontSize: 14 },
});
