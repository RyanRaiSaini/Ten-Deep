import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../ui/Text';
import { feel } from '../audio/feel';
import { POOLS } from '../data';
import { CAP, MAX_SUPERSTARS, capRoom, salaryFor, superstarCount } from '../engine/cap';
import { fallbackPick, isComplete, options, reserveNeeded } from '../engine/draft';
import type { SlotId } from '../engine/types';
import { useGame } from '../store/game';
import { goHome } from '../ui/nav';
import { BackButton, Button, Card, Display, Header, Screen } from '../ui/components';
import { Icon } from '../ui/icons';
import { PlayerCard } from '../ui/PlayerCard';
import { RosterBoard } from '../ui/RosterBoard';
import { Spinner, teamGradient } from '../ui/Spinner';
import { C, FONT, R, S, money } from '../ui/theme';
import { useRunColors } from '../ui/runColors';

export default function Draft() {
  const { t } = useTranslation();
  const runColors = useRunColors();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const g = useGame();
  const [spinKey, setSpinKey] = useState(0);
  const [landed, setLanded] = useState(true);
  const [chosen, setChosen] = useState<string | null>(null);

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
    g.doPick(playerId, slot);
    setChosen(null);
    feel('pickChime');
  };

  const capCard = (
    <Card style={{ gap: S.sm }} testID="cap">
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
        <Pressable onPress={() => doSpin()} testID="spin" accessibilityRole="button" style={({ pressed }) => [styles.spinBtn, pressed && styles.spinBtnPressed]}>
          <Icon name="ball" size={44} />
          <Display size={34}>{t('draft.spin').replace(/^\W+/, '')}</Display>
        </Pressable>
      )}
      {landed && d.spin && (
        <View style={{ gap: S.sm }}>
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
          {usable.length === 0 && <Text style={styles.warn}>{t('draft.nothingFits')}</Text>}
          {d.respinsLeft > 0 && (
            <Button label={t('draft.respin', { n: d.respinsLeft })} variant="secondary" icon={<Icon name="swap" size={22} />} onPress={() => doSpin(true)} testID="respin" />
          )}
          {fallback && d.respinsLeft === 0 && (
            <Button
              label={t('draft.signFallback', { name: fallback.name, salary: money(salaryFor(fallback.ovr)) })}
              variant="dark"
              onPress={() => { g.doFallback(); feel('pickChime'); }}
              testID="fallback"
            />
          )}
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
    <Button label={t('draft.startSeason')} variant="gold" icon={<Icon name="play" size={22} />} onPress={() => { g.startSeason(); router.replace(useGame.getState().phase === 'crisis' ? '/crisis' : '/season'); }} testID="start-season" />
  );

  return (
    <Screen tint={runColors[0]} wide={wide}>
      <Header
        title={complete ? t('draft.starters') : t('draft.pick', { n: d.round + 1 })}
        left={<BackButton onPress={() => goHome()} />}
        right={<Text style={styles.round}>{Math.min(10, d.round + (complete ? 0 : 1))}/10</Text>}
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
