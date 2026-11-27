/**
 * Rebuild mode (Management Crisis B): pick a team to take over (or spin for one), then the takeover, the coach, ten
 * positions with board cards between them, and tip-off.
 */
import { HistoryGate } from '../ui/HistoryGate';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { feel } from '../audio/feel';
import { MODES, current2026, type Mode } from '../data';
import { moneyScaleFor } from '../data/modes';
import { payOf } from '../engine/cap';
import { blocked, budgetFor, marketOptions } from '../engine/board/market';
import { COACHES, COACH_FEE, FIRST_SLOT_STEP, STOP_AFTER, TIPOFF_STEP, slotOfStep } from '../engine/board/rebuild';
import { realRotation } from '../engine/realLeague';
import { squadRating } from '../engine/rotation';
import { roomAfterFees } from '../engine/season';
import { ALL_SLOTS, type Roster, type RosterSlots, type SlotId, type TeamSeason } from '../engine/types';
import { boardCtx } from '../store/boardCtx';
import { useGame } from '../store/game';
import { BackButton, Button, Card, Display, Header, Label, Screen } from '../ui/components';
import { CourtArt, Icon, type IconName } from '../ui/icons';
import { MoneyScale } from '../ui/MoneyScale';
import { PlayerCard } from '../ui/PlayerCard';
import { RosterBoard } from '../ui/RosterBoard';
import { SquadBadge } from '../ui/SquadBadge';
import { Text } from '../ui/Text';
import { BoardStop } from '../ui/board/BoardStop';
import { ConfidenceMeter } from '../ui/board/BoardPanel';
import { cardTitle } from '../ui/board/text';
import { C, FONT, R, S, money } from '../ui/theme';
import { goBack } from '../ui/nav';

const TIER_COLOR = { low: C.teal, mid: C.blue, top: C.gold, bench: C.muted, perk: C.purple } as const;
const COACH_ICON: Record<string, IconName> = { keep: 'handshake', offense: 'flame', defense: 'shield', development: 'sparkle' };

/** A team's real rotation, Squad Rating and payroll, as you'd take it over. */
function teamSummary(t: TeamSeason) {
  const slots = realRotation(t.players, 'p') as Required<RosterSlots>;
  const roster: Roster = { id: 'p', name: t.name, colors: t.colors, slots };
  return { sr: Math.round(squadRating(roster)), pay: ALL_SLOTS.reduce((n, k) => n + (slots[k] ? payOf(slots[k]) : 0), 0) };
}

/** Every team-season you could spin from history: the era modes, each team once. */
function historyTeams(): { mode: Mode; team: TeamSeason }[] {
  const seen = new Set<string>();
  return MODES.filter((m) => m.kind === 'era' && !m.hidden && m.id !== 'all-time').flatMap((m) =>
    m.pool.teams.filter((t) => !seen.has(t.id) && (seen.add(t.id), true)).map((team) => ({ mode: m, team })));
}

function TeamTile({ t, onPress }: { t: TeamSeason; onPress: () => void }) {
  const [w, setW] = useState(170);
  const sum = useMemo(() => teamSummary(t), [t]);
  return (
    <Pressable onPress={onPress} testID={`rebuild-team-${t.id}`} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`${t.city} ${t.name}`}>
      <View style={StyleSheet.absoluteFill}><CourtArt width={w} height={112} color={t.colors[0]} color2={t.colors[1]} /></View>
      <LinearGradient colors={[`${t.colors[0]}E6`, `${t.colors[0]}99`, 'rgba(8,10,30,0.6)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.stripe, { backgroundColor: t.colors[1] }]} />
      <View style={styles.tileBody}>
        <Text style={styles.tileCity} numberOfLines={1}>{t.city}</Text>
        <Text style={styles.tileName} numberOfLines={1} adjustsFontSizeToFit>{t.name}</Text>
        <Text style={styles.tileMeta}>SR {sum.sr} · {money(sum.pay)}</Text>
      </View>
    </Pressable>
  );
}

/** Choose (or spin for) the team you'll take over. */
function Picker() {
  const { t } = useTranslation();
  const newRebuild = useGame((s) => s.newRebuild);
  const [rolling, setRolling] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const take = (poolId: string, id: string) => { feel('thunk'); newRebuild(poolId, id); };

  const spin = (history: boolean) => {
    if (rolling) return;
    const list = history ? historyTeams() : current2026.teams.map((team) => ({ mode: MODES.find((m) => m.id === 'current-2026')!, team }));
    const pick = list[Math.floor(Math.random() * list.length)];
    let ticks = 0;
    timer.current = setInterval(() => {
      const x = list[Math.floor(Math.random() * list.length)].team;
      setRolling(`${x.season} ${x.city} ${x.name}`);
      feel('tick');
      if (++ticks >= 18) {
        clearInterval(timer.current!);
        setRolling(`${pick.team.season} ${pick.team.city} ${pick.team.name}`);
        setTimeout(() => { setRolling(null); take(pick.mode.id, pick.team.id); }, 500);
      }
    }, 70);
  };

  return (
    <Screen>
      <Header title={t('rebuild.title')} left={<BackButton onPress={() => goBack()} />} />
      <View style={styles.head}>
        <LinearGradient colors={['#0E1A2B', '#1B3A63', '#2F6BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.headIcon}><Icon name="briefcase" size={40} /></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.headTitle}>{t('rebuild.title')}</Text>
          <Text style={styles.headDesc}>{t('rebuild.desc')}</Text>
        </View>
      </View>
      {rolling && <Text style={styles.rolling} testID="rebuild-rolling">{rolling}</Text>}
      <Button label={t('rebuild.spin')} variant="gold" icon={<Icon name="reroll" size={22} />} onPress={() => spin(false)} disabled={!!rolling} testID="rebuild-spin" />
      <Button label={t('rebuild.spinHistory')} variant="blue" icon={<Icon name="history" size={22} />} onPress={() => spin(true)} disabled={!!rolling} testID="rebuild-spin-history" />
      <Label>{t('rebuild.or')}</Label>
      <View style={styles.grid}>
        {current2026.teams.map((x) => (
          <View key={x.id} style={styles.cell}><TeamTile t={x} onPress={() => take('current-2026', x.id)} /></View>
        ))}
      </View>
    </Screen>
  );
}

function Rebuilding() {
  const { t } = useTranslation();
  const g = useGame();
  const crisis = g.crisis!;
  const r = crisis.rebuild!;
  const board = crisis.board!;
  const season = g.season!;
  const scale = moneyScaleFor(g.poolId);
  const user = season.teams[0];
  const budget = roomAfterFees(season);
  const sr = Math.round(squadRating(user));
  const slot = slotOfStep(r.step) as SlotId | null;
  const pool = boardCtx(g.poolId, season).pool;
  const selling = r.selling as SlotId | null;
  const options = selling ? marketOptions(season, board, selling, pool) : [];

  const bar = (
    <Card style={[styles.bar, { borderColor: r.colors[0] }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.barTeam} numberOfLines={1}>{r.season} {r.name}</Text>
        <Text style={styles.barBudget} testID="rebuild-budget">{t('rebuild.budgetLeft', { budget: money(budget, scale) })}</Text>
        <ConfidenceMeter value={board.confidence} />
      </View>
      <SquadBadge value={sr} size="sm" />
    </Card>
  );

  // A card stop between positions.
  if (board.hand) {
    const n = r.cards + 1;
    return (
      <MoneyScale.Provider value={scale}>
        <Screen>
          {bar}
          <BoardStop inline={{ label: t('rebuild.cardStop', { n, total: STOP_AFTER.length }), onResolved: (fired) => { if (fired) router.replace('/result'); } }} />
        </Screen>
      </MoneyScale.Provider>
    );
  }

  return (
    <MoneyScale.Provider value={scale}>
      <Screen tint={r.colors[0]}>
        <Header title={t('rebuild.title')} left={<BackButton onPress={() => router.replace('/')} />} />
        {r.step === 0 && (
          <>
            <View style={[styles.takeover, { borderColor: C.ink }]}>
              <LinearGradient colors={[r.colors[0], `${r.colors[0]}CC`, '#0B1020']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={[styles.stripe, { backgroundColor: r.colors[1] }]} />
              <Text style={styles.takeKicker}>{t('rebuild.seasonLabel', { season: r.season })}</Text>
              <Display size={30} align="left">{t('rebuild.takeover', { team: r.name })}</Display>
              <Text style={styles.takeLine}>{t('rebuild.payroll', { pay: money(r.payroll, scale) })}</Text>
              <Text style={styles.takeLine}>{t('rebuild.budget', { budget: money(budget, scale) })}</Text>
              <Text style={styles.takeSub}>{t('rebuild.budgetDesc')}</Text>
            </View>
            <RosterBoard roster={user.slots} color={r.colors[0]} />
            <Button label={t('rebuild.start')} variant="gold" onPress={() => { feel('thunk'); g.rebuildNext(); }} testID="rebuild-start" />
          </>
        )}

        {r.step === 1 && (
          <>
            {bar}
            <Text style={styles.stepTitle}>{t('rebuild.coachTitle')}</Text>
            <Text style={styles.lead}>{t('rebuild.coachDesc')}</Text>
            {COACHES.map((c) => {
              const fee = COACH_FEE[c];
              const can = fee <= budget + 1e-9;
              return (
                <Pressable key={c} disabled={!can} onPress={() => { feel('pickChime'); g.rebuildCoach(c); }} testID={`rebuild-coach-${c}`}
                  style={({ pressed }) => [styles.coach, !can && { opacity: 0.45 }, pressed && styles.pressed]}>
                  <Icon name={COACH_ICON[c]} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.coachName}>{t(`rebuild.coaches.${c}.name`)}</Text>
                    <Text style={styles.coachDesc}>{t(`rebuild.coaches.${c}.desc`)}</Text>
                  </View>
                  <Text style={styles.coachFee}>{fee ? money(fee, scale) : t('rebuild.free')}</Text>
                </Pressable>
              );
            })}
          </>
        )}

        {slot && !selling && (
          <>
            {bar}
            <Text style={styles.stepTitle} testID="rebuild-slot">
              {t('rebuild.slotOf', { slot, n: r.step - FIRST_SLOT_STEP + 1, total: ALL_SLOTS.length })}
            </Text>
            <PlayerCard player={user.slots[slot]} note={slot} selected />
            <View style={styles.row}>
              <Button label={t('rebuild.keep')} variant="secondary" onPress={() => { feel('tick'); g.rebuildKeep(); }} style={{ flex: 1 }} testID="rebuild-keep" />
              <Button label={t('rebuild.sell', { pay: money(payOf(user.slots[slot]), scale) })} variant="primary" onPress={() => { feel('flip'); g.rebuildSell(); }} style={{ flex: 1 }} testID="rebuild-sell" />
            </View>
            <RosterBoard roster={user.slots} highlight={[slot]} color={r.colors[0]} />
          </>
        )}

        {selling && (
          <>
            {bar}
            <Text style={styles.stepTitle}>{t('rebuild.sellTitle', { name: user.slots[selling].name })}</Text>
            <Text style={styles.lead} testID="office-budget">
              {t('board.officeBudget', { budget: money(budgetFor(season, selling), scale), pay: money(payOf(user.slots[selling]), scale) })}
            </Text>
            {options.map((o) => {
              const why = blocked(season, board, selling, o);
              return (
                <View key={`${o.tier}-${o.player.id}`} style={[styles.option, { borderColor: TIER_COLOR[o.tier] }]}>
                  <View style={styles.optionHead}>
                    <Text style={[styles.tier, { backgroundColor: TIER_COLOR[o.tier] }]}>{t(`board.tiers.${o.tier}`)}</Text>
                    {why && <Text style={styles.why}>{why === 'budget' ? t('board.overBudget') : t('board.crunch')}</Text>}
                  </View>
                  <PlayerCard player={o.player} />
                  <Button label={t('board.officeSign', { pay: money(o.pay, scale) })} disabled={!!why} variant={o.tier === 'top' ? 'gold' : 'primary'}
                    onPress={() => { feel('pickChime'); g.rebuildSign(o); }} testID={`rebuild-sign-${o.tier}`} />
                </View>
              );
            })}
            <Button label={t('board.officeRespin', { n: board.respins })} variant="blue" disabled={board.respins <= 0}
              icon={<Icon name="reroll" size={22} />} onPress={() => { if (g.boardRespin()) feel('flip'); }} testID="rebuild-respin" />
            <Button label={t('board.officeBack')} variant="ghost" onPress={() => g.rebuildCancelSell()} testID="rebuild-cancel" />
          </>
        )}

        {r.step >= TIPOFF_STEP && (
          <>
            {bar}
            <Text style={styles.stepTitle}>{t('rebuild.tipoffTitle')}</Text>
            <Text style={styles.lead} testID="rebuild-sr">{t('rebuild.srChange', { from: r.sr0, to: sr })}</Text>
            {r.coach && <Text style={styles.lead}>{t('rebuild.coachPicked', { name: t(`rebuild.coaches.${r.coach}.name`) })}</Text>}
            {board.demands.some((d) => d.status === 'active') && (
              <Card style={{ gap: 4 }}>
                <Label>{t('rebuild.openDemands')}</Label>
                {board.demands.filter((d) => d.status === 'active').map((d) => (
                  <Text key={`${d.id}-${d.sig}`} style={styles.demand}>· {cardTitle(t, d.id)}</Text>
                ))}
              </Card>
            )}
            <RosterBoard roster={user.slots} color={r.colors[0]} />
            <Button label={t('rebuild.tipoff')} variant="gold" icon={<Icon name="play" size={22} />}
              onPress={() => { feel('fanfare'); g.tipOff(); router.replace(useGame.getState().phase === 'result' ? '/result' : '/season'); }} testID="rebuild-tipoff" />
          </>
        )}
      </Screen>
    </MoneyScale.Provider>
  );
}

function RebuildScreen() {
  const live = useGame((s) => s.phase === 'rebuild' && !!s.crisis?.rebuild && !!s.season);
  return live ? <Rebuilding /> : <Picker />;
}

/** Era teams and every league draw on the full history: wait for it. */
export default function Rebuild() {
  return <HistoryGate><RebuildScreen /></HistoryGate>;
}

const shadow = { textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } };

const styles = StyleSheet.create({
  pressed: { transform: [{ translateY: 3 }] },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, borderRadius: 24, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7 },
  headIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  headTitle: { color: '#FFFFFF', fontFamily: FONT.display, fontSize: 28 },
  headDesc: { color: '#DCE6FF', fontWeight: '700', fontSize: 13, lineHeight: 18 },
  rolling: { textAlign: 'center', fontFamily: FONT.display, fontSize: 24, color: C.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -S.xs },
  cell: { width: '50%', padding: S.xs },
  tile: { height: 112, borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, justifyContent: 'flex-end' },
  stripe: { position: 'absolute', left: 0, right: 0, top: 0, height: 8 },
  tileBody: { padding: S.md, gap: 0 },
  tileCity: { color: 'rgba(255,255,255,0.9)', fontWeight: '900', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', ...shadow },
  tileName: { color: '#FFFFFF', fontFamily: FONT.display, fontSize: 24, ...shadow },
  tileMeta: { color: 'rgba(255,255,255,0.9)', fontWeight: '800', fontSize: 11, ...shadow },
  bar: { flexDirection: 'row', alignItems: 'center', gap: S.md, borderWidth: 3 },
  barTeam: { fontWeight: '900', color: C.ink, fontSize: 15 },
  barBudget: { fontWeight: '800', color: C.neon, fontSize: 14 },
  takeover: { padding: S.xl, gap: 6, borderRadius: 24, overflow: 'hidden', borderWidth: 3, borderBottomWidth: 7 },
  takeKicker: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 2, fontSize: 12, textTransform: 'uppercase', ...shadow },
  takeLine: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, ...shadow },
  takeSub: { color: 'rgba(255,255,255,0.88)', fontWeight: '700', fontSize: 13, ...shadow },
  stepTitle: { fontFamily: FONT.display, fontSize: 26, color: C.ink, textAlign: 'center' },
  lead: { color: C.muted, fontWeight: '800', textAlign: 'center' },
  coach: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 6 },
  coachName: { fontWeight: '900', color: C.ink, fontSize: 16 },
  coachDesc: { color: C.text, fontSize: 13 },
  coachFee: { fontWeight: '900', color: C.hardwood, fontSize: 15 },
  row: { flexDirection: 'row', gap: S.sm },
  option: { gap: S.sm, padding: S.sm, borderRadius: R.md, borderWidth: 2, backgroundColor: C.surface },
  optionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tier: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 10, paddingVertical: 3, borderRadius: R.pill, overflow: 'hidden' },
  why: { color: C.danger, fontWeight: '800', fontSize: 12 },
  demand: { color: C.text, fontWeight: '700' },
});
