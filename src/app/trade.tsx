import { HistoryGate } from '../ui/HistoryGate';
import { runNeedsHistory } from '../data/historyReady';
import { useGame } from '../store/game';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { feel } from '../audio/feel';
import { AI_EDGE, MAX_PER_SIDE, counterOffer, evaluatePackage, incomingOffers, type TradePackage } from '../engine/career/trades';
import { ALL_SLOTS, type Player } from '../engine/types';
import { useCareer } from '../store/career';
import { BackButton, Button, Card, Header, Label, Screen } from '../ui/components';
import { C, FONT, R, S, money, ovrColor } from '../ui/theme';
import { capRoom, payOf } from '../engine/cap';
import { goBack } from '../ui/nav';

const sum = (ps: Player[]) => Math.round(ps.reduce((n, p) => n + payOf(p), 0) * 10) / 10;

/**
 * Offseason trades, NBA style: build a deal with up to three players each way, watch their GM's interest, ask what
 * it would take, and answer the offers other teams call in with.
 */
function TradeScreen() {
  const { t } = useTranslation();
  const st = useCareer((s) => s.offseason);
  const [team, setTeam] = useState<number | null>(null);
  const [give, setGive] = useState<string[]>([]);
  const [get, setGet] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const offers = useMemo(() => (st ? incomingOffers(st, 3, st.declined ?? []) : []), [st]);
  if (!st) return <Screen><Header title={t('trade.title')} left={<BackButton onPress={() => goBack()} />} /></Screen>;

  const roster = (ti: number) => ALL_SLOTS.map((k) => st.teams[ti].slots[k]).filter((p): p is Player => !!p);
  const find = (ti: number, id: string) => roster(ti).find((p) => p.id === id);
  const pkg: TradePackage | null = team !== null ? { team, give, get } : null;
  const verdict = pkg && give.length && get.length ? evaluatePackage(st, pkg) : null;
  const giving = give.map((id) => find(0, id)).filter((p): p is Player => !!p);
  const getting = team !== null ? get.map((id) => find(team, id)).filter((p): p is Player => !!p) : [];
  const roomAfter = capRoom(st.teams[0].slots) + sum(giving) - sum(getting);

  // Their GM's interest: red (not interested) → amber (close) → green (deal).
  const gain = verdict?.gain ?? 0;
  const interest = verdict ? Math.max(0.04, Math.min(1, (gain + 10) / (10 + AI_EDGE))) : 0;
  const meter = !verdict ? null
    : verdict.ok ? { color: C.neon, text: t('trade.meterYes') }
    : verdict.reason !== 'value' ? { color: C.danger, text: t(`trade.${verdict.reason}`) }
    : gain >= AI_EDGE - 4 ? { color: C.gold, text: t('trade.meterClose') }
    : { color: C.danger, text: t('trade.meterFar') };

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => {
    setMsg(null);
    if (list.includes(id)) set(list.filter((x) => x !== id));
    else if (list.length < MAX_PER_SIDE) set([...list, id]);
    else setMsg({ ok: false, text: t('trade.max', { n: MAX_PER_SIDE }) });
  };
  const pickTeam = (ti: number) => { setTeam(ti); setGet([]); setMsg(null); };

  const propose = (deal: TradePackage | null = pkg) => {
    if (!deal) return;
    const v = evaluatePackage(st, deal);
    if (useCareer.getState().trade(deal)) {
      feel('fanfare');
      setMsg({ ok: true, text: t('trade.accepted') });
      setGive([]); setGet([]);
    } else {
      feel('buzzer');
      setMsg({ ok: false, text: t(`trade.${v.ok ? 'value' : v.reason}`) });
    }
  };
  const ask = () => {
    if (!pkg) return;
    const c = counterOffer(st, pkg);
    if (c) { setGive(c.give); setGet(c.get); setMsg({ ok: true, text: t('trade.counter') }); feel('flip'); }
    else { setMsg({ ok: false, text: t('trade.noCounter') }); feel('buzzer'); }
  };

  const chip = (p: Player, on: boolean, press: () => void, testID: string) => (
    <Pressable key={p.id} onPress={press} style={[styles.chip, on && styles.chipOn]} testID={testID} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Text style={[styles.ovr, { color: ovrColor(p.ovr) }]}>{p.ovr}</Text>
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
        <Text style={styles.meta}>{p.pos} · {p.age ?? '–'} · {money(payOf(p))}</Text>
      </View>
    </Pressable>
  );
  const names = (ti: number, ids: string[]) => ids.map((id) => find(ti, id)?.name).filter(Boolean).join(', ');

  return (
    <Screen>
      <Header title={t('trade.title')} left={<BackButton onPress={() => goBack()} />} />
      <Text style={styles.hint}>{t('trade.hint')}</Text>

      {/* Calls from other GMs */}
      <Label>{t('trade.offers')}</Label>
      {offers.length === 0 && <Text style={styles.hint}>{t('trade.offersNone')}</Text>}
      {offers.map((o) => (
        <Card key={o.key} style={styles.offer} testID="trade-offer">
          <View style={styles.offerHead}>
            <View style={[styles.dot, { backgroundColor: st.teams[o.team].colors[0] }]} />
            <Text style={styles.offerTeam} numberOfLines={1}>{st.teams[o.team].name}</Text>
          </View>
          <Text style={styles.offerLine}>{t('trade.offerLine', { get: names(o.team, o.get), give: names(0, o.give) })}</Text>
          <View style={styles.row}>
            <Button label={t('trade.accept')} variant="green" style={{ flex: 1 }} onPress={() => propose(o)} testID="offer-accept" />
            <Button label={t('trade.decline')} variant="ghost" style={{ flex: 1 }} onPress={() => { useCareer.getState().declineOffer(o.key); feel('tick'); }} testID="offer-decline" />
          </View>
        </Card>
      ))}

      {/* Your own deal */}
      <Label>{t('trade.team')}</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingVertical: 2 }}>
        {st.teams.slice(1).map((tm, i) => (
          <Pressable key={tm.id} onPress={() => pickTeam(i + 1)} style={[styles.teamChip, team === i + 1 && styles.chipOn]} testID="trade-team" accessibilityRole="button">
            <View style={[styles.dot, { backgroundColor: tm.colors[0] }]} />
            <Text style={styles.teamName} numberOfLines={1}>{tm.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Card style={{ gap: S.sm }} testID="trade-deal">
        <View style={styles.sides}>
          <View style={styles.side}>
            <Text style={styles.sideTitle}>{t('trade.give')}</Text>
            {giving.length === 0 && <Text style={styles.empty}>—</Text>}
            {giving.map((p) => <Text key={p.id} style={styles.sideName} numberOfLines={1} onPress={() => toggle(give, setGive, p.id)}>{p.ovr} {p.name}</Text>)}
            <Text style={styles.sideMoney}>{money(sum(giving))}</Text>
          </View>
          <View style={styles.sideDivider} />
          <View style={styles.side}>
            <Text style={styles.sideTitle}>{t('trade.get')}</Text>
            {getting.length === 0 && <Text style={styles.empty}>—</Text>}
            {getting.map((p) => <Text key={p.id} style={styles.sideName} numberOfLines={1} onPress={() => toggle(get, setGet, p.id)}>{p.ovr} {p.name}</Text>)}
            <Text style={styles.sideMoney}>{money(sum(getting))}</Text>
          </View>
        </View>
        {meter && (
          <View testID="trade-meter">
            <View style={styles.bar}><View style={[styles.fill, { width: `${interest * 100}%`, backgroundColor: meter.color }]} /></View>
            <Text style={[styles.meterText, { color: meter.color }]}>{meter.text}</Text>
          </View>
        )}
        <Text style={[styles.hint, roomAfter < 0 && { color: C.gold }]}>{t('trade.roomAfter', { room: money(roomAfter) })}</Text>
        {msg && <Text style={[styles.msg, { color: msg.ok ? C.neon : C.danger }]} testID="trade-msg">{msg.text}</Text>}
        <Button label={t('trade.propose')} variant="gold" disabled={!verdict} onPress={() => propose()} testID="trade-propose" />
        <View style={styles.row}>
          <Button label={t('trade.ask')} variant="secondary" style={{ flex: 1 }} disabled={!verdict || verdict.ok} onPress={ask} testID="trade-ask" />
          <Button label={t('trade.clear')} variant="ghost" style={{ flex: 1 }} onPress={() => { setGive([]); setGet([]); setMsg(null); }} />
        </View>
      </Card>

      <Label>{t('trade.yours')}</Label>
      <View style={styles.wrap}>{roster(0).map((p) => chip(p, give.includes(p.id), () => toggle(give, setGive, p.id), 'trade-give'))}</View>

      {team !== null && (
        <>
          <Label>{t('trade.theirs', { team: st.teams[team].name })}</Label>
          <View style={styles.wrap}>{roster(team).map((p) => chip(p, get.includes(p.id), () => toggle(get, setGet, p.id), 'trade-want'))}</View>
        </>
      )}
      <Button label={t('common.back')} variant="ghost" onPress={() => goBack()} />
    </Screen>
  );
}


/** Waits for the full history when this run needs it (an era, All-Time, a franchise, Crisis, Career). */
export default function Trade() {
  const needs = useGame((s) => runNeedsHistory(s));
  return <HistoryGate when={needs}><TradeScreen /></HistoryGate>;
}

const styles = StyleSheet.create({
  hint: { color: C.muted, fontSize: 13 },
  msg: { fontWeight: '900', textAlign: 'center', fontSize: 15 },
  row: { flexDirection: 'row', gap: S.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  chip: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, padding: S.sm },
  chipOn: { borderColor: C.accent, backgroundColor: C.surface2 },
  ovr: { fontSize: 18, fontWeight: '900', width: 28 },
  name: { color: C.text, fontWeight: '800', fontSize: 13 },
  meta: { color: C.muted, fontSize: 11 },
  teamChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.line, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  teamName: { color: C.text, fontSize: 13, fontWeight: '700' },
  offer: { gap: S.sm },
  offerHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  offerTeam: { color: C.text, fontFamily: FONT.condensed, fontSize: 18, flexShrink: 1, textTransform: 'uppercase' },
  offerLine: { color: C.text, fontSize: 14, lineHeight: 20 },
  sides: { flexDirection: 'row', gap: S.sm },
  side: { flex: 1, gap: 4 },
  sideDivider: { width: 1, backgroundColor: C.line },
  sideTitle: { color: C.muted, fontFamily: FONT.condensed, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  sideName: { color: C.text, fontWeight: '800', fontSize: 14 },
  sideMoney: { color: C.accent, fontWeight: '900', marginTop: 2 },
  empty: { color: C.muted },
  bar: { height: 10, borderRadius: R.pill, backgroundColor: C.surface2, overflow: 'hidden' },
  fill: { height: 10, borderRadius: R.pill },
  meterText: { fontWeight: '900', marginTop: 4 },
});
