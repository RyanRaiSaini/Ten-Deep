import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { feel } from '../audio/feel';
import { POOLS } from '../data';
import { CAP, MAX_SUPERSTARS, capRoom, salaryFor, superstarCount } from '../engine/cap';
import { fallbackPick, isComplete, options, reserveNeeded } from '../engine/draft';
import type { SlotId } from '../engine/types';
import { useGame } from '../store/game';
import { goHome } from '../ui/nav';
import { Button, Card, Header, Label, Screen } from '../ui/components';
import { PlayerCard } from '../ui/PlayerCard';
import { RosterBoard } from '../ui/RosterBoard';
import { Spinner } from '../ui/Spinner';
import { C, F, R, S, money } from '../ui/theme';

export default function Draft() {
  const { t } = useTranslation();
  const g = useGame();
  const [spinKey, setSpinKey] = useState(0);
  const [landed, setLanded] = useState(true);
  const [chosen, setChosen] = useState<string | null>(null);

  const pool = POOLS[g.poolId];
  const decoys = useMemo(() => pool?.teams.map((x) => x.label) ?? [], [pool]);
  if (!g.draft || !pool) return <Redirect href="/" />;
  const d = g.draft;

  const room = capRoom(d.roster);
  const spendable = room - reserveNeeded(d.roster, new Set(d.used), pool);
  const complete = isComplete(d);
  const opts = d.spin && landed ? options(d, pool) : [];
  const usable = opts.filter((o) => o.affordable);
  const chosenOpt = opts.find((o) => o.player.id === chosen);
  const fallback = d.spin && landed && usable.length === 0 && !complete ? safeFallback() : null;

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

  return (
    <Screen>
      <Header
        title={complete ? t('draft.starters') : t('draft.pick', { n: d.round + 1 })}
        left={<Button label="‹" variant="ghost" onPress={() => goHome()} style={{ paddingVertical: 6 }} />}
        right={<Text style={styles.stars}>★ {superstarCount(d.roster)}/{MAX_SUPERSTARS}</Text>}
      />

      <Card style={{ gap: S.sm }}>
        <View style={styles.capRow}>
          <Label>{t('draft.capSpace')}</Label>
          <Text style={styles.capNum}>{money(room)} / {money(CAP)}</Text>
        </View>
        <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.max(0, (room / CAP) * 100)}%` }]} /></View>
        <Text style={styles.spendable}>{t('draft.spendable', { amount: money(Math.max(0, spendable)) })}</Text>
      </Card>

      {!complete && (
        <Card style={{ gap: S.md }}>
          {d.spin || !landed ? (
            <>
              <Label>{t('draft.landed')}</Label>
              <Spinner target={d.spin?.label ?? ''} decoys={decoys} spinKey={spinKey} onLanded={() => setLanded(true)} />
            </>
          ) : (
            <Button label={`🎰  ${t('draft.spin')}`} onPress={() => doSpin()} testID="spin" />
          )}

          {landed && d.spin && (
            <View style={{ gap: S.sm }}>
              {opts.map((o) => (
                <PlayerCard
                  key={o.player.id}
                  testID={o.affordable ? 'option' : undefined}
                  player={o.player}
                  disabled={!o.affordable}
                  selected={chosen === o.player.id}
                  note={!o.affordable ? (o.slots.length ? (o.player.ovr >= 95 && superstarCount(d.roster) >= MAX_SUPERSTARS ? t('draft.superstarLimit') : t('draft.overCap')) : t('draft.noSlot')) : undefined}
                  onPress={() => (o.slots.length === 1 ? place(o.player.id, o.slots[0]) : setChosen(o.player.id))}
                />
              ))}
              {usable.length === 0 && <Text style={styles.warn}>{t('draft.nothingFits')}</Text>}
              {d.respinsLeft > 0 && (
                <Button label={t('draft.respin', { n: d.respinsLeft })} variant="secondary" onPress={() => doSpin(true)} testID="respin" />
              )}
              {fallback && d.respinsLeft === 0 && (
                <Button
                  label={t('draft.signFallback', { name: fallback.name, salary: money(salaryFor(fallback.ovr)) })}
                  variant="ghost"
                  onPress={() => { g.doFallback(); feel('pickChime'); }}
                  testID="fallback"
                />
              )}
            </View>
          )}
        </Card>
      )}

      {chosenOpt && <Text style={styles.choose}>{t('draft.chooseSlot')}</Text>}
      <RosterBoard
        roster={d.roster}
        highlight={chosenOpt?.slots}
        onSlot={chosenOpt ? (slot) => chosenOpt.slots.includes(slot) && place(chosenOpt.player.id, slot) : undefined}
      />

      {complete && (
        <Button label={t('draft.startSeason')} variant="gold" onPress={() => { g.startSeason(); router.replace('/season'); }} testID="start-season" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stars: { color: C.gold, fontWeight: '800' },
  capRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  capNum: { color: C.text, fontSize: 16, ...F.display },
  bar: { height: 8, borderRadius: R.pill, backgroundColor: C.surface2, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: C.neon },
  spendable: { color: C.muted, fontSize: 12 },
  warn: { color: C.danger, fontSize: 13 },
  choose: { color: C.neon, fontWeight: '800', textAlign: 'center' },
});
