import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { feel } from '../audio/feel';
import { CARD_BY_ID } from '../data/cards';
import { canPlace, chemistry, lineupRoster } from '../engine/collect/lineup';
import { ALL_SLOTS, BENCH_SLOTS, STARTER_SLOTS, type SlotId } from '../engine/types';
import { useCollection } from '../store/collection';
import { CollectCard, TIER_STYLE } from '../ui/CollectCard';
import { BackButton, Button, Card, Header, Label, Screen } from '../ui/components';
import { C, F, R, S } from '../ui/theme';

/** Build a 10-card lineup from your collection. */
export default function LineupScreen() {
  const { t } = useTranslation();
  const col = useCollection();
  const [slot, setSlot] = useState<SlotId | null>(null);
  const cards = ALL_SLOTS.map((k) => col.lineup[k]).filter((id): id is string => !!id).map((id) => CARD_BY_ID[id]);
  const chem = chemistry(cards);
  const roster = lineupRoster(col.lineup);
  const rating = Math.round(ALL_SLOTS.reduce((s, k) => s + roster.slots[k].ovr, 0) / 10 + chem.bonus);
  const options = slot
    ? Object.keys(col.owned).filter((id) => CARD_BY_ID[id] && canPlace(col.lineup, id, slot)).map((id) => CARD_BY_ID[id]).sort((a, b) => b.ovr - a.ovr)
    : [];

  const cell = (k: SlotId) => {
    const c = col.lineup[k] ? CARD_BY_ID[col.lineup[k]!] : null;
    return (
      <Pressable key={k} testID={`lineup-${k}`} onPress={() => setSlot(slot === k ? null : k)} style={[styles.cell, slot === k && styles.cellOn]}>
        <Text style={styles.slotLabel}>{k.startsWith('B') ? '6+' : k}</Text>
        {c ? <CollectCard card={c} width={60} /> : <View style={styles.emptyCard}><Text style={styles.emptyText}>{t('lineup.empty')}</Text></View>}
      </Pressable>
    );
  };

  return (
    <Screen>
      <Header title={t('lineup.title')} left={<BackButton onPress={() => router.back()} />} />
      <Card style={styles.summary}>
        <Text style={styles.rating} testID="lineup-rating">{t('lineup.teamRating', { n: rating })}</Text>
        <Text style={[styles.chem, { color: chem.bonus ? C.neon : C.muted }]}>
          ⚡ {t('lineup.chemistry', { n: chem.bonus })}
          {chem.franchise && chem.franchise.count >= 3 ? `  ·  ${chem.franchise.name} ×${chem.franchise.count}` : ''}
          {chem.decade && chem.decade.count >= 5 ? `  ·  ${chem.decade.name} ×${chem.decade.count}` : ''}
        </Text>
      </Card>

      <Label>{t('draft.starters')}</Label>
      <View style={styles.row}>{STARTER_SLOTS.map(cell)}</View>
      <Label>{t('draft.bench')}</Label>
      <View style={styles.row}>{BENCH_SLOTS.map(cell)}</View>
      <Text style={styles.note}>{t('lineup.callupNote')}</Text>

      {slot && (
        <Card style={{ gap: S.sm }}>
          <Label color={C.neon}>{t('lineup.pickCard', { slot })}</Label>
          {col.lineup[slot] && <Button label={t('lineup.clear')} variant="ghost" onPress={() => { col.setSlot(slot, null); setSlot(null); }} />}
          {options.length === 0 && <Text style={styles.note}>{t('lineup.noCards')}</Text>}
          {options.slice(0, 20).map((c) => (
            <Pressable
              key={c.id}
              testID="lineup-option"
              onPress={() => { col.setSlot(slot, c.id); setSlot(null); feel('pickChime'); }}
              style={styles.option}
            >
              <View style={[styles.optOvr, { borderColor: TIER_STYLE[c.tier].accent }]}>
                <Text style={[styles.optOvrText, { color: TIER_STYLE[c.tier].accent }]}>{c.ovr}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optName}>{c.name}</Text>
                <Text style={styles.note}>{c.pos}{c.pos2 ? `/${c.pos2}` : ''} · {c.team}</Text>
              </View>
            </Pressable>
          ))}
        </Card>
      )}

      <Button label={t('lineup.autoFill')} variant="secondary" onPress={() => { col.autoFillLineup(); feel('thunk'); }} testID="lineup-autofill" />
      <Button label={`⚔️  ${t('gauntlet.title')}`} variant="gold" onPress={() => router.push('/gauntlet')} testID="to-gauntlet" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { alignItems: 'center', gap: 4 },
  rating: { color: C.text, fontSize: 24, ...F.display },
  chem: { fontWeight: '800', textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: { alignItems: 'center', gap: 2, padding: 3, borderRadius: R.sm, borderWidth: 1.5, borderColor: 'transparent' },
  cellOn: { borderColor: C.neon },
  slotLabel: { color: C.muted, fontSize: 10, fontWeight: '800' },
  emptyCard: { width: 60, height: 84, borderRadius: R.md, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  note: { color: C.muted, fontSize: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.sm, backgroundColor: C.surface2, borderRadius: R.md },
  optOvr: { width: 40, height: 40, borderRadius: R.sm, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  optOvrText: { fontSize: 18, ...F.display },
  optName: { color: C.text, fontWeight: '800' },
});
