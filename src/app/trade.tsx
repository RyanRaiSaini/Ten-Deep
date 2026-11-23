import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { feel } from '../audio/feel';
import { evaluateTrade } from '../engine/career/trades';
import { ALL_SLOTS, type Player } from '../engine/types';
import { useCareer } from '../store/career';
import { BackButton, Button, Card, Header, Label, Screen } from '../ui/components';
import { C, R, S, money, ovrColor } from '../ui/theme';
import { payOf } from '../engine/cap';
import { goBack } from '../ui/nav';

/** Offseason trades: pick one of yours, a partner, and one of theirs. Their GM only says yes to a deal that helps them. */
export default function Trade() {
  const { t } = useTranslation();
  const st = useCareer((s) => s.offseason);
  const [give, setGive] = useState<string | null>(null);
  const [team, setTeam] = useState<number | null>(null);
  const [want, setWant] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!st) return <Screen><Header title={t('trade.title')} left={<BackButton onPress={() => goBack()} />} /></Screen>;

  const roster = (ti: number) => ALL_SLOTS.map((k) => st.teams[ti].slots[k]).filter((p): p is Player => !!p);
  const verdict = give && team !== null && want ? evaluateTrade(st, give, team, want) : null;

  const chip = (p: Player, on: boolean, press: () => void, hint?: boolean, testID?: string) => (
    <Pressable key={p.id} onPress={press} style={[styles.chip, on && styles.chipOn, hint && !on && styles.chipHint]} testID={testID} accessibilityRole="button" accessibilityState={{ selected: on }}>
      <Text style={[styles.ovr, { color: ovrColor(p.ovr) }]}>{p.ovr}</Text>
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
        <Text style={styles.meta}>{p.pos} · {p.age ?? '–'} · {money(payOf(p))}</Text>
      </View>
      {hint && <Text style={styles.yes}>✓</Text>}
    </Pressable>
  );

  const propose = () => {
    if (!give || team === null || !want) return;
    if (useCareer.getState().trade(give, team, want)) {
      feel('fanfare');
      setMsg({ ok: true, text: t('trade.accepted') });
      setGive(null); setWant(null);
    } else {
      feel('buzzer');
      setMsg({ ok: false, text: t(`trade.${verdict && !verdict.ok ? verdict.reason : 'value'}`) });
    }
  };

  return (
    <Screen>
      <Header title={t('trade.title')} left={<BackButton onPress={() => goBack()} />} />
      <Text style={styles.hint}>{t('trade.hint')}</Text>
      {msg && <Text style={[styles.msg, { color: msg.ok ? C.neon : C.danger }]} testID="trade-msg">{msg.text}</Text>}

      <Label>{t('trade.yours')}</Label>
      <View style={styles.wrap}>{roster(0).map((p) => chip(p, give === p.id, () => { setGive(p.id); setMsg(null); }, false, 'trade-give'))}</View>

      <Label>{t('trade.team')}</Label>
      <View style={styles.wrap}>
        {st.teams.slice(1).map((tm, i) => (
          <Pressable key={tm.id} onPress={() => { setTeam(i + 1); setWant(null); setMsg(null); }} style={[styles.teamChip, team === i + 1 && styles.chipOn]} testID="trade-team">
            <View style={[styles.dot, { backgroundColor: tm.colors[0] }]} />
            <Text style={styles.teamName} numberOfLines={1}>{tm.name}</Text>
          </Pressable>
        ))}
      </View>

      {team !== null && (
        <>
          <Label>{t('trade.theirs', { team: st.teams[team].name })}</Label>
          <View style={styles.wrap}>
            {roster(team).map((p) => chip(p, want === p.id, () => { setWant(p.id); setMsg(null); }, !!give && evaluateTrade(st, give, team, p.id).ok, 'trade-want'))}
          </View>
        </>
      )}

      <Card style={{ gap: S.sm }}>
        <Button label={t('trade.propose')} variant="gold" disabled={!verdict} onPress={propose} testID="trade-propose" />
        <Button label={t('common.back')} variant="ghost" onPress={() => goBack()} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: C.muted, fontSize: 13 },
  msg: { fontWeight: '900', textAlign: 'center', fontSize: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  chip: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, padding: S.sm },
  chipOn: { borderColor: C.hardwood, backgroundColor: C.surface2 },
  chipHint: { borderColor: C.neon },
  ovr: { fontSize: 18, fontWeight: '900', width: 28 },
  name: { color: C.text, fontWeight: '800', fontSize: 13 },
  meta: { color: C.muted, fontSize: 11 },
  yes: { color: C.neon, fontWeight: '900', marginLeft: 'auto' },
  teamChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.line, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '48%' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  teamName: { color: C.text, fontSize: 12, fontWeight: '700', flexShrink: 1 },
});
