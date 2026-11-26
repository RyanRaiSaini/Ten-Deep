import { HistoryGate } from '../ui/HistoryGate';
import { runNeedsHistory } from '../data/historyReady';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { MoneyScale } from '../ui/MoneyScale';
import { moneyScaleFor } from '../data/modes';
import { feel } from '../audio/feel';
import { CARD_ROUNDS, cardDef, type Rarity } from '../engine/crisis/deck';
import type { SlotId } from '../engine/types';
import { useGame } from '../store/game';
import { Button, Card, Label, Screen } from '../ui/components';
import { PlayerCard } from '../ui/PlayerCard';
import { RosterBoard } from '../ui/RosterBoard';
import { C, F, R, S } from '../ui/theme';
import { CRISIS_ICON } from '../ui/gameIcons';
import { Icon } from '../ui/icons';

const RARITY_COLOR: Record<Rarity, string> = { good: C.neon, bad: C.danger, legendary: C.gold };
const native = Platform.OS !== 'web';

/** A Management Crisis card: flip-in reveal, then accept / choose / pick a swap. */
function CrisisScreen() {
  const { t } = useTranslation();
  const g = useGame();
  const card = g.crisis?.pending;
  const [incoming, setIncoming] = useState<string | null>(null);
  const [outSlot, setOutSlot] = useState<SlotId | null>(null);
  const [flip] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!card) return;
    flip.setValue(0);
    Animated.spring(flip, { toValue: 1, friction: 7, tension: 40, useNativeDriver: native }).start();
    const def = cardDef(card.id);
    feel(def.rarity === 'legendary' ? 'fanfare' : def.rarity === 'good' ? 'pickChime' : 'buzzer');
  }, [card?.id, card?.slot]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!g.crisis || !card || !g.season) return <Redirect href="/season" />;
  const def = cardDef(card.id);
  const color = RARITY_COLOR[def.rarity];
  const month = t(`crisis.m${CARD_ROUNDS.indexOf(card.round) >= 0 ? CARD_ROUNDS.indexOf(card.round) : card.slot}`);
  const user = g.season.teams[0];
  const offer = card.offer?.filter(Boolean) ?? [];
  const pickIncoming = !card.choice && offer.length > 1;
  const pickOut = !card.choice && (card.outSlots?.length ?? 0) > 1;
  const ready = (!pickIncoming || incoming) && (!pickOut || outSlot);

  const resolve = (option?: 'a' | 'b') => {
    g.resolveCrisis({ incomingId: incoming ?? offer[0]?.id, outSlot: outSlot ?? card.outSlots?.[0], option });
    feel('thunk');
    router.replace('/season');
  };

  const rotateY = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '0deg'] });
  const scale = flip.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const objective = g.crisis.objective;

  // Choices sit right under the card; only cards that need you to pick a player keep them under the board.
  const actions = (
    card.choice ? (
        <View style={{ gap: S.sm }}>
          <Button
            label={card.id === 'superteam-rumor' ? t('crisis.options.superA') : t('crisis.options.dramaA')}
            variant={card.id === 'superteam-rumor' ? 'gold' : 'secondary'}
            onPress={() => resolve('a')}
            testID="crisis-option-a"
          />
          <Button
            label={card.id === 'superteam-rumor' ? t('crisis.options.superB') : t('crisis.options.dramaB')}
            variant="ghost"
            onPress={() => resolve('b')}
            testID="crisis-option-b"
          />
        </View>
      ) : (
        <Button
          label={offer.length || card.outSlots ? t('crisis.confirm') : t('crisis.accept')}
          disabled={!ready}
          onPress={() => resolve()}
          testID="crisis-accept"
          style={{ backgroundColor: color }}
        />
    )
  );

  return (
    <MoneyScale.Provider value={moneyScaleFor(g.poolId)}>
    <Screen>
      <View style={styles.top}>
        <Label color={color}>{t('crisis.title')} · {month}</Label>
        <Text style={styles.count}>{t('crisis.cardN', { n: card.slot + 1 })}</Text>
      </View>
      {objective && (
        <Text style={styles.objective} testID="crisis-objective">{t('crisis.objective')}: {t(`crisis.obj_${objective.tier}`)}</Text>
      )}

      <Animated.View
        testID="crisis-card"
        style={[styles.card, { borderColor: color, shadowColor: color, transform: [{ perspective: 900 }, { rotateY }, { scale }] }]}
      >
        <View style={[styles.rarity, { backgroundColor: color }]}>
          <Text style={styles.rarityText}>{t(`crisis.${def.rarity}`)}</Text>
        </View>
        <Icon name={CRISIS_ICON[card.id] ?? 'siren'} size={92} />
        <Text style={[styles.title, { color }]}>{t(`crisis.cards.${card.id}.title`)}</Text>
        <Text style={styles.flavor}>“{t(`crisis.cards.${card.id}.flavor`)}”</Text>
        <Text style={styles.effect}>{t(`crisis.cards.${card.id}.effect`)}</Text>
      </Animated.View>

      {/* Players involved */}
      {offer.length > 0 && (
        <View style={{ gap: S.sm }}>
          {pickIncoming && <Label>{t('crisis.pickIn')}</Label>}
          {offer.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              testID="crisis-offer"
              selected={incoming === p.id}
              onPress={pickIncoming ? () => setIncoming(p.id) : undefined}
            />
          ))}
        </View>
      )}
      {card.target && (
        <Card style={{ gap: 6, borderColor: C.danger }}>
          <Label color={C.danger}>{t('crisis.pickOut')}</Label>
          <PlayerCard player={user.slots[card.target]} note={card.target} />
        </Card>
      )}

      {!pickOut && actions}
      {pickOut && <Text style={[styles.hint, { color }]}>{t('crisis.pickOut')}</Text>}
      <RosterBoard
        roster={user.slots}
        highlight={pickOut ? (outSlot ? [outSlot] : card.outSlots) : undefined}
        onSlot={pickOut ? (slot) => setOutSlot(slot) : undefined}
      />

      {pickOut && actions}
    </Screen>
    </MoneyScale.Provider>
  );
}


/** Waits for the full history when this run needs it (an era, All-Time, a franchise, Crisis, Career). */
export default function Crisis() {
  const needs = useGame((s) => runNeedsHistory(s));
  return <HistoryGate when={needs}><CrisisScreen /></HistoryGate>;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: S.lg },
  count: { color: C.muted, fontWeight: '700' },
  objective: { color: C.text, fontWeight: '800', fontSize: 14 },
  card: {
    alignItems: 'center', gap: S.sm, padding: S.xl, borderRadius: R.lg, borderWidth: 3, backgroundColor: C.surface,
    shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, elevation: 12, backfaceVisibility: 'hidden',
  },
  rarity: { paddingHorizontal: S.md, paddingVertical: 4, borderRadius: R.pill },
  rarityText: { color: C.ink, fontWeight: '900', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  icon: { fontSize: 72 },
  title: { fontSize: 28, textAlign: 'center', ...F.display },
  flavor: { color: C.muted, fontWeight: '800', textAlign: 'center', fontSize: 15 },
  effect: { color: C.text, textAlign: 'center', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  hint: { fontWeight: '800', textAlign: 'center' },
});
