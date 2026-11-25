import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../ui/Text';
import { feel } from '../audio/feel';
import { POOLS } from '../data';
import { CAP, MAX_SUPERSTARS, capRoom, payOf, superstarCount } from '../engine/cap';
import { fallbackPick, isComplete, options, reserveNeeded } from '../engine/draft';
import type { SlotId } from '../engine/types';
import { useGame } from '../store/game';
import { goHome } from '../ui/nav';
import { BackButton, Button, Card, Display, Header, Screen } from '../ui/components';
import { Icon } from '../ui/icons';
import { Confetti, Pulse } from '../ui/fx';
import { PlayerCard } from '../ui/PlayerCard';
import { DivisionPicker } from '../ui/DivisionPicker';
import { SquadBadge } from '../ui/SquadBadge';
import { partialSquadRating } from '../engine/rotation';
import { RosterBoard } from '../ui/RosterBoard';
import { Spinner, teamGradient } from '../ui/Spinner';
import { C, FONT, R, S, money } from '../ui/theme';
import { useRunColors } from '../ui/runColors';
import { Die } from '../ui/Dice';
import { useShop } from '../store/shop';

export default function Draft() {
  const { t } = useTranslation();
  const runColors = useRunColors();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const g = useGame();
  const [spinKey, setSpinKey] = useState(0);
  const [landed, setLanded] = useState(true);
  const [chosen, setChosen] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const rerolls = useShop((s) => s.rerolls);

  const pool = POOLS[g.poolId];
  if (!g.draft || !pool) return <Redirect href="/" />;
  const d = g.draft;

  const room = capRoom(d.roster);
  const spendable = room - reserveNeeded(d.roster, new Set(d.used), pool);
  const complete = isComplete(d);
  const opts = d.spin && landed ? options(d, pool) : [];
  const usable = opts.filter((o) => o.affordable);
  const chosenOpt = opts.find((o) => o.player.id === chosen);
  const fallback = d.spin && landed && usable.length === 0 && !complete && d.respinsLeft === 0 ? safeFallback() : null;

  function safeFallback() {
    try { return fallbackPick(d, pool); } catch { return null; }
  }

  const doSpin = (re = false) => {
    setChosen(null);
    setLanded(false);
    if (re) g.doRespin(); else g.doSpin();
    setSpinKey((k) => k + 1);
  };

  const place = (playerId: string, slot: SlotId) => {
    const star = (d.spin?.players.find((p) => p.id === playerId)?.ovr ?? 0) >= 95;
    g.doPick(playerId, slot);
    setChosen(null);
    feel(star ? 'fanfare' : 'pickChime');
    if (star) setBurst((b) => b + 1);
  };

  const capCard = (
    <Card style={{ gap: S.sm }} testID="cap">
      <View style={styles.capRow}>
        <Text style={styles.capLabel}>{t('squad.rating')}</Text>
        <SquadBadge value={partialSquadRating(d.roster)} size="sm" />
      </View>
      <View style={styles.capRow}>
        <Text style={styles.capLabel}>{t('draft.capSpace')}</Text>
        <Text style={styles.capNum}>{money(room)} <Text style={styles.capOf}>/ {money(CAP)}</Text></Text>
      </View>
      <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.max(0, (room / CAP) * 100)}%` }]} /></View>
      <View style={styles.capRow}>
        <Text style={styles.spendable}>{t('draft.spendable', { amount: money(Math.max(0, spendable)) })}</Text>
        <View style={styles.stars} accessibilityLabel={t('draft.superstars', { n: superstarCount(d.roster) })}>
          {Array.from({ length: MAX_SUPERSTARS }, (_, i) => (
            <View key={i} style={{ opacity: i < superstarCount(d.roster) ? 1 : 0.25 }}><Icon name="star" size={20} /></View>
          ))}
        </View>
      </View>
    </Card>
  );

  const spinPanel = !complete && (
    <View style={{ gap: S.md }}>
      {d.spin || !landed ? (
        <Spinner target={d.spin} decoys={pool.teams} spinKey={spinKey} onLanded={() => setLanded(true)} />
      ) : (
        <Pulse>
          <Pressable onPress={() => doSpin()} testID="spin" accessibilityRole="button" style={({ pressed }) => [styles.spinBtn, pressed && styles.spinBtnPressed]}>
            <Icon name="ball" size={44} />
            <Display size={34}>{t('draft.spin').replace(/^[^\p{L}\p{N}]+/u, '')}</Display>
          </Pressable>
        </Pulse>
      )}
      {landed && d.spin && (
        <View style={{ gap: S.sm }}>
          {/* Respin / re-roll first, so it's the first thing you see when the wheel lands. */}
          {usable.length === 0 && <Text style={styles.warn}>{t('draft.nothingFits')}</Text>}
          {d.respinsLeft > 0 && (
            <Button label={t('draft.respin', { n: d.respinsLeft })} variant="secondary" icon={<Die size={26} color="purple" faces={[3, 5, 1]} />} onPress={() => doSpin(true)} testID="respin" />
          )}
          {d.respinsLeft === 0 && !complete && !g.daily && !g.challenge && (
            rerolls > 0 ? (
              <Button label={t('shop.use', { n: rerolls })} variant="blue" icon={<Die size={26} color="white" />} testID="reroll"
                onPress={() => { setChosen(null); setLanded(false); if (g.doReroll()) setSpinKey((k) => k + 1); else setLanded(true); }} />
            ) : (
              <Button label={t('shop.none')} variant="ghost" icon={<Icon name="shop" size={22} />} onPress={() => router.push('/shop')} testID="reroll-shop" />
            )
          )}
          {fallback && d.respinsLeft === 0 && (
            <Button
              label={t('draft.signFallback', { name: fallback.name, salary: money(payOf(fallback)) })}
              variant="dark"
              onPress={() => { g.doFallback(); feel('pickChime'); }}
              testID="fallback"
            />
          )}
          {opts.map((o) => (
            <PlayerCard
              key={o.player.id}
              testID={o.affordable ? 'option' : undefined}
              player={o.player}
              accent={teamGradient(d.spin!.colors)[0]}
              disabled={!o.affordable}
              selected={chosen === o.player.id}
              slots={o.slots}
              onSlot={(slot) => place(o.player.id, slot)}
              note={!o.affordable ? (o.slots.length ? (o.player.ovr >= 95 && superstarCount(d.roster) >= MAX_SUPERSTARS ? t('draft.superstarLimit') : t('draft.overCap')) : t('draft.noSlot')) : undefined}
              onPress={() => (o.slots.length === 1 ? place(o.player.id, o.slots[0]) : setChosen(o.player.id))}
            />
          ))}
        </View>
      )}
    </View>
  );

  const board = (
    <View style={{ gap: S.sm }}>
      {chosenOpt && <Text style={styles.choose}>{t('draft.chooseSlot')}</Text>}
      <RosterBoard
        roster={d.roster}
        color={runColors[0]}
        highlight={chosenOpt?.slots}
        onSlot={chosenOpt ? (slot) => chosenOpt.slots.includes(slot) && place(chosenOpt.player.id, slot) : undefined}
      />
    </View>
  );

  const start = complete && (
    <View style={{ gap: S.md }}>
    <DivisionPicker seed={d.seed} />
    <Button label={t('draft.startSeason')} variant="gold" icon={<Icon name="play" size={22} />} onPress={() => { g.startSeason(); router.replace(useGame.getState().phase === 'crisis' ? '/crisis' : '/season'); }} testID="start-season" />
    </View>
  );

  return (
    <Screen tint={runColors[0]} wide={wide} overlay={burst ? <Confetti key={burst} count={36} colors={['#FFC53D', runColors[0], '#FFFFFF']} /> : null}>
      <Header
        title={complete ? t('draft.starters') : t('draft.pick', { n: d.round + 1 })}
        left={<BackButton onPress={() => goHome()} />}
        right={(
          <View style={styles.headRight}>
            <Pressable onPress={() => router.push('/how')} accessibilityRole="button" accessibilityLabel={t('how.link')} testID="how-link"
              style={({ pressed }) => [styles.help, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}>
              <Text style={styles.helpText}>?</Text>
            </Pressable>
            <Text style={styles.round}>{Math.min(10, d.round + (complete ? 0 : 1))}/10</Text>
          </View>
        )}
      />
      {wide ? (
        <View style={styles.columns}>
          <View style={styles.colLeft}>{capCard}{board}{start}</View>
          <View style={styles.colRight}>{spinPanel}{complete && <Text style={styles.done}>{t('draft.starters')}</Text>}</View>
        </View>
      ) : (
        <>
          {capCard}
          {spinPanel}
          {start}
          {board}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  round: { fontFamily: FONT.display, fontSize: 20, color: C.ink, textAlign: 'right' },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  help: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: C.ink, borderBottomWidth: 4 },
  helpText: { fontFamily: FONT.display, fontSize: 20, color: C.ink, marginTop: -1 },
  stars: { flexDirection: 'row', gap: 2 },
  capRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  capLabel: { fontWeight: '900', fontSize: 12, letterSpacing: 1.4, color: C.muted, textTransform: 'uppercase' },
  capNum: { color: C.ink, fontSize: 24, fontFamily: FONT.display },
  capOf: { color: C.muted, fontSize: 16, fontFamily: FONT.display },
  bar: { height: 14, borderRadius: R.pill, backgroundColor: C.surface2, overflow: 'hidden', borderWidth: 2, borderColor: C.ink },
  barFill: { height: '100%', backgroundColor: '#18C08A' },
  spendable: { color: C.muted, fontSize: 13, fontWeight: '700' },
  warn: { color: C.danger, fontSize: 13, fontWeight: '800' },
  choose: { color: C.neon, fontWeight: '900', textAlign: 'center' },
  spinBtn: {
    height: 120, borderRadius: R.lg, backgroundColor: C.hardwood, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 8,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: S.md,
  },
  spinBtnPressed: { transform: [{ translateY: 4 }], borderBottomWidth: 4 },
  columns: { flexDirection: 'row', gap: S.xl, alignItems: 'flex-start' },
  colLeft: { flex: 1, gap: S.md, maxWidth: 520 },
  colRight: { flex: 1, gap: S.md },
  done: { fontFamily: FONT.display, fontSize: 28, color: C.ink, textAlign: 'center' },
});
