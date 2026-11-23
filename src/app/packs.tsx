import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { feel } from '../audio/feel';
import { CARD_BY_ID } from '../data/cards';
import { PICK_ODDS, type PickType } from '../engine/collect/picks';
import { TIERS, type Card } from '../engine/collect/tiers';
import { useCollection } from '../store/collection';
import { CardBack, CollectCard, TIER_STYLE } from '../ui/CollectCard';
import { BackButton, Button, Header, Label, Screen } from '../ui/components';
import { C, F, R, S } from '../ui/theme';

const native = Platform.OS !== 'web';
const PACK_COLOR: Record<PickType, [string, string]> = {
  daily: ['#4F8BFF', '#123A8A'], run: ['#C9D0DE', '#3A4256'], playoffs: ['#3DDC84', '#0F6B3E'], weekly: ['#B26BFF', '#4B1A7A'],
  champion: ['#F5C451', '#8A5A00'], mythic: ['#FF5A36', '#7A1405'], legendary: ['#FF5AC8', '#4F8BFF'],
};
const GUARANTEE_KEY: Partial<Record<PickType, string>> = { champion: 'guarantee_champion', mythic: 'guarantee_mythic', legendary: 'guarantee_legendary' };
const RANK = Object.fromEntries(TIERS.map((t, i) => [t, i]));

/** Burst of sparkles radiating from the center. Re-fires whenever `fire` changes. */
function Sparkles({ fire, color }: { fire: number; color: string }) {
  const parts = useMemo(() => Array.from({ length: 32 }, (_, i) => ({ a: (i / 32) * Math.PI * 2 + Math.random() * 0.3, d: 90 + Math.random() * 120, s: 4 + Math.random() * 7 })), []);
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!fire) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [fire, v]);
  if (!fire) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {parts.map((p, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute', left: '50%', top: '40%', fontSize: p.s * 2, color: i % 3 ? color : '#FFFFFF',
            opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.a) * p.d] }) },
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.a) * p.d] }) },
              { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1.2, 0.6] }) },
            ],
          }}
        >
          ✦
        </Animated.Text>
      ))}
    </View>
  );
}

/** A card that flips from its back to its face (scaleX squash, swap, unsquash). */
function FlipCard({ card, revealed, onPress, selected, width, packColor, tierLabel }: {
  card: Card; revealed: boolean; onPress: () => void; selected: boolean; width: number; packColor: string; tierLabel: string;
}) {
  const sx = useRef(new Animated.Value(1)).current;
  const [face, setFace] = useState(revealed);
  useEffect(() => {
    if (!revealed || face) return;
    Animated.timing(sx, { toValue: 0, duration: 160, useNativeDriver: native }).start(() => {
      setFace(true);
      Animated.spring(sx, { toValue: 1, friction: 5, useNativeDriver: native }).start();
    });
  }, [revealed, face, sx]);
  return (
    <Pressable onPress={onPress} testID={face ? 'pack-card-face' : 'pack-card-back'}>
      <Animated.View style={[{ transform: [{ scaleX: sx }, { scale: selected ? 1.06 : 1 }] }, selected && styles.selected]}>
        {face ? <CollectCard card={card} width={width} tierLabel={tierLabel} /> : <CardBack width={width} color={packColor} />}
      </Animated.View>
    </Pressable>
  );
}

export default function Packs() {
  const { t } = useTranslation();
  const col = useCollection();
  const pick = col.pending[0];
  const cards = useMemo(() => (pick ? pick.cards.map((id) => CARD_BY_ID[id]).filter(Boolean) : []), [pick]);
  const [open, setOpen] = useState(false);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [showOdds, setShowOdds] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const deal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setOpen(false); setFlipped([]); setSelected(null);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: native }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pick?.id, pulse]);

  if (!pick) {
    return (
      <Screen>
        <Header title={t('collect.picks')} left={<BackButton onPress={() => router.back()} />} />
        <Text style={styles.empty}>{t('collect.noPicks')}</Text>
        <Text style={styles.streak}>{t('collect.streak', { n: col.streak })} · {t('collect.nextWeekly', { n: 7 - (col.streak % 7) })}</Text>
        <Button label={t('collect.title')} variant="secondary" onPress={() => router.replace('/collection')} />
      </Screen>
    );
  }

  const [c1, c2] = PACK_COLOR[pick.type];
  const allRevealed = flipped.length === cards.length;
  const best = [...cards].sort((a, b) => b.ovr - a.ovr)[0];

  const flip = (card: Card) => {
    if (flipped.includes(card.id)) {
      if (allRevealed) setSelected(card.id);
      return;
    }
    setFlipped((f) => [...f, card.id]);
    if (RANK[card.tier] >= RANK.mythic) { setBurst((b) => b + 1); feel('fanfare'); }
    else feel(RANK[card.tier] >= RANK.epic ? 'crowd' : 'swish');
  };
  const revealAll = () => {
    const order = cards.filter((c) => !flipped.includes(c.id)).sort((a, b) => a.ovr - b.ovr); // best last
    order.forEach((c, i) => setTimeout(() => flip(c), i * 420));
  };
  const openPack = () => {
    feel('tick');
    Animated.sequence([
      ...[1, -1, 1, -1, 1, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 70, useNativeDriver: native })),
    ]).start(() => {
      setOpen(true);
      setBurst((b) => b + 1);
      feel('thunk');
      deal.setValue(0);
      Animated.spring(deal, { toValue: 1, friction: 6, useNativeDriver: native }).start();
    });
  };
  const keep = () => {
    if (!selected) return;
    col.keep(pick.id, selected);
    feel('pickChime');
  };

  const odds = PICK_ODDS[pick.type];
  const guarantee = GUARANTEE_KEY[pick.type];
  const selectedCard = cards.find((c) => c.id === selected);

  return (
    <Screen>
      <Header title={t('collect.picks')} left={<BackButton onPress={() => router.back()} />} right={<Text style={styles.count}>{col.pending.length}</Text>} />
      <View style={styles.titleRow}>
        <Text style={[styles.packName, { color: c1 }]} testID="pack-type">{t(`collect.t_${pick.type}`)}</Text>
        {guarantee && <Text style={styles.guarantee}>★ {t(`collect.${guarantee}`)}</Text>}
      </View>

      <View style={styles.stage}>
        {!open ? (
          <Pressable onPress={openPack} testID="pack-open">
            <Animated.View
              style={{
                transform: [
                  { rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] }) },
                  { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
                ],
              }}
            >
              <LinearGradient colors={[c1, c2, c1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.pack, { shadowColor: c1 }]}>
                <Text style={styles.packLogo}>TEN{'\n'}DEEP</Text>
                <Text style={styles.packType}>{t(`collect.t_${pick.type}`)}</Text>
                <Text style={styles.tap}>{t('collect.tapToOpen')}</Text>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        ) : (
          <Animated.View style={[styles.grid, { opacity: deal, transform: [{ translateY: deal.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] }]}>
            {cards.map((c) => (
              <FlipCard
                key={c.id}
                card={c}
                width={112}
                packColor={c1}
                revealed={flipped.includes(c.id)}
                selected={selected === c.id}
                tierLabel={t(`collect.tier_${c.tier}`)}
                onPress={() => flip(c)}
              />
            ))}
          </Animated.View>
        )}
        <Sparkles fire={burst} color={allRevealed && best ? TIER_STYLE[best.tier].accent : c1} />
      </View>

      {open && !allRevealed && <Button label={t('collect.revealAll')} variant="secondary" onPress={revealAll} testID="pack-reveal-all" />}
      {open && allRevealed && (
        <>
          <Label color={c1}>{t('collect.chooseOne')}</Label>
          <Button
            label={selectedCard ? t('collect.keep', { name: selectedCard.name }) : t('collect.chooseOne')}
            disabled={!selectedCard}
            variant="gold"
            onPress={keep}
            testID="pack-keep"
          />
        </>
      )}

      <Pressable onPress={() => setShowOdds((v) => !v)}>
        <Text style={styles.oddsToggle}>ⓘ {t('collect.odds')}</Text>
      </Pressable>
      {showOdds && (
        <View style={styles.odds}>
          {TIERS.filter((tier) => odds[tier] > 0).map((tier) => (
            <View key={tier} style={styles.oddsRow}>
              <View style={[styles.dot, { backgroundColor: TIER_STYLE[tier].accent }]} />
              <Text style={styles.oddsTier}>{t(`collect.tier_${tier}`)}</Text>
              <Text style={styles.oddsPct}>{odds[tier]}%</Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  count: { color: C.gold, fontWeight: '900', fontSize: 16 },
  titleRow: { alignItems: 'center', gap: 4 },
  packName: { fontSize: 26, ...F.display },
  guarantee: { color: C.gold, fontWeight: '800' },
  stage: { minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  pack: {
    width: 220, height: 300, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center', gap: S.md,
    shadowOpacity: 0.9, shadowRadius: 30, shadowOffset: { width: 0, height: 0 }, elevation: 14,
  },
  packLogo: { ...F.display, color: C.text, fontSize: 40, textAlign: 'center', letterSpacing: 4 },
  packType: { color: C.bg, fontWeight: '900', fontSize: 16, backgroundColor: 'rgba(244,246,251,0.85)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: R.pill },
  tap: { color: C.text, fontWeight: '800', opacity: 0.9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  selected: { shadowColor: '#FFFFFF', shadowOpacity: 1, shadowRadius: 16, borderRadius: R.md },
  empty: { color: C.text, fontSize: 18, textAlign: 'center', marginTop: S.xxl },
  streak: { color: C.gold, textAlign: 'center', fontWeight: '800' },
  oddsToggle: { color: C.muted, textAlign: 'center', fontWeight: '700' },
  odds: { backgroundColor: C.surface, borderRadius: R.md, padding: S.md, gap: 6 },
  oddsRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  oddsTier: { color: C.text, flex: 1, fontWeight: '700' },
  oddsPct: { color: C.muted, fontWeight: '800' },
});
