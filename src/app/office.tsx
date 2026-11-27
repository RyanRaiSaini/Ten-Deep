/**
 * The front office (Management Crisis): sell a player for his contract value and sign his replacement from three
 * priced options or a minimum bench option. Board demands are met (or broken) here.
 */
import { HistoryGate } from '../ui/HistoryGate';
import { runNeedsHistory } from '../data/historyReady';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { feel } from '../audio/feel';
import { moneyScaleFor } from '../data/modes';
import { payOf } from '../engine/cap';
import { blocked, budgetFor, marketOptions } from '../engine/board/market';
import { roomAfterFees } from '../engine/season';
import { ALL_SLOTS, type SlotId } from '../engine/types';
import { POOLS, current2026 } from '../data';
import { useGame } from '../store/game';
import { BackButton, Button, Card, Header, Label, Screen } from '../ui/components';
import { Icon } from '../ui/icons';
import { MoneyScale } from '../ui/MoneyScale';
import { PlayerCard } from '../ui/PlayerCard';
import { Text } from '../ui/Text';
import { BoardNews, ConfidenceMeter } from '../ui/board/BoardPanel';
import { C, R, S, money } from '../ui/theme';
import { goBack } from '../ui/nav';

const TIER_COLOR = { low: C.teal, mid: C.blue, top: C.gold, bench: C.muted, perk: C.purple } as const;

function OfficeScreen() {
  const { t } = useTranslation();
  const g = useGame();
  const [slot, setSlot] = useState<SlotId | null>(null);
  if (g.phase === 'result') return <Redirect href="/result" />;
  const board = g.crisis?.board;
  if (!board || !g.season) return <Redirect href="/season" />;
  const season = g.season;
  const user = season.teams[0];
  const scale = moneyScaleFor(g.poolId);
  const pool = POOLS[g.poolId] ?? current2026;
  const options = slot ? marketOptions(season, board, slot, pool) : [];

  const sign = (i: number) => {
    if (!slot) return;
    const fired = g.boardSign(slot, options[i]);
    feel('pickChime');
    if (fired) router.replace('/result');
    else setSlot(null);
  };

  return (
    <MoneyScale.Provider value={scale}>
      <Screen>
        <Header title={t('board.office')} left={<BackButton onPress={() => goBack()} />} />
        <Card style={{ gap: S.sm }}>
          <View style={styles.info}>
            <Icon name="briefcase" size={34} />
            <Text style={styles.desc}>{t('board.officeDesc')}</Text>
          </View>
          <Text style={styles.room} testID="office-room">{t('board.officeRoom', { room: money(roomAfterFees(season), scale) })}</Text>
          <ConfidenceMeter value={board.confidence} />
          <BoardNews events={g.crisis?.news ?? []} />
          {board.crunch && <Text style={[styles.note, { color: C.danger }]}>{t('board.crunch')}</Text>}
          {board.perks.includes('agent-friend') && <Text style={[styles.note, { color: C.blue }]}>{t('board.agent')}</Text>}
        </Card>

        {!slot ? (
          <>
            <Label>{t('board.officePick')}</Label>
            {ALL_SLOTS.map((k) => (
              <PlayerCard key={k} player={user.slots[k]} note={k} testID={`office-sell-${k}`} onPress={() => setSlot(k)} />
            ))}
          </>
        ) : (
          <>
            <PlayerCard player={user.slots[slot]} note={slot} selected />
            <Text style={styles.budget} testID="office-budget">
              {t('board.officeBudget', { budget: money(budgetFor(season, slot), scale), pay: money(payOf(user.slots[slot]), scale) })}
            </Text>
            {options.map((o, i) => {
              const why = blocked(season, board, slot, o);
              return (
                <View key={`${o.tier}-${o.player.id}`} style={[styles.option, { borderColor: TIER_COLOR[o.tier] }]} testID={`office-option-${o.tier}`}>
                  <View style={styles.optionHead}>
                    <Text style={[styles.tier, { backgroundColor: TIER_COLOR[o.tier] }]}>{t(`board.tiers.${o.tier}`)}</Text>
                    {why && <Text style={styles.why}>{why === 'budget' ? t('board.overBudget') : t('board.crunch')}</Text>}
                  </View>
                  <PlayerCard player={o.player} />
                  <Button label={t('board.officeSign', { pay: money(o.pay, scale) })} disabled={!!why} variant={o.tier === 'top' ? 'gold' : 'primary'}
                    onPress={() => sign(i)} testID={`office-sign-${o.tier}`} />
                </View>
              );
            })}
            <Button label={t('board.officeRespin', { n: board.respins })} variant="blue" disabled={board.respins <= 0}
              icon={<Icon name="reroll" size={22} />} onPress={() => { if (g.boardRespin()) feel('flip'); }} testID="office-respin" />
            <Button label={t('board.officeBack')} variant="ghost" onPress={() => setSlot(null)} />
          </>
        )}
      </Screen>
    </MoneyScale.Provider>
  );
}

/** Waits for the full history when this run needs it. */
export default function Office() {
  const needs = useGame((s) => runNeedsHistory(s));
  return <HistoryGate when={needs}><OfficeScreen /></HistoryGate>;
}

const styles = StyleSheet.create({
  info: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  desc: { flex: 1, color: C.text, fontSize: 14, lineHeight: 20 },
  room: { color: C.ink, fontWeight: '900', fontSize: 15 },
  note: { fontWeight: '800', fontSize: 13 },
  budget: { color: C.ink, fontWeight: '800', fontSize: 14 },
  option: { gap: S.sm, padding: S.sm, borderRadius: R.md, borderWidth: 2, backgroundColor: C.surface },
  optionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tier: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 10, paddingVertical: 3, borderRadius: R.pill, overflow: 'hidden' },
  why: { color: C.danger, fontWeight: '800', fontSize: 12 },
});
