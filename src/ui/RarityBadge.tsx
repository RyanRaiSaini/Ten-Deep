import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './icons';
import { Text } from './Text';
import { C, FONT, R, S } from './theme';

/**
 * How rare a season is, from the measured odds for a good drafter (see SIM in simConfig.ts):
 * 70+ wins about 1 in 10, 75+ about 1 in 35, 82-0 about 1 in 450. Near misses show how close you got.
 */
type Club = { key: 'perfect' | 'c75' | 'c70' | 'c65'; colors: [string, string]; icon: IconName };
const CLUBS: { min: number; club: Club }[] = [
  { min: 82, club: { key: 'perfect', colors: ['#17121E', '#5B2BD9'], icon: 'crown' } },
  { min: 75, club: { key: 'c75', colors: ['#FF5AC8', '#7A4DFF'], icon: 'sparkle' } },
  { min: 70, club: { key: 'c70', colors: ['#FFB13B', '#E5484D'], icon: 'flame' } },
  { min: 65, club: { key: 'c65', colors: ['#3B6CF0', '#12B5C2'], icon: 'chart' } },
];

export function RarityBadge({ wins }: { wins: number }) {
  const { t } = useTranslation();
  const hit = CLUBS.find((c) => wins >= c.min)?.club;
  // The next club up, if it's within reach (shown as a near miss).
  const next = [...CLUBS].reverse().find((c) => c.min > wins && c.min - wins <= 4);
  if (!hit && !next) return null;
  return (
    <View style={{ gap: 6 }}>
      {hit && (
        <LinearGradient colors={hit.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge} testID={`rarity-${hit.key}`}>
          <Icon name={hit.icon} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t(`rarity.${hit.key}`)}</Text>
            <Text style={styles.odds}>{t(`rarity.${hit.key}Odds`)}</Text>
          </View>
        </LinearGradient>
      )}
      {next && <Text style={styles.near} testID="rarity-near">{t('rarity.near', { n: next.min - wins, club: t(`rarity.${next.club.key}`) })}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.lg + 4, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7 },
  title: { fontFamily: FONT.display, fontSize: 24, color: '#FFFFFF', textShadowColor: C.ink, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  odds: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  near: { color: C.muted, fontWeight: '800', textAlign: 'center' },
});
