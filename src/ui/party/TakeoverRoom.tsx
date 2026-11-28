/**
 * A Party Takeover room in play: for each position, keep your player or lock in one of the same four options as
 * everyone else; the 3-2-1 reveal; then any bidding wars, blind. Runs off engine/partyTakeover.ts resolveTakeover.
 */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { feel } from '../../audio/feel';
import { moneyScaleFor } from '../../data/modes';
import { payOf } from '../../engine/cap';
import { PARTY_COLORS, type PartyMember, type PartyMeta } from '../../engine/party';
import { CHOOSE_MS, BID_MS, maxSpend, tkTeam, type TkChoice, type TkState } from '../../engine/partyTakeover';
import { ALL_SLOTS, type Pool } from '../../engine/types';
import { submitBid, submitMove } from '../../net/party';
import { Avatar } from '../Avatar';
import { BackButton, Button, Card, Display, Header, Label, Screen } from '../components';
import { Icon } from '../icons';
import { goBack } from '../nav';
import { PlayerCard } from '../PlayerCard';
import { RosterBoard } from '../RosterBoard';
import { Text } from '../Text';
import { C, FONT, R, S, money } from '../theme';

const TIER_COLOR = { low: C.teal, mid: C.blue, top: C.gold, bench: C.muted } as const;

export function TakeoverRoom({ meta, members, mySeat, pool, state, now, code, refresh }: {
  meta: PartyMeta; members: PartyMember[]; mySeat: number; pool: Pool; state: TkState; now: number; code: string; refresh: () => void;
}) {
  const { t } = useTranslation();
  const scale = moneyScaleFor('current-2026');
  const team = tkTeam(meta, pool);
  const slot = ALL_SLOTS[state.r];
  const playing = mySeat >= 0;
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const left = Math.max(0, Math.ceil((state.deadline - now) / 1000));
  const span = state.phase === 'bid' ? BID_MS : CHOOSE_MS;
  const frac = Math.max(0, Math.min(1, (state.deadline - now) / span));
  const limit = playing ? maxSpend(state, mySeat, state.r) : 0;
  const myChoice = playing ? state.choices[mySeat] : null;
  const contestedTier = playing && state.bidders.includes(mySeat) ? myChoice : null;
  const contested = contestedTier ? state.options.find((o) => o.tier === contestedTier) : undefined;
  const [bid, setBid] = useState(0);
  // A new bidding war starts your bid at his price.
  const [bidKey, setBidKey] = useState('');
  const key = `${state.r}:${state.phase}`;
  if (bidKey !== key) { setBidKey(key); setBid(contested?.pay ?? 0); setNote(null); }
  useEffect(() => { if (left > 0 && left <= 5 && state.phase !== 'reveal') feel('tick'); }, [left, state.phase]);
  useEffect(() => { if (state.phase === 'reveal') feel('flip'); }, [state.phase]);

  const move = async (c: TkChoice) => {
    if (sending) return;
    setSending(true);
    const r = await submitMove(code, state.r, c);
    setSending(false);
    if (r.ok) { feel('pickChime'); refresh(); } else { setNote(t('partyTk.err')); feel('buzzer'); refresh(); }
  };
  const placeBid = async () => {
    if (sending) return;
    setSending(true);
    const r = await submitBid(code, state.r, bid);
    setSending(false);
    if (r.ok) { feel('pickChime'); refresh(); } else { setNote(t('partyTk.err')); feel('buzzer'); refresh(); }
  };

  const nameOf = (c: TkChoice | null) => {
    if (!c || c === 'keep') return t('partyTk.kept');
    return state.options.find((o) => o.tier === c)?.player.name ?? t('partyTk.kept');
  };
  // 3-2-1 during the reveal, then everyone's choice.
  const count = state.phase === 'reveal' ? Math.max(1, 3 - Math.floor((now - state.phaseStart) / 1000)) : 0;
  const showChoices = state.phase === 'bid' || (state.phase === 'reveal' && now - state.phaseStart >= 3000);
  const last = state.history[state.history.length - 1];

  return (
    <Screen tint={team?.colors[0]}>
      <Header title={t('partyTk.position', { n: state.r + 1, total: ALL_SLOTS.length, slot })} left={<BackButton onPress={goBack} />}
        right={state.phase !== 'reveal' ? <View style={[styles.clock, left <= 5 && { backgroundColor: C.danger }]}><Text style={styles.clockText} testID="tk-clock">{left}</Text></View> : undefined} />
      {state.phase !== 'reveal' && <View style={styles.bar}><View style={[styles.barFill, { width: `${frac * 100}%`, backgroundColor: left <= 5 ? C.danger : '#18C08A' }]} /></View>}

      {team && (
        <LinearGradient colors={[team.colors[0], '#0B1020']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.team}>
          <Text style={styles.teamKicker}>{t('partyTk.rebuilding')}</Text>
          <Display size={26} align="left">{`${team.city} ${team.name}`}</Display>
          {playing && <Text style={styles.budget} testID="tk-budget">{t('partyTk.budget', { budget: money(state.budgets[mySeat], scale), max: money(limit, scale) })}</Text>}
        </LinearGradient>
      )}

      <View style={styles.seatRow}>
        {members.map((m, i) => {
          const done = state.phase === 'choose' ? state.chosen[i] : state.phase === 'bid' ? !state.bidders.includes(i) || state.bidIn[i] : true;
          return (
            <View key={m.pin} style={[styles.seat, { borderColor: PARTY_COLORS[i % PARTY_COLORS.length][0] }]}>
              <Avatar id={m.avatar} size={34} />
              {done && <View style={styles.check}><Icon name="check" size={14} /></View>}
            </View>
          );
        })}
      </View>
      {note && <Text style={styles.error}>{note}</Text>}

      {state.phase === 'choose' && playing && (state.chosen[mySeat] ? (
        <Card style={{ alignItems: 'center', gap: 6 }}>
          <Icon name="check" size={40} />
          <Text style={styles.locked}>{t('partyTk.locked', { n: state.chosen.filter((x) => !x).length })}</Text>
        </Card>
      ) : (
        <View style={{ gap: S.sm }}>
          <Label>{t('partyTk.yourPlayer', { slot })}</Label>
          <PlayerCard player={state.rosters[mySeat][slot]} note={slot} moneyScale={scale} />
          <Button label={t('partyTk.keep')} variant="secondary" disabled={sending} onPress={() => move('keep')} testID="tk-keep" />
          {state.options.map((o) => {
            const over = o.pay > limit + 1e-9;
            return (
              <View key={o.tier} style={[styles.option, { borderColor: TIER_COLOR[o.tier] }]}>
                <Text style={[styles.tier, { backgroundColor: TIER_COLOR[o.tier] }]}>{t(`board.tiers.${o.tier}`)}</Text>
                <PlayerCard player={o.player} moneyScale={scale} />
                <Button label={over ? t('board.overBudget') : t('partyTk.go', { pay: money(o.pay, scale) })} disabled={over || sending}
                  variant={o.tier === 'top' ? 'gold' : 'primary'} onPress={() => move(o.tier)} testID={`tk-pick-${o.tier}`} />
              </View>
            );
          })}
        </View>
      ))}

      {state.phase === 'reveal' && !showChoices && (
        <View style={styles.countWrap}><Text style={styles.count} testID="tk-count">{count}</Text></View>
      )}

      {showChoices && (
        <Card style={{ gap: 6 }} testID="tk-reveal">
          <Label>{t('partyTk.choices')}</Label>
          {members.map((m, i) => (
            <View key={m.pin} style={styles.choiceRow}>
              <Avatar id={m.avatar} size={30} />
              <Text style={styles.choiceName} numberOfLines={1}>{m.name}</Text>
              <Text style={[styles.choiceWhat, state.bidders.includes(i) && { color: C.danger }]} numberOfLines={1}>{nameOf(state.choices[i])}</Text>
            </View>
          ))}
        </Card>
      )}

      {state.phase === 'bid' && (contested ? (
        state.bidIn[mySeat] ? (
          <Card style={{ alignItems: 'center', gap: 6 }}><Icon name="coin" size={36} /><Text style={styles.locked}>{t('partyTk.bidIn')}</Text></Card>
        ) : (
          <Card style={{ gap: S.sm, borderColor: C.danger }} testID="tk-war">
            <Text style={styles.war}>{t('partyTk.war', { name: contested.player.name })}</Text>
            <Text style={styles.hint}>{t('partyTk.warHint', { min: money(contested.pay, scale), max: money(limit, scale) })}</Text>
            <Text style={styles.bid} testID="tk-bid-amount">{money(bid, scale)}</Text>
            <View style={styles.row}>
              {[-5, -1, 1, 5].map((d) => (
                <Pressable key={d} onPress={() => setBid((b) => Math.round(Math.max(contested.pay, Math.min(limit, b + d)) * 10) / 10)} style={styles.step}>
                  <Text style={styles.stepText}>{d > 0 ? `+${d}` : d}</Text>
                </Pressable>
              ))}
            </View>
            <Button label={t('partyTk.placeBid')} variant="gold" disabled={sending} onPress={placeBid} testID="tk-bid" />
          </Card>
        )
      ) : (
        <Text style={styles.center}>{t('partyTk.watchWar')}</Text>
      ))}

      {last && state.phase === 'choose' && (
        <Card style={{ gap: 4 }}>
          <Label>{t('partyTk.lastSpot', { slot: ALL_SLOTS[state.r - 1] })}</Label>
          {last.map((x) => (
            <Text key={x.seat} style={styles.hint} numberOfLines={1}>
              {members[x.seat]?.name}: {x.c === 'keep' ? t('partyTk.kept') : x.won ? t('partyTk.signed', { name: state.rosters[x.seat][ALL_SLOTS[state.r - 1]].name, pay: money(x.pay, scale) }) : t('partyTk.outbid', { bid: money(x.bid ?? 0, scale) })}
            </Text>
          ))}
        </Card>
      )}
      {playing && <RosterBoard roster={state.rosters[mySeat]} highlight={[slot]} color={PARTY_COLORS[mySeat % PARTY_COLORS.length][0]} />}
      {playing && <Text style={styles.hint}>{t('partyTk.payroll', { pay: money(ALL_SLOTS.reduce((n, k) => n + payOf(state.rosters[mySeat][k]), 0), scale) })}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  clock: { minWidth: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  clockText: { color: '#FFFFFF', fontFamily: FONT.display, fontSize: 20 },
  bar: { height: 8, borderRadius: R.pill, backgroundColor: C.line, overflow: 'hidden' },
  barFill: { height: '100%' },
  team: { padding: S.lg, borderRadius: R.lg, gap: 4, borderWidth: 3, borderColor: C.ink },
  teamKicker: { color: 'rgba(255,255,255,0.85)', fontWeight: '900', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  budget: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  seatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, justifyContent: 'center' },
  seat: { borderWidth: 3, borderRadius: 24, padding: 2 },
  check: { position: 'absolute', right: -6, bottom: -6, backgroundColor: '#18C08A', borderRadius: 10, padding: 2 },
  error: { color: C.danger, fontWeight: '800', textAlign: 'center' },
  locked: { color: C.text, fontWeight: '900', fontSize: 15, textAlign: 'center' },
  option: { gap: S.sm, padding: S.sm, borderRadius: R.md, borderWidth: 2, backgroundColor: C.surface },
  tier: { alignSelf: 'flex-start', color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 10, paddingVertical: 3, borderRadius: R.pill, overflow: 'hidden' },
  countWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: S.xl },
  count: { fontFamily: FONT.display, fontSize: 120, color: C.hardwood },
  choiceRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  choiceName: { fontWeight: '900', color: C.text, width: 90 },
  choiceWhat: { flex: 1, fontWeight: '800', color: C.text, textAlign: 'right' },
  war: { fontFamily: FONT.display, fontSize: 24, color: C.danger, textAlign: 'center' },
  hint: { color: C.muted, fontWeight: '700', fontSize: 13 },
  bid: { fontFamily: FONT.display, fontSize: 44, color: C.text, textAlign: 'center' },
  row: { flexDirection: 'row', gap: S.sm, justifyContent: 'center' },
  step: { minWidth: 56, paddingVertical: 10, borderRadius: R.pill, borderWidth: 2, borderColor: C.ink, alignItems: 'center', backgroundColor: C.surface },
  stepText: { fontWeight: '900', color: C.text, fontSize: 16 },
  center: { color: C.muted, fontWeight: '800', textAlign: 'center' },
});
