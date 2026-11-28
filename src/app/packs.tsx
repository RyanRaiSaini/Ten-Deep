/**
 * Opening a Player Pick, full screen in the arena:
 *   sealed → drag across the pack to rip the top off (or tap); light leaks through the seam
 *   burst  → strip flies off, flash, shake, sparks, beams tinted by the best card inside;
 *            the stack slides up out of the open wrapper, then the wrapper drops away
 *   stack  → face-down cards glow in their rarity colour; tap to flip, tap to fling (rarest last)
 *   pick   → all five on the court; keep one
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, BackHandler, Easing, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../ui/Text';
import { feel, feelFinish, feelSuspense } from '../audio/feel';
import { CARD_BY_ID } from '../data/cards';
import { PICK_ODDS, type PickType } from '../engine/collect/picks';
import { TIERS, type Card } from '../engine/collect/tiers';
import { useCollection } from '../store/collection';
import { CardBack, CollectCard, TIER_STYLE } from '../ui/CollectCard';
import { glowColor, NebulaBackdrop } from '../ui/SparkleBackdrop';
import { FINISH_STYLE } from '../ui/CardFinish';
import { ArenaBackdrop, Beams, Flash, Halo, RipPack } from '../ui/PackArena';
import { PACK_STYLE } from '../ui/packStyle';
import { SharePull } from '../ui/SharePull';
import { ONE_IN, finishFor, finishRank, type Finish } from '../engine/collect/finishes';
import { BackButton, Button, Header, Screen } from '../ui/components';
import { C, F, FONT, R, S } from '../ui/theme';
import { track } from '../store/progress';
import { goBack } from '../ui/nav';
import { Icon } from '../ui/icons';
import { UPGRADE_CHANCE, nextType } from '../engine/collect/powerup';
import { dailyKey } from '../engine/daily';

const native = Platform.OS !== 'web';
const GUARANTEE_KEY: Partial<Record<PickType, string>> = { champion: 'guarantee_champion', mythic: 'guarantee_mythic', legendary: 'guarantee_legendary' };
const RANK = Object.fromEntries(TIERS.map((t, i) => [t, i]));
/** How long the stack takes to slide up out of the wrapper before the wrapper falls. */
const LIFT_MS = 700;

type Phase = 'sealed' | 'burst' | 'stack' | 'pick';

/** A "big moment": Mythic or better, or a Gold-or-rarer finish. */
const isBig = (c: Card, f: Finish) => RANK[c.tier] >= RANK.mythic || finishRank(f) >= finishRank('gold');
/** The colour a card glows before it's flipped (and its beams): finish colour for gold+, else the tier accent. */
const glowOf = (c: Card, f: Finish) => (finishRank(f) >= finishRank('gold') ? FINISH_STYLE[f].chip[0] : TIER_STYLE[c.tier].accent);

/** Burst of sparkles radiating from the center. Re-fires whenever `fire` changes. */
function Sparkles({ fire, color }: { fire: number; color: string }) {
  const [parts] = useState(() => Array.from({ length: 40 }, (_, i) => ({ a: (i / 40) * Math.PI * 2 + Math.random() * 0.3, d: 110 + Math.random() * 160, s: 4 + Math.random() * 8 })));
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!fire) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [fire, v]);
  if (!fire) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {parts.map((p, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute', left: '50%', top: '42%', fontSize: p.s * 2, color: i % 3 ? color : '#FFFFFF',
            opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.a) * p.d] }) },
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.a) * p.d + 40] }) },
              { scale: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1.3, 0.5] }) },
            ],
          }}
        >
          ✦
        </Animated.Text>
      ))}
    </View>
  );
}

/** A pulsing aura behind a face-down card: the rarity tease. */
function Aura({ color, strong, size }: { color: string; strong: boolean; size: number }) {
  const [v] = useState(() => new Animated.Value(0));
  // While it waits face down: a heartbeat on the phone if something big is under it (no music).
  useEffect(() => feelSuspense(strong), [strong]);
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: strong ? 450 : 900, useNativeDriver: native }),
      Animated.timing(v, { toValue: 0, duration: strong ? 450 : 900, useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v, strong]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', width: size * 1.12, height: size * 1.52, borderRadius: size * 0.12, backgroundColor: color,
        shadowColor: color, shadowOpacity: 1, shadowRadius: 40, shadowOffset: { width: 0, height: 0 },
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: strong ? [0.35, 0.85] : [0.1, 0.32] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, strong ? 1.1 : 1.02] }) }],
      }}
    />
  );
}

/** A card that flips from its back to its face (scaleX squash, swap, unsquash). */
function FlipCard({ card, revealed, onPress, selected, width, packColor, tierLabel, finish, testID }: {
  card: Card; revealed: boolean; onPress: () => void; selected: boolean; width: number; packColor: string; tierLabel: string; finish: Finish; testID?: string;
}) {
  const [sx] = useState(() => new Animated.Value(1));
  const [face, setFace] = useState(revealed);
  useEffect(() => {
    if (!revealed || face) return;
    Animated.timing(sx, { toValue: 0, duration: 150, useNativeDriver: native }).start(() => {
      setFace(true);
      Animated.spring(sx, { toValue: 1, friction: 5, useNativeDriver: native }).start();
    });
  }, [revealed, face, sx]);
  return (
    <Pressable onPress={onPress} testID={testID ?? (face ? 'pack-card-face' : 'pack-card-back')}>
      <Animated.View style={[{ transform: [{ scaleX: sx }, { scale: selected ? 1.06 : 1 }] }, selected && styles.selected]}>
        {face
          ? <CollectCard card={card} width={width} tierLabel={tierLabel} finish={finish} animate={finishRank(finish) >= finishRank('gold')} />
          : <CardBack width={width} color={packColor} />}
      </Animated.View>
    </Pressable>
  );
}

/** Each pending pack gets a fresh opening screen (all state and animation reset by remounting on its id). */
export default function Packs() {
  const pickId = useCollection((s) => s.pending[0]?.id);
  return <PackOpening key={pickId ?? 'none'} />;
}

function PackOpening() {
  const { t } = useTranslation();
  const col = useCollection();
  const pick = col.pending[0];
  const cards = useMemo(() => (pick ? pick.cards.map((id) => CARD_BY_ID[id]).filter(Boolean) : []), [pick]);
  const { width: winW } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>('sealed');
  const [flipped, setFlipped] = useState<string[]>([]);
  const [index, setIndex] = useState(0); // top of the stack
  const [selected, setSelected] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [burstColor, setBurstColor] = useState('#FFFFFF');
  const [beams, setBeams] = useState(0);
  const [flash, setFlash] = useState(0);
  const [halo, setHalo] = useState(0);
  // The rarest finish revealed so far gets a banner (gold and up).
  const [banner, setBanner] = useState<Finish | null>(null);
  const [showOdds, setShowOdds] = useState(false);
  const [upgraded, setUpgraded] = useState(false);
  const [gridW, setGridW] = useState(Math.min(winW, 560) - 32);
  const [shake] = useState(() => new Animated.Value(0));
  const [lift] = useState(() => new Animated.Value(0)); // stack sliding up out of the open wrapper
  const [settle] = useState(() => new Animated.Value(0)); // stack settling to centre once the wrapper is gone
  const [fling] = useState(() => new Animated.Value(0)); // top card flying away
  const busy = useRef(false);

  // Android's back button can't skip the pick either, once the pack is open.
  useEffect(() => {
    if (phase === 'sealed') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [phase]);

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

  const [c1, c2] = PACK_STYLE[pick.type].colors;
  // Finishes are seeded by pick + card, the same roll useCollection.keep() records.
  const finishOf = (c: Card) => finishFor(pick.id, c.id);
  // Reveal order: worst first, rarest finish / best card last.
  const order = [...cards].sort((a, b) => finishRank(finishOf(a)) - finishRank(finishOf(b)) || a.ovr - b.ovr);
  const best = order[order.length - 1];
  const teaser = best ? glowOf(best, finishOf(best)) : c1;
  const top = order[index];
  const topFace = !!top && flipped.includes(top.id);
  const stageColor = banner ? FINISH_STYLE[banner].chip[0] : phase === 'sealed' ? c1 : teaser;
  const cardW = Math.min(124, Math.floor((gridW - 2 * 10) / 3));
  const bigW = Math.min(240, Math.round(winW * 0.6));

  const doShake = (k = 1) => Animated.sequence(
    [1, -1, 0.8, -0.8, 0.4, 0].map((x) => Animated.timing(shake, { toValue: x * k, duration: 55, useNativeDriver: native })),
  ).start();
  const celebrate = (color: string, big: boolean) => {
    setBurstColor(color); setBurst((b) => b + 1);
    if (big) { setBeams((b) => b + 1); setFlash((f) => f + 1); setHalo((h) => h + 1); doShake(1); }
  };

  const reveal = (card: Card) => {
    // De-duplicate inside the updater: reveal-all can call this with an old `flipped`.
    setFlipped((f) => (f.includes(card.id) ? f : [...f, card.id]));
    const f = finishOf(card);
    if (finishRank(f) >= finishRank('gold')) setBanner((b) => (b && finishRank(b) >= finishRank(f) ? b : f));
    feel('flip');
    // A finish gets its own sting (rarer = bigger); otherwise a Mythic+ card gets the fanfare.
    if (f !== 'base') feelFinish(f);
    else if (RANK[card.tier] >= RANK.mythic) feel('fanfare');
    else if (RANK[card.tier] >= RANK.epic) feel('crowd');
    celebrate(glowOf(card, f), isBig(card, f));
  };

  // Sealed → burst: the strip tears off and the stack starts sliding up out of the wrapper.
  const onRip = () => {
    setPhase('burst');
    feel('rip');
    setFlash((f) => f + 1);
    setBeams((b) => b + 1);
    setHalo((h) => h + 1);
    celebrate(teaser, false);
    doShake(1.4);
    lift.setValue(0); settle.setValue(0);
    Animated.sequence([
      Animated.delay(180),
      Animated.timing(lift, { toValue: 1, duration: LIFT_MS - 180, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
    ]).start();
  };
  // Wrapper gone → the stack drops into place.
  const onGone = () => {
    // Only if we're still mid-rip: a quick "Reveal all" may already have jumped to the pick screen.
    setPhase((p) => (p === 'burst' ? 'stack' : p));
    feel('swish');
    Animated.spring(settle, { toValue: 1, friction: 6, tension: 60, useNativeDriver: native }).start();
  };

  const tapStack = () => {
    if (!top || busy.current || phase !== 'stack') return;
    if (!topFace) return reveal(top);
    // Fling the face-up card away; the next one is on top.
    busy.current = true;
    feel('swish');
    fling.setValue(0);
    Animated.timing(fling, { toValue: 1, duration: 340, easing: Easing.in(Easing.quad), useNativeDriver: native }).start(() => {
      fling.setValue(0);
      busy.current = false;
      if (index + 1 >= order.length) setPhase('pick');
      else setIndex(index + 1);
    });
  };
  const revealAll = () => {
    setFlipped(order.map((c) => c.id));
    const rarest = order.map(finishOf).reduce<Finish>((b, f) => (finishRank(f) > finishRank(b) ? f : b), 'base');
    if (finishRank(rarest) >= finishRank('gold')) setBanner(rarest);
    if (rarest !== 'base') feelFinish(rarest); else if (best && RANK[best.tier] >= RANK.mythic) feel('fanfare'); else feel('crowd');
    celebrate(teaser, !!best && isBig(best, finishOf(best)));
    setPhase('pick');
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
  const dir = index % 2 ? -1 : 1;
  const showStack = (phase === 'burst' || phase === 'stack') && !!top;

  return (
    <View style={styles.root}>
      <ArenaBackdrop color={stageColor} />
      {/* Once the cards are out, each card glows against deep space in its own colors. */}
      {(phase === 'stack' || phase === 'pick') && (
        topFace && phase === 'stack'
          ? <NebulaBackdrop key={top.id} color={glowColor(top.colors, TIER_STYLE[top.tier].accent)} accent={glowOf(top, finishOf(top))} seed={top.id} focusY={0.42} />
          : <NebulaBackdrop key="pack" color={stageColor} accent={c1} seed="pack" focusY={0.42} />
      )}
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          {/* Once the pack is ripped you have to keep a card before leaving. */}
          {phase === 'sealed' ? <BackButton onPress={() => goBack()} /> : <View style={{ width: 52 }} />}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.packName, { textShadowColor: c1 }]} testID="pack-type">{t(`collect.t_${pick.type}`)}</Text>
            {guarantee && <Text style={styles.guarantee}>★ {t(`collect.${guarantee}`)}</Text>}
          </View>
          <View style={styles.countBox}><Icon name="gift" size={20} /><Text style={styles.count}>{col.pending.length}</Text></View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} scrollEnabled={phase === 'pick'} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.stage, { transform: [{ translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] }) }] }]}>
            {phase !== 'pick' && <View style={styles.center} pointerEvents="none"><Halo fire={halo} /></View>}
            <Beams fire={beams} color={stageColor} />

            {/* The stack: behind the wrapper while it slides out, then on its own. */}
            {showStack && (
              <View style={styles.center} pointerEvents={phase === 'stack' ? 'box-none' : 'none'}>
                <Animated.View
                  style={[styles.stack, {
                    transform: [
                      { translateY: Animated.add(lift.interpolate({ inputRange: [0, 1], outputRange: [40, -150] }), settle.interpolate({ inputRange: [0, 1], outputRange: [0, 150] })) },
                      { scale: settle.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                    ],
                  }]}
                >
                  <Text style={[styles.counter, { opacity: phase === 'stack' ? 0.9 : 0 }]} testID="stack-counter">{t('collect.cardOf', { n: index + 1, total: order.length })}</Text>
                  <View style={{ width: bigW, height: bigW * 1.4, alignItems: 'center', justifyContent: 'center' }}>
                    {!topFace && phase === 'stack' && <Aura key={top.id} color={glowOf(top, finishOf(top))} strong={isBig(top, finishOf(top))} size={bigW} />}
                    {order.slice(index + 1, index + 4).reverse().map((c, k, arr) => {
                      const depth = arr.length - k;
                      return (
                        <View key={c.id} style={[styles.under, { transform: [{ translateY: depth * 9 }, { scale: 1 - depth * 0.045 }, { rotate: `${(depth % 2 ? 1 : -1) * depth * 2.5}deg` }] }]}>
                          <CardBack width={bigW} color={c1} />
                        </View>
                      );
                    })}
                    <Animated.View
                      key={top.id}
                      style={{
                        opacity: fling.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
                        transform: [
                          { translateX: fling.interpolate({ inputRange: [0, 1], outputRange: [0, dir * 460] }) },
                          { translateY: fling.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) },
                          { rotate: fling.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${dir * 28}deg`] }) },
                        ],
                      }}
                    >
                      <FlipCard
                        card={top} width={bigW} packColor={c1} revealed={topFace} selected={false}
                        tierLabel={t(`collect.tier_${top.tier}`)} finish={finishOf(top)} onPress={tapStack} testID="stack-card"
                      />
                    </Animated.View>
                  </View>
                  <Text style={[styles.tapHint, { opacity: phase === 'stack' ? 0.9 : 0 }]}>{topFace ? t('collect.tapNext') : t('collect.tapFlip')}</Text>
                </Animated.View>
              </View>
            )}

            {(phase === 'sealed' || phase === 'burst') && (
              <View style={styles.center} pointerEvents="box-none">
                <RipPack
                  c1={c1} c2={c2} glow={teaser} type={pick.type}
                  label={t(`collect.t_${pick.type}`)}
                  hint={t('collect.swipeToRip').toUpperCase()}
                  onRip={onRip} onGone={onGone} dropDelay={LIFT_MS}
                  testID="pack-open"
                />
              </View>
            )}

            {phase === 'stack' && top && topFace && finishRank(finishOf(top)) >= finishRank('gold') && (
              <View style={styles.bannerSlot} pointerEvents="none"><PullBanner finish={finishOf(top)} /></View>
            )}

            {phase === 'pick' && (
              <View style={{ alignSelf: 'stretch', gap: S.md }} onLayout={(e) => { const w = e.nativeEvent.layout.width; if (w > 0) setGridW(w); }}>
                {banner && <PullBanner finish={banner} />}
                <View style={styles.grid}>
                  {cards.map((c) => (
                    <FlipCard
                      key={c.id} card={c} width={cardW} packColor={c1} revealed selected={selected === c.id}
                      tierLabel={t(`collect.tier_${c.tier}`)} finish={finishOf(c)} onPress={() => { setSelected(c.id); feel('tick'); }}
                    />
                  ))}
                </View>
              </View>
            )}
            <Sparkles fire={burst} color={burstColor} />
          </Animated.View>

          <View style={styles.controls}>
            {phase === 'sealed' && nextType(pick.type) && !upgraded && (pick.taps ?? 0) === 0 && (col.powerDay !== dailyKey() ? (
              <View style={{ gap: 4 }}>
                <Button
                  label={t('collect.powerUp', { n: 1 })}
                  variant="blue"
                  icon={<Icon name="bolt" size={24} />}
                  testID="pack-power"
                  onPress={() => {
                    const r = useCollection.getState().powerUp(pick.id, dailyKey());
                    if (r === 'up') { feel('fanfare'); celebrate(c1, true); setUpgraded(true); }
                    else if (r === 'miss') { feel('buzzer'); doShake(0.5); }
                  }}
                />
                <Text style={styles.powerOdds}>{t('collect.powerOdds', { pct: Math.round(UPGRADE_CHANCE * 100) })}</Text>
              </View>
            ) : <Text style={styles.powerOdds} testID="power-used">{t('collect.powerTomorrow')}</Text>)}
            {phase === 'sealed' && upgraded && <Text style={styles.upgraded} testID="pack-upgraded">{t('collect.upgraded')}</Text>}
            {phase === 'stack' && top && topFace && isBig(top, finishOf(top)) && <SharePull card={top} finish={finishOf(top)} />}
            {(phase === 'burst' || phase === 'stack') && <Button label={t('collect.revealAll')} variant="dark" onPress={revealAll} testID="pack-reveal-all" />}
            {phase === 'pick' && (
              <>
                <Text style={styles.choose}>{t('collect.chooseOne')}</Text>
                {cards.some((c) => finishOf(c) !== 'base') && <Text style={styles.keepHint}>{t('finish.keepHint')}</Text>}
                <Button
                  label={selectedCard ? t('collect.keep', { name: selectedCard.name }) : t('collect.chooseOne')}
                  disabled={!selectedCard}
                  variant="gold"
                  onPress={keep}
                  testID="pack-keep"
                />
                {best && isBig(best, finishOf(best)) && <SharePull card={best} finish={finishOf(best)} />}
              </>
            )}
            {(phase === 'sealed' || phase === 'pick') && (
              <Pressable onPress={() => setShowOdds((v) => !v)}>
                <Text style={styles.oddsToggle}>ⓘ {t('collect.odds')}</Text>
              </Pressable>
            )}
            {showOdds && (phase === 'sealed' || phase === 'pick') && (
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
          </View>
        </ScrollView>
      </SafeAreaView>
      <Flash fire={flash} />
    </View>
  );
}

/** "RAINBOW PULL! 1 in 1,000": pops in when a gold-or-better finish flips. */
function PullBanner({ finish }: { finish: Finish }) {
  const { t } = useTranslation();
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 90, useNativeDriver: native }).start();
  }, [finish, pop]);
  if (finish === 'base') return null;
  return (
    <Animated.View style={{ alignSelf: 'stretch', transform: [{ scale: pop }] }} testID={`pull-${finish}`}>
      <LinearGradient colors={FINISH_STYLE[finish].frame ?? FINISH_STYLE[finish].chip} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
        <Text style={styles.bannerTitle}>{t('finish.pull', { name: t(`finish.${finish}`).toUpperCase() })}</Text>
        <Text style={styles.bannerOdds}>{t('finish.oneIn', { n: ONE_IN[finish].toLocaleString('en-US') })}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07051A' },
  header: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.md, paddingTop: S.sm },
  packName: { fontSize: 28, ...F.display, color: '#FFFFFF', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
  guarantee: { color: '#FFD86B', fontWeight: '900', fontSize: 13 },
  countBox: { width: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  count: { color: '#FFD86B', fontWeight: '900', fontSize: 16 },
  scroll: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: S.md, paddingBottom: S.lg },
  stage: { flexGrow: 1, minHeight: 500, alignItems: 'center', justifyContent: 'center', paddingVertical: S.md },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  stack: { alignItems: 'center', gap: S.md },
  under: { position: 'absolute' },
  bannerSlot: { position: 'absolute', left: 0, right: 0, bottom: 4 },
  counter: { ...F.display, color: '#FFFFFF', fontSize: 18, letterSpacing: 1 },
  tapHint: { color: '#FFFFFF', fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  controls: { gap: S.sm },
  banner: { borderRadius: R.lg, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 6, paddingVertical: S.sm, alignItems: 'center' },
  bannerTitle: { fontFamily: FONT.display, fontSize: 26, color: '#FFFFFF', textShadowColor: C.ink, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
  bannerOdds: { color: '#FFFFFF', fontWeight: '900', textShadowColor: C.ink, textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
  choose: { ...F.display, color: '#FFFFFF', fontSize: 20, textAlign: 'center', letterSpacing: 1 },
  keepHint: { color: '#D9D2F0', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  powerOdds: { color: '#D9D2F0', fontWeight: '800', fontSize: 12, textAlign: 'center' },
  upgraded: { fontFamily: FONT.display, fontSize: 26, color: '#7FB2FF', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  selected: { shadowColor: C.accent, shadowOpacity: 1, shadowRadius: 18, borderRadius: R.md },
  empty: { color: C.text, fontSize: 18, textAlign: 'center', marginTop: S.xxl },
  streak: { color: C.gold, textAlign: 'center', fontWeight: '800' },
  oddsToggle: { color: '#D9D2F0', textAlign: 'center', fontWeight: '700' },
  odds: { backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: R.md, padding: S.md, gap: 6 },
  oddsHead: { color: C.text, fontWeight: '900', marginTop: S.sm },
  oddsRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  oddsTier: { color: C.text, flex: 1, fontWeight: '700' },
  oddsPct: { color: C.muted, fontWeight: '800' },
});
