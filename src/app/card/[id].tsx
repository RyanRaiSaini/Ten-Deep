import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { CARD_BY_ID } from '../../data/cards';
import { cardLevel, cardPlayer } from '../../engine/collect/lineup';
import { setsFor } from '../../engine/collect/sets';
import { useCollection } from '../../store/collection';
import { CollectCard, TIER_STYLE } from '../../ui/CollectCard';
import { BackButton, Card, Header, Label, Screen } from '../../ui/components';
import { C, F, R, S } from '../../ui/theme';

/** One card up close: level, copies, rating bars, and the sets it belongs to. */
export default function CardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const owned = useCollection((s) => s.owned);
  const card = CARD_BY_ID[id ?? ''];
  if (!card) return null;
  const count = owned[card.id]?.count ?? 0;
  const level = cardLevel(count);
  const p = cardPlayer(card.id);
  const accent = TIER_STYLE[card.tier].accent;
  const bars: [string, number][] = [
    [t('card.off'), p.off], [t('card.def'), p.def], [t('card.reb'), p.reb], [t('card.ast'), p.ast], [t('card.three'), p.three],
  ];

  return (
    <Screen>
      <Header title={card.name} left={<BackButton onPress={() => router.back()} />} />
      <View style={styles.hero}>
        <CollectCard card={card} width={200} level={level} tierLabel={t(`collect.tier_${card.tier}`)} />
      </View>
      <Text style={[styles.meta, { color: accent }]} testID="card-meta">
        {count ? `${t('card.level', { n: level })} · ${t('card.dupes', { n: count })}` : t('card.notOwned')}
      </Text>
      <Text style={styles.hint}>{t('card.levelHint')}</Text>

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
