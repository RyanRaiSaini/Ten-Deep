import { useLocalSearchParams } from 'expo-router';
import { glowColor, NebulaBackdrop } from '../../ui/SparkleBackdrop';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../ui/Text';
import { CARD_BY_ID } from '../../data/cards';
import { cardLevel, cardPlayer } from '../../engine/collect/lineup';
import { setsFor } from '../../engine/collect/sets';
import { useCollection } from '../../store/collection';
import { CollectCard, TIER_STYLE } from '../../ui/CollectCard';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton, Card, Header, Label, Screen } from '../../ui/components';
import { C, F, R, S } from '../../ui/theme';
import { goBack } from '../../ui/nav';
import { FINISHES, bestFinish } from '../../engine/collect/finishes';
import { FinishChip } from '../../ui/CardFinish';
import { SharePull } from '../../ui/SharePull';

/** Stat colors, dark to bright: below 70 dark red, 70s amber, 80-87 green, 88-94 blue, 95+ purple. */
function statColors(v: number): [string, string] {
  if (v >= 95) return ['#5B21B6', '#A855F7'];
  if (v >= 88) return ['#1D4ED8', '#3B82F6'];
  if (v >= 80) return ['#15803D', '#22C55E'];
  if (v >= 70) return ['#B45309', '#F59E0B'];
  return ['#5F0F17', '#9F1D2B'];
}

/** One card up close: level, copies, rating bars, and the sets it belongs to. */
export default function CardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const owned = useCollection((s) => s.owned);
  const card = CARD_BY_ID[id ?? ''];
  if (!card) {
    return (
      <Screen>
        <Header title={t('notFound.title')} left={<BackButton onPress={goBack} />} />
        <Text style={{ color: C.muted, textAlign: 'center', fontWeight: '700' }}>{t('notFound.body')}</Text>
      </Screen>
    );
  }
  const count = owned[card.id]?.count ?? 0;
  const level = cardLevel(count);
  const finishes = owned[card.id]?.finishes ?? {};
  const finish = bestFinish(finishes);
  const special = FINISHES.filter((f) => f !== 'base' && (finishes[f] ?? 0) > 0).reverse();
  const p = cardPlayer(card.id);
  const accent = TIER_STYLE[card.tier].accent;
  const bars: [string, number][] = [
    [t('card.off'), p.off], [t('card.def'), p.def], [t('card.reb'), p.reb], [t('card.ast'), p.ast], [t('card.three'), p.three],
  ];

  return (
    <Screen backdrop={<NebulaBackdrop key={card.id} color={glowColor(card.colors, accent)} accent={accent} seed={card.id} focusY={0.27} />}>
      <Header light title={card.name} left={<BackButton onPress={() => goBack()} />} />
      <View style={styles.hero}>
        <CollectCard card={card} width={200} level={level} tierLabel={t(`collect.tier_${card.tier}`)} finish={finish} animate />
      </View>
      <Text style={[styles.meta, { color: accent }]} testID="card-meta">
        {count ? `${t('card.level', { n: level })} · ${t('card.dupes', { n: count })}` : t('card.notOwned')}
      </Text>
      <Text style={styles.hint}>{t('card.levelHint')}</Text>
      {special.length > 0 && (
        <View style={styles.finishes} testID="card-finishes">
          <Text style={styles.finishHead}>{t('finish.yours')}</Text>
          <View style={styles.finishRow}>
            {special.map((f) => (
              <View key={f} style={styles.finishItem}>
                <FinishChip finish={f} scale={1.2} />
                {(finishes[f] ?? 0) > 1 && <Text style={styles.finishCount}>×{finishes[f]}</Text>}
              </View>
            ))}
          </View>
        </View>
      )}
      {count > 0 && <SharePull card={card} finish={finish} />}

      <View style={styles.stats} testID="card-stats">
        {bars.map(([label, raw]) => {
          const v = Math.min(99, raw + level);
          const [lo, hi] = statColors(v);
          return (
            <View key={label} style={styles.barRow}>
              <Text style={styles.barLabel}>{label}</Text>
              <View style={styles.bar}>
                <LinearGradient colors={[lo, hi]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.fill, { width: `${v}%` }]} />
              </View>
              <View style={[styles.barBadge, { backgroundColor: hi }]}><Text style={styles.barNum}>{v}</Text></View>
            </View>
          );
        })}
      </View>

      <Label color="#C9CEE0">{t('card.inSets')}</Label>
      {setsFor(card.id).map((set) => {
        const have = set.cards.filter((c) => owned[c]).length;
        return (
          <Card key={set.id} style={styles.setRow}>
            <View style={[styles.swatch, { backgroundColor: set.colors[0], borderColor: set.colors[1] }]} />
            <Text style={styles.setName}>{set.label}</Text>
            <Text style={[styles.setCount, { color: have === set.cards.length ? C.neon : C.muted }]}>{have}/{set.cards.length}</Text>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: S.md },
  meta: { textAlign: 'center', fontWeight: '900', fontSize: 16 },
  hint: { color: '#C9CEE0', textAlign: 'center', fontSize: 12 },
  finishes: { alignItems: 'center', gap: 6 },
  finishHead: { color: '#FFFFFF', fontWeight: '900' },
  finishRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  finishItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  finishCount: { color: C.muted, fontWeight: '900' },
  stats: {
    gap: S.md, padding: S.lg, borderRadius: R.lg, backgroundColor: 'rgba(10,12,32,0.72)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)',
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  barLabel: { color: '#E6E9F5', width: 96, fontWeight: '800', fontSize: 13 },
  bar: { flex: 1, height: 12, borderRadius: R.pill, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  fill: { height: 12, borderRadius: R.pill },
  barBadge: { minWidth: 42, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(0,0,0,0.35)' },
  barNum: { color: '#FFFFFF', fontSize: 17, ...F.display },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 3 },
  setName: { color: C.text, flex: 1, fontWeight: '800' },
  setCount: { fontWeight: '900' },
});
