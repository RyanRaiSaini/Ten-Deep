import { LinearGradient } from 'expo-linear-gradient';
import { CourtBackdrop } from '../../ui/SparkleBackdrop';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../ui/Text';
import { CARD_BY_ID } from '../../data/cards';
import { cardLevel } from '../../engine/collect/lineup';
import { closestSets, completedSets, setReward } from '../../engine/collect/sets';
import { TIERS, type Tier } from '../../engine/collect/tiers';
import { useCollection } from '../../store/collection';
import { CollectCard, TIER_STYLE } from '../../ui/CollectCard';
import { Button, Screen, TabTitle } from '../../ui/components';
import { C, F, R, S } from '../../ui/theme';
import { Icon } from '../../ui/icons';
import { FINISHES, bestFinish, finishRank, type Finish } from '../../engine/collect/finishes';
import { FINISH_STYLE } from '../../ui/CardFinish';

/** Your collection: tier-framed cards, best first, with tier filters. */
const GAP = 10;

export default function Collection() {
  // Fill the row edge to edge: 3 columns on phones, more on wide screens.
  const [gridW, setGridW] = useState(358);
  const cols = Math.max(3, Math.floor((gridW + GAP) / (120 + GAP)));
  const cardW = Math.floor((gridW - GAP * (cols - 1)) / cols);
  const { t } = useTranslation();
  const col = useCollection();
  const [filter, setFilter] = useState<Tier | null>(null);
  const [finishFilter, setFinishFilter] = useState<Finish | null>(null);
  const owned = Object.entries(col.owned)
    .map(([id, o]) => ({ card: CARD_BY_ID[id], count: o.count, finishes: o.finishes ?? {}, finish: bestFinish(o.finishes) }))
    .filter((x) => x.card)
    .sort((a, b) => b.card.ovr - a.card.ovr);
  const shown = owned
    .filter((x) => !filter || x.card.tier === filter)
    .filter((x) => !finishFilter || (x.finishes[finishFilter] ?? 0) > 0);
  // Copies pulled in each special finish (a card can hold several).
  const finishCounts = Object.fromEntries(FINISHES.map((f) => [f, owned.reduce((n, x) => n + (x.finishes[f] ?? 0), 0)])) as Record<Finish, number>;
  const showcase = owned.filter((x) => finishRank(x.finish) >= finishRank('chrome'))
    .sort((a, b) => finishRank(b.finish) - finishRank(a.finish) || b.card.ovr - a.card.ovr)
    .slice(0, 3);
  const ownedIds = new Set(Object.keys(col.owned));
  const closest = closestSets(ownedIds, 3);
  const done = completedSets(ownedIds).length;
  const counts = Object.fromEntries(TIERS.map((tier) => [tier, owned.filter((x) => x.card.tier === tier).length]));

  return (
    <Screen tabbed backdrop={<CourtBackdrop split={0.2} />}>
      <TabTitle icon={<Icon name="cards" size={46} />} title={t('collect.title')} />
      <Text style={styles.sub} testID="collection-count">
        {t('collect.cards', { n: owned.length })} · {t('collect.streak', { n: col.streak })}
      </Text>
      {col.pending.length > 0 && (
        <Button label={t('collect.waiting', { count: col.pending.length })} icon={<Icon name="gift" size={22} />} variant="gold" onPress={() => router.push('/packs')} />
      )}
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Button label={t('lineup.title')} icon={<Icon name="cards" size={22} />} variant="secondary" onPress={() => router.push('/lineup')} style={{ flex: 1 }} testID="to-lineup" />
        <Button label={t('gauntlet.title')} icon={<Icon name="shield" size={22} />} variant="secondary" onPress={() => router.push('/gauntlet')} style={{ flex: 1 }} />
      </View>
      <View style={styles.chips}>
        <Chip label={t('collect.all')} on={!filter} color={C.text} onPress={() => setFilter(null)} />
        {TIERS.map((tier) => (
          <Chip key={tier} label={`${t(`collect.tier_${tier}`)} ${counts[tier]}`} on={filter === tier} color={TIER_STYLE[tier].frame[0]} onPress={() => setFilter(tier)} />
        ))}
      </View>
      <View style={styles.chips} testID="finish-chips">
        {FINISHES.filter((f) => f !== 'base').map((f) => {
          const n = finishCounts[f];
          const on = finishFilter === f;
          return (
            <Pressable key={f} onPress={() => n && setFinishFilter(on ? null : f)} style={{ opacity: n ? 1 : 0.4 }} testID={`finish-chip-${f}`}>
              <LinearGradient colors={on ? FINISH_STYLE[f].chip : ['#FFFFFF', '#FFFFFF']} style={[styles.chip, { borderColor: FINISH_STYLE[f].chip[0] }]}>
                <Text style={[styles.chipText, { color: on ? '#FFFFFF' : FINISH_STYLE[f].chip[0] }]}>{t(`finish.${f}`)} {n}</Text>
              </LinearGradient>
            </Pressable>
          );
        })}
      </View>
      {owned.length === 0 && <Text style={styles.empty}>{t('collect.empty')}</Text>}
      {showcase.length > 0 && (
        <View style={{ gap: S.sm }}>
          <Text style={styles.section}>{t('finish.rarest')}</Text>
          <View style={styles.showcase}>
            {showcase.map(({ card, finish }) => (
              <Pressable key={card.id} onPress={() => router.push(`/card/${card.id}`)} testID="showcase-card">
                <CollectCard card={card} width={Math.min(150, Math.floor((gridW - GAP * 2) / 3))} finish={finish} animate />
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {closest.length > 0 && (
        <View style={{ gap: S.sm }}>
          <Text style={styles.section}>{t('card.closest')} · {t('card.completed', { n: done })}</Text>
          {closest.map(({ set, have }) => (
            <View key={set.id} style={styles.setRow}>
              <View style={[styles.swatch, { backgroundColor: set.colors[0], borderColor: set.colors[1] }]} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.setName}>{set.label}  <Text style={styles.setCount}>{have}/{set.cards.length}</Text></Text>
                <View style={styles.bar}><View style={[styles.fill, { width: `${(have / set.cards.length) * 100}%`, backgroundColor: set.colors[0] }]} /></View>
              </View>
              <View style={{ alignItems: 'center' }}><Icon name="gift" size={22} /><Text style={styles.reward}>{t(`collect.t_${setReward(set)}`)}</Text></View>
            </View>
          ))}
        </View>
      )}
      <View style={styles.grid} onLayout={(e) => {
        // A hidden tab reports 0 width on the web; keep the last real width so cards never get a negative size.
        const w = e.nativeEvent.layout.width;
        if (w > 0) setGridW(w);
      }}>
        {shown.map(({ card, count, finish }) => (
          <Pressable key={card.id} onPress={() => router.push(`/card/${card.id}`)} testID="collection-card">
            <CollectCard card={card} width={cardW} level={cardLevel(count)} finish={finish} />
            {count > 1 && <Text style={styles.dupes}>×{count}</Text>}
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function Chip({ label, on, color, onPress }: { label: string; on: boolean; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, { borderColor: color }, on && { backgroundColor: color }]}>
      <Text style={[styles.chipText, { color: on ? '#FFFFFF' : color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sub: { color: C.gold, fontWeight: '800', textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 2, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.surface },
  chipText: { fontWeight: '800', fontSize: 12 },
  empty: { color: C.muted, textAlign: 'center', marginTop: S.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  showcase: { flexDirection: 'row', gap: GAP, justifyContent: 'center' },
  section: { color: C.text, fontWeight: '900', fontSize: 15 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.surface, borderRadius: R.md, padding: S.md },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 3 },
  setName: { color: C.text, fontWeight: '800' },
  setCount: { color: C.muted, fontWeight: '700' },
  bar: { height: 6, borderRadius: R.pill, backgroundColor: C.surface2, overflow: 'hidden' },
  fill: { height: 6 },
  reward: { color: C.gold, fontWeight: '800', fontSize: 11 },
  dupes: { ...F.display, position: 'absolute', bottom: 6, right: 8, color: C.text },
});
