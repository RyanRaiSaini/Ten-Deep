import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { feel } from '../audio/feel';
import { affordableFor, minimumException, openSlotCount, RESIGN_THRESHOLD, seasonLabel } from '../engine/career/offseason';
import { ALL_SLOTS, type Player, type SlotId } from '../engine/types';
import { useCareer } from '../store/career';
import { BackButton, Button, Card, Header, Label, Screen } from '../ui/components';
import { PlayerCard } from '../ui/PlayerCard';
import { RosterBoard } from '../ui/RosterBoard';
import { C, F, S } from '../ui/theme';
import { LotteryReveal } from '../ui/Lottery';

/** The offseason, one step at a time: development and contracts → rookie draft → free agency → next season. */
export default function Offseason() {
  const { t } = useTranslation();
  const c = useCareer();
  const st = c.offseason;
  const [keep, setKeep] = useState<string[] | null>(null);
  const [rookie, setRookie] = useState<string | null>(null);
  const [cut, setCut] = useState<SlotId | null>(null);
  const [chosen, setChosen] = useState<{ player: Player; slots: SlotId[] } | null>(null);

  if (!st || !c.step) return <Redirect href="/career" />;
  const user = st.teams[0];
  const mineIds = new Set(st.changes.map((x) => x.id));
  const retiredMine = st.retired.filter((p) => mineIds.has(p.id));

  // --- Step 1: development + contracts ------------------------------------------------------------
  if (c.step === 'expiring') {
    const expiring = st.expiring.map((id) => ALL_SLOTS.map((k) => user.slots[k]).find((p) => p?.id === id)!).filter(Boolean);
    const kept = keep ?? expiring.filter((p) => p.ovr >= RESIGN_THRESHOLD).map((p) => p.id);
    return (
      <Screen>
        <Header title={`${t('career.title')} · ${seasonLabel(st.season)}`} left={<BackButton onPress={() => router.replace('/career')} />} />
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
          <Text style={styles.retired}>👋 {t('career.retired')}: {retiredMine.map((p) => p.name).join(', ')}</Text>
        )}
        {expiring.length > 0 && (
          <>
            <Label>{t('career.expiring')}</Label>
            <Text style={styles.muted}>{t('career.expiringHint')}</Text>
            {expiring.map((p) => (
              <PlayerCard
                key={p.id}
                player={{ ...p, salary: undefined }}
                testID="expiring"
                selected={kept.includes(p.id)}
                note={kept.includes(p.id) ? t('career.resign') : t('career.release')}
                onPress={() => setKeep(kept.includes(p.id) ? kept.filter((x) => x !== p.id) : [...kept, p.id])}
              />
            ))}
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
      <Screen>
        <Header title={t('career.draft')} left={<BackButton onPress={() => router.replace('/career')} />} />
        <LotteryReveal order={st.order} names={(i) => (i === 0 ? t('league.you') : st.teams[i].name)} />
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
  return (
    <Screen>
      <Header title={t('career.freeAgency')} left={<BackButton onPress={() => router.replace('/career')} />} />
      <Text style={styles.big}>{t('career.openSpots', { n: open })}</Text>
      <Button label={`🔁  ${t('trade.title')}`} variant="secondary" onPress={() => router.push('/trade')} testID="to-trade" />
      <RosterBoard
        roster={user.slots}
        highlight={chosen?.slots}
        onSlot={chosen ? (s) => chosen.slots.includes(s) && sign(chosen.player, s) : undefined}
      />
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
      {open === 0 && (
        <Button
          label={t('career.startSeason', { label: seasonLabel(st.season) })}
          variant="gold"
          onPress={() => { c.startNextSeason(); feel('crowd'); router.replace('/crisis'); }}
          testID="off-start"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { color: C.text, fontSize: 24, ...F.display },
  muted: { color: C.muted, fontSize: 13 },
  change: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  changeName: { color: C.text, flex: 1, fontWeight: '700' },
  delta: { fontWeight: '900', width: 96, textAlign: 'right' },
  retired: { color: C.gold, fontWeight: '700' },
});
