import { HistoryGate } from '../ui/HistoryGate';
import { runNeedsHistory } from '../data/historyReady';
import { useGame } from '../store/game';
import { DivisionPicker } from '../ui/DivisionPicker';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { feel } from '../audio/feel';
import { affordableFor, askingPrice, minimumException, openSlotCount, payrollAfterResign, RESIGN_THRESHOLD, seasonLabel } from '../engine/career/offseason';
import { APRON, CAP } from '../engine/cap';
import { ALL_SLOTS, type Player, type SlotId } from '../engine/types';
import { useCareer } from '../store/career';
import { BackButton, Button, Card, Header, Label, Screen } from '../ui/components';
import { PlayerCard } from '../ui/PlayerCard';
import { RosterBoard } from '../ui/RosterBoard';
import { C, money, F, S } from '../ui/theme';
import { LotteryReveal } from '../ui/Lottery';
import { BoardStop } from '../ui/board/BoardStop';
import { Icon } from '../ui/icons';

/** The offseason, one step at a time: development and contracts → rookie draft → free agency → next season. */
function OffseasonScreen() {
  const { t } = useTranslation();
  const c = useCareer();
  const st = c.offseason;
  const [keep, setKeep] = useState<string[] | null>(null);
  const [rookie, setRookie] = useState<string | null>(null);
  const [cut, setCut] = useState<SlotId | null>(null);
  const [chosen, setChosen] = useState<{ player: Player; slots: SlotId[] } | null>(null);
  const [moving, setMoving] = useState<SlotId | null>(null);
  const [lineupBad, setLineupBad] = useState(false);
  const g = useGame();
  const cardParked = c.step === 'card' && !g.crisis?.offseason && !!g.parked?.crisis?.offseason;
  // Another run took over meanwhile: bring the career's card back.
  useEffect(() => { if (cardParked) useGame.getState().resumeCareer(); }, [cardParked]);

  if (!c.step) return <Redirect href="/career" />;

  // --- Step 0: the year's one board card, as the offseason opens ----------------------------------
  if (c.step === 'card') {
    return (
      <Screen key="step-0">
        <Header title={`${t('career.title')} · ${seasonLabel(c.season + 1)}`} left={<BackButton onPress={() => router.navigate('/career')} />} />
        <Text style={styles.muted}>{t('career.offCardHint')}</Text>
        <BoardStop inline={{ label: t('career.offCard'), kind: 'objective', onResolved: () => { c.cardDone(); feel('pickChime'); } }} />
        {g.crisis?.offseason && g.crisis.board && !g.crisis.board.hand && !g.crisis.board.picked && (
          <Button label={t('career.toOffseason')} variant="gold" onPress={() => c.cardDone()} testID="off-card-done" />
        )}
      </Screen>
    );
  }
  if (!st) return <Redirect href="/career" />;
  const user = st.teams[0];
  const mineIds = new Set(st.changes.map((x) => x.id));
  const retiredMine = st.retired.filter((p) => mineIds.has(p.id));
  // The league's notable retirements this offseason (the best players to hang it up), so you see the old guard go.
  const retiredLeague = st.retired.filter((p) => !mineIds.has(p.id) && p.ovr >= 78).sort((a, b) => b.ovr - a.ovr).slice(0, 8);

  // --- Step 1: development + contracts ------------------------------------------------------------
  if (c.step === 'expiring') {
    const expiring = st.expiring.map((id) => ALL_SLOTS.map((k) => user.slots[k]).find((p) => p?.id === id)!).filter(Boolean);
    // Default: re-sign the good ones, best first, while payroll stays under the apron.
    const kept = keep ?? expiring.filter((p) => p.ovr >= RESIGN_THRESHOLD).sort((a, b) => b.ovr - a.ovr).map((p) => p.id)
      .reduce<string[]>((acc, id) => (payrollAfterResign(st, [...acc, id]) <= APRON ? [...acc, id] : acc), []);
    const payroll = payrollAfterResign(st, kept);
    return (
      <Screen key="step-1">
        <Header title={`${t('career.title')} · ${seasonLabel(st.season)}`} left={<BackButton onPress={() => router.navigate('/career')} />} />
        <Label>{t('career.progress')}</Label>
        <Card style={{ gap: 4 }}>
          {st.changes.map((x) => {
            const d = x.to - x.from;
            return (
              <View key={x.id} style={styles.change}>
                <Text style={styles.changeName} numberOfLines={1}>{x.name}</Text>
                <Text style={styles.muted}>{x.age}y</Text>
                <Text style={[styles.delta, { color: d > 0 ? C.neon : d < 0 ? C.danger : C.muted }]}>
                  {x.from} → {x.to} {d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : '='}
                </Text>
              </View>
            );
          })}
        </Card>
        {retiredMine.length > 0 && (
          <Text style={styles.retired}>{t('career.retired')}: {retiredMine.map((p) => p.name).join(', ')}</Text>
        )}
        {retiredLeague.length > 0 && (
          <Text style={styles.retiredLeague} testID="retired-league">
            {t('career.retiredLeague')}: {retiredLeague.map((p) => `${p.name} (${p.age})`).join(', ')}
          </Text>
        )}
        {expiring.length > 0 && (
          <>
            <Label>{t('career.expiring')}</Label>
            <Text style={styles.muted}>{t('career.expiringHint')}</Text>
            <Text style={[styles.muted, payroll > CAP && { color: C.danger }]} testID="resign-payroll">
              {t('career.payroll', { pay: money(payroll), cap: money(CAP), apron: money(APRON) })}
            </Text>
            {expiring.map((p) => {
              const on = kept.includes(p.id);
              const fits = on || payrollAfterResign(st, [...kept, p.id]) <= APRON;
              return (
                <PlayerCard
                  key={p.id}
                  // The new deal: today's market rate (his old contract, real or not, is up).
                  player={{ ...p, salary: askingPrice(p), contractType: undefined, released: true }}
                  testID="expiring"
                  selected={on}
                  note={on ? t('career.resign') : fits ? t('career.release') : t('career.overApron')}
                  onPress={() => (on ? setKeep(kept.filter((x) => x !== p.id)) : fits ? setKeep([...kept, p.id]) : undefined)}
                />
              );
            })}
          </>
        )}
        <Button label={t('career.confirmContracts')} onPress={() => { c.keep(kept); feel('pickChime'); }} testID="off-contracts" />
      </Screen>
    );
  }

  // --- Step 2: rookie draft ------------------------------------------------------------------------
  if (c.step === 'draft') {
    const pickNo = st.order.indexOf(0) + 1;
    const available = st.rookies.slice(pickNo - 1, pickNo + 5); // teams ahead take the best left
    const full = openSlotCount(st, 0) === 0;
    const pickId = rookie ?? available[0]?.id;
    const pick = available.find((r) => r.id === pickId);
    return (
      <Screen key="step-2">
        <Header title={t('career.draft')} left={<BackButton onPress={() => router.navigate('/career')} />} />
        <LotteryReveal order={st.order} names={(i) => (i === 0 ? t('league.you') : st.teams[i].name)} colors={(i) => st.teams[i].colors} />
        <Text style={styles.big} testID="pick-no">{t('career.yourPick', { n: pickNo })}</Text>
        {available.map((r) => (
          <PlayerCard key={r.id} player={r} testID="rookie" selected={pickId === r.id} onPress={() => setRookie(r.id)} />
        ))}
        {full && (
          <>
            <Text style={[styles.muted, { color: C.gold }]}>{t('career.rosterFull')}</Text>
            <RosterBoard roster={user.slots} highlight={cut ? [cut] : [...ALL_SLOTS]} onSlot={(s) => setCut(s)} />
          </>
        )}
        <Button
          label={t('career.draftThis', { name: pick?.name ?? '' })}
          disabled={!pick || (full && !cut)}
          onPress={() => { c.draftRookie(pickId, full ? cut ?? undefined : undefined); feel('pickChime'); }}
          testID="off-draft"
        />
        {full && <Button label={t('career.skipRookie')} variant="ghost" onPress={() => c.draftRookie(pickId)} testID="off-skip-rookie" />}
      </Screen>
    );
  }

  // --- Step 3: free agency --------------------------------------------------------------------------
  const open = openSlotCount(st, 0);
  const options = affordableFor(st, 0).sort((a, b) => b.player.ovr - a.player.ovr).slice(0, 12);
  const minEx = options.length === 0 ? minimumException(st, 0) : null;
  const sign = (player: Player, slot: SlotId) => {
    c.sign(player, slot);
    setChosen(null);
    feel('pickChime');
  };
  // Lineup: tap a player, then the spot he moves to (anyone can come off the bench; starters must play the spot).
  const tapLineup = (slot: SlotId) => {
    setLineupBad(false);
    if (!moving) { if (user.slots[slot]) setMoving(slot); return; }
    if (moving === slot) { setMoving(null); return; }
    if (c.swap(moving, slot)) feel('pickChime');
    else { setLineupBad(true); feel('buzzer'); }
    setMoving(null);
  };
  return (
    <Screen key="step-3">
      <Header title={t('career.freeAgency')} left={<BackButton onPress={() => router.navigate('/career')} />} />
      <Text style={styles.big}>{t('career.openSpots', { count: open })}</Text>
      <Button label={t('trade.title')} icon={<Icon name="swap" size={22} />} variant="secondary" onPress={() => router.push('/trade')} testID="to-trade" />
      {chosen || open > 0 ? (
        <RosterBoard roster={user.slots} highlight={chosen?.slots} onSlot={chosen ? (s) => chosen.slots.includes(s) && sign(chosen.player, s) : undefined} />
      ) : (
        // Roster full: the board becomes the lineup editor.
        <>
          <Label>{t('career.lineup')}</Label>
          <Text style={[styles.muted, lineupBad && { color: C.danger }]} testID="lineup-hint">{lineupBad ? t('career.lineupBad') : t('career.lineupHint')}</Text>
          <RosterBoard roster={user.slots} highlight={moving ? [moving] : undefined} onSlot={tapLineup} />
        </>
      )}
      {open > 0 && (
        <View style={{ gap: S.sm }}>
          {options.map((o) => (
            <PlayerCard
              key={o.player.id}
              player={o.player}
              testID="fa-option"
              selected={chosen?.player.id === o.player.id}
              onPress={() => (o.slots.length === 1 ? sign(o.player, o.slots[0]) : setChosen(o))}
            />
          ))}
          {options.length === 0 && <Text style={styles.muted}>{t('career.nothingAffordable')}</Text>}
          {minEx && (
            <Button label={t('career.minException', { name: minEx.player.name })} variant="ghost" onPress={() => sign(minEx.player, minEx.slot)} testID="fa-min" />
          )}
        </View>
      )}
      {open === 0 && <DivisionPicker seed={`${c.seed}:s${st.season}`} />}
      {open === 0 && (
        <Button
          label={t('career.startSeason', { label: seasonLabel(st.season) })}
          variant="gold"
          onPress={() => { c.startNextSeason(); feel('crowd'); router.replace('/season'); }}
          testID="off-start"
        />
      )}
    </Screen>
  );
}


/** Waits for the full history when this run needs it (an era, All-Time, a franchise, Crisis, Career). */
export default function Offseason() {
  const needs = useGame((s) => runNeedsHistory(s));
  return <HistoryGate when={needs}><OffseasonScreen /></HistoryGate>;
}

const styles = StyleSheet.create({
  big: { color: C.text, fontSize: 24, ...F.display },
  muted: { color: C.muted, fontSize: 13 },
  change: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  changeName: { color: C.text, flex: 1, fontWeight: '700' },
  delta: { fontWeight: '900', width: 96, textAlign: 'right' },
  retired: { color: C.gold, fontWeight: '700' },
  retiredLeague: { color: C.muted, fontWeight: '700', fontSize: 13 },
});
