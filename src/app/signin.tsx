/**
 * Sign in: continue with Google (Apple on iPhone once the store build is out) and your progress follows you. Cards,
 * packs, records, career and friends save to your account and load on any device you sign in on (net/sync.ts).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useAccount } from '../store/account';
import { AccountSection } from '../ui/AccountSection';
import { BackButton, Display, Header, Screen } from '../ui/components';
import { Icon, type IconName } from '../ui/icons';
import { goBack } from '../ui/nav';
import { Text } from '../ui/Text';
import { C, R, S } from '../ui/theme';

const PERKS: { key: string; icon: IconName }[] = [
  { key: 'p1', icon: 'cards' },
  { key: 'p2', icon: 'trophy' },
  { key: 'p3', icon: 'friends' },
  { key: 'p4', icon: 'globe' },
];

export default function SignIn() {
  const { t } = useTranslation();
  const provider = useAccount((s) => s.provider);
  return (
    <Screen tint={C.blue}>
      <Header title="" left={<BackButton onPress={() => goBack()} />} />
      <View style={styles.hero} testID="signin">
        <LinearGradient colors={['#101734', '#2F6BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Display size={34}>{provider ? t('signin.doneTitle') : t('signin.title')}</Display>
        <Text style={styles.lead}>{t('signin.lead')}</Text>
      </View>
      <View style={styles.perks}>
        {PERKS.map((p) => (
          <View key={p.key} style={styles.perk}>
            <View style={styles.perkIcon}><Icon name={p.icon} size={28} /></View>
            <Text style={styles.perkText}>{t(`signin.${p.key}`)}</Text>
          </View>
        ))}
      </View>
      <AccountSection page />
      <Text style={styles.fine}>{t('signin.privacy')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: R.lg, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, padding: S.xl, gap: S.sm, alignItems: 'center' },
  lead: { color: '#E6ECFF', fontSize: 16, fontWeight: '800', textAlign: 'center', lineHeight: 22 },
  perks: { gap: S.sm },
  perk: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 2, borderColor: C.ink, padding: S.md },
  perkIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  perkText: { flex: 1, color: C.text, fontSize: 14, fontWeight: '800', lineHeight: 19 },
  fine: { color: C.muted, fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
