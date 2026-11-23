import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CARD_BY_ID } from '../data/cards';
import { TIERS, type Tier } from '../engine/collect/tiers';
import { useCollection } from '../store/collection';
import { CollectCard, TIER_STYLE } from '../ui/CollectCard';
import { BackButton, Button, Header, Screen } from '../ui/components';
import { C, F, R, S } from '../ui/theme';

/** Your collection: tier-framed cards, best first, with tier filters. */
export default function Collection() {
  const { t } = useTranslation();
  const col = useCollection();
  const [filter, setFilter] = useState<Tier | null>(null);
  const owned = Object.entries(col.owned)
    .map(([id, o]) => ({ card: CARD_BY_ID[id], count: o.count }))
    .filter((x) => x.card)
    .sort((a, b) => b.card.ovr - a.card.ovr);
  const shown = filter ? owned.filter((x) => x.card.tier === filter) : owned;
  const counts = Object.fromEntries(TIERS.map((tier) => [tier, owned.filter((x) => x.card.tier === tier).length]));

  return (
    <Screen>
      <Header title={t('collect.title')} left={<BackButton onPress={() => router.back()} />} />
      <Text style={styles.sub} testID="collection-count">
        {t('collect.cards', { n: owned.length })} · {t('collect.streak', { n: col.streak })}
      </Text>
      {col.pending.length > 0 && (
        <Button label={`🎁  ${t('collect.waiting', { n: col.pending.length })}`} variant="gold" onPress={() => router.push('/packs')} />
      )}
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Button label={`🧩  ${t('lineup.title')}`} variant="secondary" onPress={() => router.push('/lineup')} style={{ flex: 1 }} testID="to-lineup" />
        <Button label={`⚔️  ${t('gauntlet.title')}`} variant="secondary" onPress={() => router.push('/gauntlet')} style={{ flex: 1 }} />
      </View>
      <View style={styles.chips}>
        <Chip label={t('collect.all')} on={!filter} color={C.text} onPress={() => setFilter(null)} />
        {TIERS.map((tier) => (
          <Chip key={tier} label={`${t(`collect.tier_${tier}`)} ${counts[tier]}`} on={filter === tier} color={TIER_STYLE[tier].accent} onPress={() => setFilter(tier)} />
        ))}
      </View>
      {owned.length === 0 && <Text style={styles.empty}>{t('collect.empty')}</Text>}
      <View style={styles.grid}>
        {shown.map(({ card, count }) => (
          <View key={card.id}>
            <CollectCard card={card} width={104} />
            {count > 1 && <Text style={styles.dupes}>×{count}</Text>}
          </View>
        ))}
      </View>
    </Screen>
  );
}

function Chip({ label, on, color, onPress }: { label: string; on: boolean; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, { borderColor: color }, on && { backgroundColor: color }]}>
      <Text style={[styles.chipText, { color: on ? C.bg : color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sub: { color: C.gold, fontWeight: '800', textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1.5, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontWeight: '800', fontSize: 12 },
  empty: { color: C.muted, textAlign: 'center', marginTop: S.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  dupes: { ...F.display, position: 'absolute', bottom: 6, right: 8, color: C.text },
});
