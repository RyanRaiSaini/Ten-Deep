import { useLocalSearchParams } from 'expo-router';
import { SparkleBackdrop, TIER_BACKDROP } from '../../ui/SparkleBackdrop';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../ui/Text';
import { CARD_BY_ID } from '../../data/cards';
import { cardLevel, cardPlayer } from '../../engine/collect/lineup';
import { setsFor } from '../../engine/collect/sets';
import { useCollection } from '../../store/collection';
import { CollectCard, TIER_STYLE } from '../../ui/CollectCard';
import { BackButton, Card, Header, Label, Screen } from '../../ui/components';
import { C, F, R, S } from '../../ui/theme';
import { goBack } from '../../ui/nav';
import { FINISHES, bestFinish } from '../../engine/collect/finishes';
import { FinishChip } from '../../ui/CardFinish';
import { SharePull } from '../../ui/SharePull';

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
    <Screen backdrop={<SparkleBackdrop key={card.tier} theme={TIER_BACKDROP[card.tier]} seed={card.id} count={34} glowAt={0.3} />}>
      <Header title={card.name} left={<BackButton onPress={() => goBack()} />} />
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

      <Card style={{ gap: S.sm }}>
        {bars.map(([label, v]) => (
          <View key={label} style={styles.barRow}>
            <Text style={styles.barLabel}>{label}</Text>
            <View style={styles.bar}><View style={[styles.fill, { width: `${v}%`, backgroundColor: accent }]} /></View>
            <Text style={styles.barNum}>{Math.min(99, v + level)}</Text>
          </View>
        ))}
      </Card>

      <Label>{t('card.inSets')}</Label>
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
  hint: { color: C.muted, textAlign: 'center', fontSize: 12 },
  finishes: { alignItems: 'center', gap: 6 },
  finishHead: { color: C.text, fontWeight: '900' },
  finishRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  finishItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  finishCount: { color: C.muted, fontWeight: '900' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  barLabel: { color: C.text, width: 92, fontWeight: '700', fontSize: 13 },
  bar: { flex: 1, height: 8, borderRadius: R.pill, backgroundColor: C.surface2, overflow: 'hidden' },
  fill: { height: 8 },
  barNum: { color: C.text, width: 28, textAlign: 'right', ...F.display },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 3 },
  setName: { color: C.text, flex: 1, fontWeight: '800' },
  setCount: { fontWeight: '900' },
});
