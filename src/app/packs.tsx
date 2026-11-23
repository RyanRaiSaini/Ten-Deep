import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { feel } from '../audio/feel';
import { CARD_BY_ID } from '../data/cards';
import { PICK_ODDS, type PickType } from '../engine/collect/picks';
import { TIERS, type Card } from '../engine/collect/tiers';
import { useCollection } from '../store/collection';
import { CardBack, CollectCard, TIER_STYLE } from '../ui/CollectCard';
import { FINISH_STYLE } from '../ui/CardFinish';
import { FoilPack, PackArena } from '../ui/PackArena';
import { ONE_IN, finishFor, finishRank, type Finish } from '../engine/collect/finishes';
import { BackButton, Button, Header, Label, Screen } from '../ui/components';
import { C, F, FONT, R, S } from '../ui/theme';
import { track } from '../store/progress';
import { goBack } from '../ui/nav';
import { Icon } from '../ui/icons';
import { POWER_TAPS, UPGRADE_CHANCE, nextType } from '../engine/collect/powerup';

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
function FlipCard({ card, revealed, onPress, selected, width, packColor, tierLabel, finish }: {
  card: Card; revealed: boolean; onPress: () => void; selected: boolean; width: number; packColor: string; tierLabel: string; finish: Finish;
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
        {face ? <CollectCard card={card} width={width} tierLabel={tierLabel} finish={finish} animate={finishRank(finish) >= finishRank('gold')} /> : <CardBack width={width} color={packColor} />}
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
  const revealing = useRef(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  // The rarest finish revealed so far gets a banner (gold and up).
  const [banner, setBanner] = useState<Finish | null>(null);
  const [flash, setFlash] = useState(0);
  // Three cards across the arena when they fit (5 cards: 3 + 2).
  const [stageW, setStageW] = useState(330);
  const cardW = Math.min(124, Math.floor((stageW - 2 * 10) / 3));
  const [showOdds, setShowOdds] = useState(false);
  const [upgraded, setUpgraded] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const deal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setOpen(false); setFlipped([]); setSelected(null); setUpgraded(false); setBanner(null);
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
        <Header title={t('collect.picks')} left={<BackButton onPress={() => goBack()} />} />
        <Text style={styles.empty}>{t('collect.noPicks')}</Text>
        <Text style={styles.streak}>{t('collect.streak', { n: col.streak })} · {t('collect.nextWeekly', { count: 7 - (col.streak % 7) })}</Text>
        <Button label={t('collect.title')} variant="secondary" onPress={() => router.navigate('/collection')} />
      </Screen>
    );
  }

  const [c1, c2] = PACK_COLOR[pick.type];
  const allRevealed = cards.every((c) => flipped.includes(c.id));
  const best = [...cards].sort((a, b) => b.ovr - a.ovr)[0];
  // Finishes are seeded by pick + card, the same roll useCollection.keep() records.
  const finishOf = (c: Card) => finishFor(pick.id, c.id);

  const flip = (card: Card) => {
    if (flipped.includes(card.id)) {
      if (allRevealed) setSelected(card.id);
      return;
    }
    // Reveal-all timers call this with an old `flipped`, so de-duplicate inside the updater.
    setFlipped((f) => (f.includes(card.id) ? f : [...f, card.id]));
    const f = finishOf(card);
    if (finishRank(f) >= finishRank('gold')) { setBanner((b) => (b && finishRank(b) >= finishRank(f) ? b : f)); setFlash((n) => n + 1); }
    if (RANK[card.tier] >= RANK.mythic || finishRank(f) >= finishRank('gold')) { setBurst((b) => b + 1); feel('fanfare'); }
    else feel(RANK[card.tier] >= RANK.epic || f !== 'base' ? 'crowd' : 'swish');
  };
  const revealAll = () => {
    if (revealing.current) return;
    revealing.current = true;
    setTimeout(() => { revealing.current = false; }, cards.length * 420 + 100);
    // Best last: rarest finish, then highest rating.
    const order = cards.filter((c) => !flipped.includes(c.id)).sort((a, b) => finishRank(finishOf(a)) - finishRank(finishOf(b)) || a.ovr - b.ovr);
    order.forEach((c, i) => setTimeout(() => flip(c), i * 420));
  };
  const openPack = () => {
    feel('tick');
    Animated.sequence([
      ...[1, -1, 1, -1, 1, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 70, useNativeDriver: native })),
    ]).start(() => {
      setOpen(true);
      setFlash((n) => n + 1);
      setBurst((b) => b + 1);
      feel('thunk');
      deal.setValue(0);
      Animated.spring(deal, { toValue: 1, friction: 6, useNativeDriver: native }).start();
    });
  };
  const keep = () => {
    if (!selected || !useCollection.getState().pending.some((x) => x.id === pick.id)) return;
    col.keep(pick.id, selected);
    track({ type: 'pack' });
    feel('pickChime');
  };

  const odds = PICK_ODDS[pick.type];
  const guarantee = GUARANTEE_KEY[pick.type];
  const selectedCard = cards.find((c) => c.id === selected);

  return (
    <Screen>
      <Header title={t('collect.picks')} left={<BackButton onPress={() => goBack()} />} right={<Text style={styles.count}>{col.pending.length}</Text>} />
      <PackArena
        color={banner ? FINISH_STYLE[banner].chip[0] : c1}
        flash={flash}
        title={<Text style={[styles.packName, { textShadowColor: c1 }]} testID="pack-type">{t(`collect.t_${pick.type}`)}</Text>}
        subtitle={guarantee ? <Text style={styles.guarantee}>★ {t(`collect.${guarantee}`)}</Text> : undefined}
      >
        {!open ? (
          <Pressable onPress={openPack} testID="pack-open">
            <Animated.View
              style={{
                transform: [
                  { rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] }) },
                  { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
                ],
              }}
            >
              <FoilPack c1={c1} c2={c2} label={t(`collect.t_${pick.type}`)} cta={t('collect.tapToOpen').toUpperCase()} />
            </Animated.View>
          </Pressable>
        ) : (
          <View style={{ alignSelf: 'stretch' }} onLayout={(e) => { const w = e.nativeEvent.layout.width; if (w > 0) setStageW(w); }}>
          <Animated.View style={[styles.grid, { opacity: deal, transform: [{ translateY: deal.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] }]}>
            {cards.map((c) => (
              <FlipCard
                key={c.id}
                card={c}
                width={cardW}
                packColor={c1}
                revealed={flipped.includes(c.id)}
                selected={selected === c.id}
                tierLabel={t(`collect.tier_${c.tier}`)}
                finish={finishOf(c)}
                onPress={() => flip(c)}
              />
            ))}
          </Animated.View>
          </View>
        )}
        <Sparkles fire={burst} color={banner ? FINISH_STYLE[banner].chip[0] : allRevealed && best ? TIER_STYLE[best.tier].accent : c1} />
      </PackArena>

      {!open && nextType(pick.type) && (pick.taps ?? 0) < POWER_TAPS && (
        <View style={styles.power}>
          <Button
            label={t('collect.powerUp', { n: POWER_TAPS - (pick.taps ?? 0) })}
            variant="blue"
            icon={<Icon name="bolt" size={24} />}
            testID="pack-power"
            onPress={() => {
              const r = useCollection.getState().powerUp(pick.id);
              if (r === 'up') { feel('fanfare'); setBurst((b) => b + 1); setUpgraded(true); }
              else if (r === 'miss') { feel('buzzer'); Animated.sequence([1, -1, 0].map((x) => Animated.timing(shake, { toValue: x * 0.5, duration: 60, useNativeDriver: native }))).start(); }
            }}
          />
          <Text style={styles.powerOdds}>{t('collect.powerOdds', { pct: Math.round(UPGRADE_CHANCE[pick.taps ?? 0] * 100) })}</Text>
        </View>
      )}
      {!open && upgraded && <Text style={styles.upgraded} testID="pack-upgraded">{t('collect.upgraded')}</Text>}
      {open && banner && <PullBanner finish={banner} />}
      {open && !allRevealed && <Button label={t('collect.revealAll')} variant="secondary" onPress={revealAll} testID="pack-reveal-all" />}
      {open && allRevealed && (
        <>
          <Label color={c1}>{t('collect.chooseOne')}</Label>
          {cards.some((c) => finishOf(c) !== 'base') && <Text style={styles.keepHint}>{t('finish.keepHint')}</Text>}
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
          <Text style={styles.oddsHead}>{t('finish.odds')}</Text>
          {(Object.keys(ONE_IN) as Exclude<Finish, 'base'>[]).map((f) => (
            <View key={f} style={styles.oddsRow}>
              <View style={[styles.dot, { backgroundColor: FINISH_STYLE[f].chip[0] }]} />
              <Text style={styles.oddsTier}>{t(`finish.${f}`)}</Text>
              <Text style={styles.oddsPct}>{t('finish.oneIn', { n: ONE_IN[f].toLocaleString('en-US') })}</Text>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

/** "RAINBOW PULL! 1 in 1,000" — pops in when a gold-or-better finish flips. */
function PullBanner({ finish }: { finish: Finish }) {
  const { t } = useTranslation();
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 90, useNativeDriver: native }).start();
  }, [finish, pop]);
  if (finish === 'base') return null;
  return (
    <Animated.View style={{ transform: [{ scale: pop }] }} testID={`pull-${finish}`}>
      <LinearGradient colors={FINISH_STYLE[finish].frame ?? FINISH_STYLE[finish].chip} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
        <Text style={styles.bannerTitle}>{t('finish.pull', { name: t(`finish.${finish}`).toUpperCase() })}</Text>
        <Text style={styles.bannerOdds}>{t('finish.oneIn', { n: ONE_IN[finish].toLocaleString('en-US') })}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: R.lg, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 6, paddingVertical: S.sm, alignItems: 'center' },
  bannerTitle: { fontFamily: FONT.display, fontSize: 26, color: '#FFFFFF', textShadowColor: C.ink, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  bannerOdds: { color: '#FFFFFF', fontWeight: '900', textShadowColor: C.ink, textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
  keepHint: { color: C.muted, fontWeight: '700', fontSize: 12, textAlign: 'center' },
  oddsHead: { color: C.text, fontWeight: '900', marginTop: S.sm },
  power: { gap: 4 },
  powerOdds: { color: C.muted, fontWeight: '800', fontSize: 12, textAlign: 'center' },
  upgraded: { fontFamily: FONT.display, fontSize: 26, color: C.blue, textAlign: 'center' },
  count: { color: C.gold, fontWeight: '900', fontSize: 16 },
  packName: { fontSize: 30, ...F.display, color: '#FFFFFF', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
  guarantee: { color: '#FFD86B', fontWeight: '900' },
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
