/**
 * The bench switch: once per run, move a bench player into the starting five for 5% of the cap (engine/season.ts
 * benchSwitch). Pick who comes off the bench, then the starter he replaces (only positions he can play).
 */
import { HistoryGate } from '../ui/HistoryGate';
import { runNeedsHistory } from '../data/historyReady';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { feel } from '../audio/feel';
import { moneyScaleFor } from '../data/modes';
import { squadRating } from '../engine/rotation';
import { SWITCH_FEE, roomAfterFees } from '../engine/season';
import { BENCH_SLOTS, STARTER_SLOTS, type SlotId, playsPos } from '../engine/types';
import { useGame } from '../store/game';
import { BackButton, Button, Card, Header, Label, Screen } from '../ui/components';
import { Icon } from '../ui/icons';
import { MoneyScale } from '../ui/MoneyScale';
import { PlayerCard } from '../ui/PlayerCard';
import { useRunColors } from '../ui/runColors';
import { SquadBadge } from '../ui/SquadBadge';
import { Text } from '../ui/Text';
import { C, S, money } from '../ui/theme';
import { goBack } from '../ui/nav';

function BenchSwitchScreen() {
  const { t } = useTranslation();
  const g = useGame();
  const runColors = useRunColors();
  const [bench, setBench] = useState<SlotId | null>(null);
  if (!g.season) return <Redirect href="/" />;
  const season = g.season;
  const user = season.teams[0];
  const scale = moneyScaleFor(g.poolId);
  const fee = money(SWITCH_FEE, scale);
  const room = roomAfterFees(season);
  const canPay = room >= SWITCH_FEE - 1e-9;
  const p = bench ? user.slots[bench] : null;
  const targets = p ? STARTER_SLOTS.filter((s) => playsPos(p, s)) : [];

  const doSwitch = (starter: SlotId) => {
    if (bench && g.doBenchSwitch(bench, starter)) { feel('pickChime'); router.replace('/season'); }
  };

  return (
    <MoneyScale.Provider value={scale}>
      <Screen tint={runColors[0]}>
        <Header title={t('switch.title')} left={<BackButton onPress={() => goBack()} />} />
        <Card style={styles.info}>
          <Icon name="swap" size={34} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.desc}>{t('switch.desc', { fee })}</Text>
            <Text style={[styles.room, !canPay && { color: C.danger }]} testID="switch-room">
              {canPay ? t('switch.room', { room: money(Math.max(0, room - SWITCH_FEE), scale) }) : t('switch.noRoom', { fee })}
            </Text>
          </View>
          <SquadBadge value={squadRating(user)} size="sm" />
        </Card>
        {season.switchUsed ? (
          <Text style={styles.desc}>{t('switch.used')}</Text>
        ) : !p ? (
          <>
            <Label>{t('switch.pickBench')}</Label>
            {BENCH_SLOTS.map((slot) => (
              <PlayerCard key={slot} player={user.slots[slot]} note={`${slot}`} testID={`switch-bench-${slot}`}
                disabled={!canPay} onPress={() => canPay && setBench(slot)} />
            ))}
          </>
        ) : (
          <>
            <Label>{t('switch.pickStarter', { name: p.name })}</Label>
            {targets.length === 0 && <Text style={styles.desc}>{t('draft.noSlot')}</Text>}
            {targets.map((slot) => (
              <PlayerCard key={slot} player={user.slots[slot]} note={slot} testID={`switch-starter-${slot}`} onPress={() => doSwitch(slot)} />
            ))}
            <Button label={t('switch.back')} variant="ghost" onPress={() => setBench(null)} />
          </>
        )}
      </Screen>
    </MoneyScale.Provider>
  );
}


/** Waits for the full history when this run needs it (an era, All-Time, a franchise, Crisis, Career). */
export default function BenchSwitch() {
  const needs = useGame((s) => runNeedsHistory(s));
  return <HistoryGate when={needs}><BenchSwitchScreen /></HistoryGate>;
}

const styles = StyleSheet.create({
  info: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  desc: { color: C.text, fontSize: 14, lineHeight: 20 },
  room: { color: C.ink, fontWeight: '900', fontSize: 13 },
});
