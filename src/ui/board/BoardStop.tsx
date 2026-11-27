/**
 * A Management Crisis card stop: six face-down numbered cards. Tap one and it shakes, then flips open like a pack
 * pull; the other five turn over underneath so you see what you passed on. Then make the card's call.
 */
import { Redirect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { feel } from '../../audio/feel';
import { moneyScaleFor } from '../../data/modes';
import { CAP } from '../../engine/cap';
import { CAST, cardOf } from '../../engine/board/cards';
import { OBJECTIVE_PENALTY, OBJECTIVE_REWARD, planOf, stopAt, type StopKind } from '../../engine/board/state';
import { STARTER_SLOTS, playsPos, type SlotId } from '../../engine/types';
import { useGame } from '../../store/game';
import { Button, Label, Screen } from '../components';
import { Icon } from '../icons';
import { MoneyScale } from '../MoneyScale';
import { PlayerCard } from '../PlayerCard';
import { RosterBoard } from '../RosterBoard';
import { Text } from '../Text';
import { C, F, R, S, money } from '../theme';
import { ConfidenceMeter } from './BoardPanel';
import { KIND_ICON, cardColor, cardTitle, cardVars } from './text';

const native = Platform.OS !== 'web';

/** A full screen, or a plain column when the stop sits inside another screen. */
function Shell({ inline, children }: { inline: boolean; children: ReactNode }) {
  return inline ? <View style={{ gap: S.md }}>{children}</View> : <Screen>{children}</Screen>;
}

function FaceDown({ n, peek, onPick, disabled }: { n: number; peek?: string; onPick: () => void; disabled: boolean }) {
  const { t } = useTranslation();
  const [a] = useState(() => new Animated.Value(0));
  const [s] = useState(() => new Animated.Value(1));
  const press = () => {
    if (disabled) return;
    feel('flip');
    Animated.parallel([
      Animated.sequence([0.6, -0.6, 0.5, -0.4, 0].map((v) => Animated.timing(a, { toValue: v, duration: 55, useNativeDriver: native }))),
      Animated.timing(s, { toValue: 1.12, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: native }),
    ]).start(onPick);
  };
  const rotate = a.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] });
  const color = peek ? cardColor(peek) : '#FFC53D';
  return (
    <Pressable onPress={press} disabled={disabled} testID={`board-card-${n}`} style={styles.cell} aria-label={`${t('board.pick')} ${n + 1}`}>
      <Animated.View style={[styles.back, { borderColor: color, transform: [{ rotate }, { scale: s }] }]}>
        <LinearGradient colors={['#2A2140', '#120E1B']} style={StyleSheet.absoluteFill} />
        <View style={styles.backInner}>
          {peek ? (
            <>
              <Icon name={KIND_ICON[cardOf(peek).kind]} size={28} />
              <Text style={[styles.peekTitle, { color }]} numberOfLines={3}>{cardTitle(t, peek)}</Text>
            </>
          ) : (
            <>
              <Text style={styles.backNum}>{n + 1}</Text>
              <Text style={styles.backMark}>TEN DEEP</Text>
            </>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * `inline`: shown inside another screen (Rebuild's cards between positions): its own label, no redirects, and the
 * parent decides what happens once the card is resolved.
 */
export function BoardStop({ inline }: { inline?: { label: string; kind: StopKind; onResolved: (fired: boolean) => void } } = {}) {
  const { t } = useTranslation();
  const g = useGame();
  const board = g.crisis?.board;
  const [incoming, setIncoming] = useState<string | null>(null);
  const [outSlot, setOutSlot] = useState<SlotId | null>(null);
  const [flip] = useState(() => new Animated.Value(0));
  const [shine] = useState(() => new Animated.Value(0));
  const picked = board?.picked ?? null;
  const lastPicked = useRef<string | null>(null);

  useEffect(() => {
    if (!picked || lastPicked.current === picked) return;
    lastPicked.current = picked;
    setIncoming(null);
    setOutSlot(null);
    flip.setValue(0);
    shine.setValue(0);
    Animated.sequence([
      Animated.spring(flip, { toValue: 1, friction: 6, tension: 38, useNativeDriver: native }),
      Animated.timing(shine, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
    ]).start();
    const def = cardOf(picked);
    feel(def.tone === 'good' ? 'fanfare' : def.tone === 'gamble' ? 'rip' : 'buzzer');
  }, [picked, flip, shine]);

  if (g.phase === 'result') return inline ? null : <Redirect href="/result" />;
  if (!board || !g.season || (!board.hand && !picked)) return inline ? null : <Redirect href="/season" />;
  const season = g.season;
  const scale = moneyScaleFor(g.poolId);
  const user = season.teams[0];
  const rec = season.records[0];
  const kind: StopKind = inline?.kind ?? stopAt(board)?.kind ?? 'event';

  const done = (fired: boolean) => {
    feel('thunk');
    if (inline) inline.onResolved(fired);
    else router.replace(fired ? '/result' : '/season');
  };

  const header = (
    <>
      <View style={styles.top}>
        {inline ? <Label color={C.hardwood}>{inline.label}</Label> : (
          <>
            <Label color={C.hardwood}>{t('board.title')} · {t(`board.stopKind.${kind}`)}</Label>
            <Text style={styles.count}>{t('board.stopOf', { n: board.stop + 1, total: planOf(board).length })}</Text>
          </>
        )}
      </View>
      <ConfidenceMeter value={board.confidence} />
      <Text style={styles.lead}>{season.round === 0 ? t('board.lead0') : t('board.lead', { w: rec.w, l: rec.l, g: season.round })}</Text>
    </>
  );

  if (!picked) {
    return (
      <Shell inline={!!inline}>
        {header}
        <Text style={styles.pickTitle}>{t(kind === 'objective' ? 'board.pickObjective' : 'board.pick')}</Text>
        <Text style={styles.hint}>{t(kind === 'objective' ? 'board.pickHintObjective' : 'board.pickHint')}</Text>
        {(board.peek?.length ?? 0) > 0 && <Text style={[styles.hint, { color: C.blue }]}>{t('board.peek')}</Text>}
        <View style={styles.grid} testID="board-hand">
          {(board.hand ?? []).map((id, i) => (
            <FaceDown key={`${board.stop}-${i}`} n={i} peek={board.peek?.includes(i) ? id : undefined} disabled={false} onPick={() => g.revealBoardCard(i)} />
          ))}
        </View>
      </Shell>
    );
  }

  const def = cardOf(picked);
  const offer = board.offer ?? {};
  const color = cardColor(picked);
  const vars = cardVars(picked, offer, scale);
  const players = offer.players?.filter(Boolean) ?? [];
  const chosen = players.find((p) => p.id === incoming) ?? (players.length === 1 ? players[0] : undefined);
  const validOut = (offer.outSlots ?? []).filter((k) => !chosen || !STARTER_SLOTS.includes(k) || playsPos(chosen, k));
  const pickIn = players.length > 1;
  const pickOut = validOut.length > 1;
  const ready = (!pickIn || !!incoming) && (!pickOut || (!!outSlot && validOut.includes(outSlot))) && (players.length === 0 || validOut.length > 0 || !offer.outSlots);
  const options = offer.options ?? [];
  const fee = (o: string) => money(CAP * ({ offense: 0.06, defense: 0.06, players: 0.03, pay: 0.025 } as Record<string, number>)[o] || 0, scale);
  const resolve = (option?: string) => done(g.resolveBoard({ incomingId: chosen?.id, outSlot: outSlot ?? validOut[0], option }));

  const rotateY = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '0deg'] });
  const cardScale = flip.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-420, 420] });
  // An objective is due at tip-off in a Takeover; in a Crisis Season by the deadline, or the season's end for results.
  const due = def.kind !== 'demand' ? null : inline ? t('board.due.tipoff') : def.due === 'end' ? t('board.due.end') : t('board.due.deadline');

  return (
    <MoneyScale.Provider value={scale}>
      <Shell inline={!!inline}>
        {header}
        <Animated.View testID="board-reveal" style={[styles.card, { borderColor: color, shadowColor: color, transform: [{ perspective: 900 }, { rotateY }, { scale: cardScale }] }]}>
          <Animated.View pointerEvents="none" style={[styles.shine, { transform: [{ translateX: shineX }, { rotate: '20deg' }] }]} />
          <View style={[styles.kind, { backgroundColor: color }]}>
            <Text style={styles.kindText}>{t(`board.kinds.${def.kind}`)}</Text>
          </View>
          <Icon name={KIND_ICON[def.kind]} size={64} />
          <Text style={styles.voice}>{t(`board.voices.${def.voice}`, { name: def.voice === 'fans' ? '' : CAST[def.voice] })}</Text>
          <Text style={[styles.title, { color }]} testID="board-title">{cardTitle(t, picked)}</Text>
          <Text style={styles.story}>{t(`board.c.${picked}.story`, vars)}</Text>
          <View style={[styles.ruleBox, { borderColor: color }]}>
            <Text style={styles.ruleLabel}>{t('board.rule')}</Text>
            <Text style={styles.rule}>{t(`board.c.${picked}.rule`, vars)}</Text>
            {due && <Text style={styles.due}>{due}</Text>}
            {def.kind === 'demand' && (
              <Text style={[styles.due, { color: C.danger }]}>
                {t('board.fail', { n: OBJECTIVE_PENALTY })} · {t('board.rewardN', { n: OBJECTIVE_REWARD })}
              </Text>
            )}
          </View>
        </Animated.View>

        {def.kind === 'finance' && board.perks.includes('second-look') && (
          <Button label={t('board.secondLook')} variant="blue" onPress={() => g.boardSecondLook()} testID="board-second-look" />
        )}

        {players.length > 0 && (
          <View style={{ gap: S.sm }}>
            {pickIn && <Label>{t('board.pickIn')}</Label>}
            {players.map((p) => (
              <PlayerCard key={p.id} player={p} testID="board-offer" selected={chosen?.id === p.id} onPress={pickIn ? () => setIncoming(p.id) : undefined} />
            ))}
          </View>
        )}

        {options.length > 0 ? (
          <View style={{ gap: S.sm }}>
            {options.map((o, i) => (
              <Button key={o} label={t(`board.options.${o}`, { fee: fee(o), name: offer.name ?? '' })} variant={i === 0 ? 'primary' : 'secondary'}
                onPress={() => resolve(o)} testID={`board-option-${o}`} />
            ))}
          </View>
        ) : (
          <>
            {pickOut && <Text style={[styles.hint, { color }]}>{t('board.pickOut')}</Text>}
            {pickOut && (
              <RosterBoard roster={user.slots} highlight={outSlot && validOut.includes(outSlot) ? [outSlot] : validOut}
                onSlot={(k) => validOut.includes(k) && setOutSlot(k)} />
            )}
            <Button label={players.length || offer.outSlots ? t('board.confirm') : t('board.accept')} disabled={!ready}
              onPress={() => resolve()} testID="board-confirm" style={{ backgroundColor: color }} />
          </>
        )}

        <Label>{t('board.missed')}</Label>
        <View style={styles.missed}>
          {(board.hand ?? []).filter((x) => x !== picked).map((id) => (
            <View key={id} style={[styles.miss, { borderColor: cardColor(id) }]}>
              <Text style={[styles.missKind, { color: cardColor(id) }]}>{t(`board.kinds.${cardOf(id).kind}`)}</Text>
              <Text style={styles.missTitle} numberOfLines={2}>{cardTitle(t, id)}</Text>
            </View>
          ))}
        </View>
      </Shell>
    </MoneyScale.Provider>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: S.lg },
  count: { color: C.muted, fontWeight: '800' },
  lead: { color: C.text, fontWeight: '800', fontSize: 14 },
  pickTitle: { fontSize: 30, textAlign: 'center', color: C.ink, ...F.display },
  hint: { color: C.muted, fontWeight: '700', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, justifyContent: 'center' },
  cell: { width: '30%', minWidth: 96, maxWidth: 170, aspectRatio: 0.7 },
  back: { flex: 1, borderRadius: R.md, borderWidth: 3, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  backInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 },
  backNum: { color: '#FFC53D', fontSize: 52, ...F.display },
  backMark: { color: '#8D84A0', fontWeight: '900', fontSize: 10, letterSpacing: 2 },
  peekTitle: { fontWeight: '900', fontSize: 13, textAlign: 'center' },
  card: {
    alignItems: 'center', gap: S.sm, padding: S.xl, borderRadius: R.lg, borderWidth: 3, backgroundColor: C.surface, overflow: 'hidden',
    shadowOpacity: 0.55, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, elevation: 12, backfaceVisibility: 'hidden',
  },
  shine: { position: 'absolute', top: -80, bottom: -80, width: 70, backgroundColor: 'rgba(255,255,255,0.55)' },
  kind: { paddingHorizontal: S.md, paddingVertical: 4, borderRadius: R.pill },
  kindText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  voice: { color: C.muted, fontWeight: '800', fontSize: 13 },
  title: { fontSize: 28, textAlign: 'center', ...F.display },
  story: { color: C.text, textAlign: 'center', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  ruleBox: { alignSelf: 'stretch', gap: 4, padding: S.md, borderRadius: R.md, borderWidth: 2, backgroundColor: C.surface2 },
  ruleLabel: { fontWeight: '900', fontSize: 11, letterSpacing: 1.5, color: C.muted, textTransform: 'uppercase' },
  rule: { color: C.ink, fontWeight: '800', fontSize: 16, lineHeight: 22 },
  due: { color: C.muted, fontWeight: '800', fontSize: 13 },
  missed: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  miss: { width: '31%', minWidth: 96, padding: S.sm, borderRadius: R.sm, borderWidth: 2, backgroundColor: C.surface, gap: 2 },
  missKind: { fontWeight: '900', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  missTitle: { fontWeight: '800', fontSize: 12, color: C.ink },
});
