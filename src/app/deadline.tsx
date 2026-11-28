import { HistoryGate } from '../ui/HistoryGate';
import { runNeedsHistory } from '../data/historyReady';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { MoneyScale } from '../ui/MoneyScale';
import { moneyScaleFor } from '../data/modes';
import { feel } from '../audio/feel';
import { POOLS } from '../data';
import { roomAfterFees, tradeBudget, tradeSwap } from '../engine/season';
import { payOf } from '../engine/cap';
import { ALL_SLOTS, STARTER_SLOTS, playsPos } from '../engine/types';
import { useGame } from '../store/game';
import { Button, Card, Header, Label, Screen } from '../ui/components';
import { PlayerCard } from '../ui/PlayerCard';
import { Spinner } from '../ui/Spinner';
import { C, S, money } from '../ui/theme';
import { useRunColors } from '../ui/runColors';
import { Icon } from '../ui/icons';

function DeadlineScreen() {
  const { t } = useTranslation();
  const runColors = useRunColors();
  const g = useGame();
  const [spinKey, setSpinKey] = useState(0);
  const [landed, setLanded] = useState(true);
  const pool = POOLS[g.poolId];
  const decoys = useMemo(() => pool?.teams ?? [], [pool]);

  if (!g.season || !g.deadline || !pool) return <Redirect href="/season" />;
  const { season, deadline } = g;
  const user = season.teams[0];

  const done = (fn: () => void) => { fn(); router.replace('/season'); };
  // What you can take on: your cap room plus the outgoing player's salary (engine/season.ts tradeBudget).
  const scale = moneyScaleFor(g.poolId);
  const outSlot = ALL_SLOTS.find((k) => user.slots[k].id === deadline.outId);
  const budget = outSlot && (
    <Text style={styles.budget} testID="deadline-budget">
      {t('deadline.budget', {
        budget: money(tradeBudget(user.slots, outSlot, season.fees), scale), room: money(Math.max(0, roomAfterFees(season)), scale),
        name: user.slots[outSlot].name, out: money(payOf(user.slots[outSlot]), scale),
      })}
    </Text>
  );
  // Everyone on the team you landed on who can play the spot you're filling (a starter's position), best first.
  const mine = new Set(ALL_SLOTS.map((k) => user.slots[k].name));
  const roster = (deadline.spin?.players ?? []).filter((p) => !mine.has(p.name)).sort((a, b) => b.ovr - a.ovr);
  const fitting = outSlot && STARTER_SLOTS.includes(outSlot) ? roster.filter((p) => playsPos(p, outSlot)) : roster;
  const candidates = deadline.spin && landed && deadline.outId
    ? (fitting.length ? fitting : roster).map((p) => {
        // Show the real reason a signing is blocked (position or cap).
        let why: string | null = null;
        try { tradeSwap(season, deadline.outId!, p); } catch (e) {
          const m = (e as Error).message;
          why = /can't play/i.test(m) ? t('draft.noSlot') : t('draft.overCap');
        }
        return { p, ok: !why, why };
      })
    : [];

  return (
    <MoneyScale.Provider value={moneyScaleFor(g.poolId)}>
    <Screen tint={runColors[0]}>
      <Header title={t('deadline.title')} />
      <Text style={styles.desc}>{t('deadline.desc')}</Text>
      <Text style={styles.budget} testID="deadline-room">{t('deadline.room', { room: money(Math.max(0, roomAfterFees(season)), scale) })}</Text>

      {!deadline.spun && (
        <>
          <Label>{t('deadline.chooseOut')}</Label>
          <View style={{ gap: S.sm }}>
            {ALL_SLOTS.map((slot) => (
              <PlayerCard
                key={slot}
                player={user.slots[slot]}
                note={slot}
                testID={`out-${slot}`}
                selected={deadline.outId === user.slots[slot].id}
                onPress={() => g.chooseDeadlineOut(user.slots[slot].id)}
              />
            ))}
          </View>
          {budget}
          <Button
            label={t('deadline.spin')} icon={<Icon name="ball" size={22} />}
            disabled={!deadline.outId}
            onPress={() => { setLanded(false); g.spinDeadline(); setSpinKey((k) => k + 1); }}
            testID="deadline-spin"
          />
        </>
      )}

      {deadline.spun && (
        <Card style={{ gap: S.md }}>
          <Spinner target={deadline.spin ?? null} decoys={decoys} spinKey={spinKey} onLanded={() => setLanded(true)} />
          {budget}
          {candidates.map(({ p, ok, why }) => (
            <PlayerCard key={p.id} player={p} disabled={!ok} note={why ?? undefined}
              onPress={() => done(() => { g.signDeadline(p); feel('pickChime'); })} />
          ))}
        </Card>
      )}

      <Button label={t('deadline.skip')} variant="ghost" onPress={() => done(g.skipDeadline)} testID="deadline-skip" />
      <Text style={[styles.desc, { color: C.muted }]}>{season.records[0].w}-{season.records[0].l}</Text>
    </Screen>
    </MoneyScale.Provider>
  );
}


/** Waits for the full history when this run needs it (an era, All-Time, a franchise, Crisis, Career). */
export default function Deadline() {
  const needs = useGame((s) => runNeedsHistory(s));
  return <HistoryGate when={needs}><DeadlineScreen /></HistoryGate>;
}

const styles = StyleSheet.create({
  desc: { color: C.text, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  budget: { color: C.text, fontSize: 14, fontWeight: '900', textAlign: 'center' },
});
