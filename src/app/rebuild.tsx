/**
 * Rebuild mode (Management Crisis B): pick a team to take over (or spin for one), then the takeover, the coach, ten
 * positions with board cards between them, and tip-off.
 */
import { HistoryGate } from '../ui/HistoryGate';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { feel } from '../audio/feel';
import { MODES, current2026, type Mode } from '../data';
import { moneyScaleFor } from '../data/modes';
import { payOf } from '../engine/cap';
import { blocked, budgetFor, marketOptions } from '../engine/board/market';
import { BUILD_STOPS, COACHES, COACH_FEE, FIRST_SLOT_STEP, TIPOFF_STEP, slotOfStep } from '../engine/board/rebuild';
import { squadRating } from '../engine/rotation';
import { roomAfterFees } from '../engine/season';
import { ALL_SLOTS, type SlotId, type TeamSeason } from '../engine/types';
import { boardCtx } from '../store/boardCtx';
import { useGame } from '../store/game';
import { BackButton, Button, Card, Display, Header, Label, Screen } from '../ui/components';
import { Icon, type IconName } from '../ui/icons';
import { MoneyScale } from '../ui/MoneyScale';
import { PlayerCard } from '../ui/PlayerCard';
import { RosterBoard } from '../ui/RosterBoard';
import { SquadBadge } from '../ui/SquadBadge';
import { Text } from '../ui/Text';
import { BoardStop } from '../ui/board/BoardStop';
import { TeamTile } from '../ui/TeamTile';
import { ConfidenceMeter, ObjectiveBanner } from '../ui/board/BoardPanel';
import { C, FONT, R, S, money } from '../ui/theme';
import { goBack } from '../ui/nav';

const TIER_COLOR = { low: C.teal, mid: C.blue, top: C.gold, bench: C.muted, perk: C.purple } as const;
const COACH_ICON: Record<string, IconName> = { keep: 'handshake', offense: 'flame', defense: 'shield', development: 'sparkle' };

/** Every team-season you could spin from history: the era modes, each team once. */
function historyTeams(): { mode: Mode; team: TeamSeason }[] {
  const seen = new Set<string>();
  return MODES.filter((m) => m.kind === 'era' && !m.hidden && m.id !== 'all-time').flatMap((m) =>
    m.pool.teams.filter((t) => !seen.has(t.id) && (seen.add(t.id), true)).map((team) => ({ mode: m, team })));
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
          <View key={x.id} style={styles.cell}><TeamTile t={x} onPress={() => take('current-2026', x.id)} testID={`rebuild-team-${x.id}`} /></View>
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
  const ctx = boardCtx(g.poolId, season);
  const pool = ctx.pool;
  const selling = r.selling as SlotId | null;
  const options = selling ? marketOptions(season, board, selling, pool, ctx) : [];

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

  // Start over: back to the team picker (the board, the build and the team are all thrown away).
  const restart = (
    <Pressable onPress={() => { feel('thunk'); g.quit(); }} style={styles.restart} testID="rebuild-restart" accessibilityRole="button">
      <Icon name="reroll" size={18} />
      <Text style={styles.restartText}>{t('rebuild.restart')}</Text>
    </Pressable>
  );
  const header = <Header title={t('rebuild.title')} left={<BackButton onPress={() => router.replace('/')} />} right={restart} />;
  const objective = <ObjectiveBanner board={board} ctx={ctx} scale={scale} takeover />;

  // A card stop: the objective before the build, then an event after three starters and one after the bench.
  if (board.hand) {
    const n = r.cards;
    return (
      <MoneyScale.Provider value={scale}>
        <Screen>
          {header}
          {bar}
          {n > 0 && objective}
          <BoardStop inline={{
            label: t('rebuild.cardStop', { n: n + 1, total: BUILD_STOPS.length }), kind: BUILD_STOPS[n] ?? 'event',
            onResolved: (fired) => { if (fired) router.replace('/result'); },
          }} />
        </Screen>
      </MoneyScale.Provider>
    );
  }

  return (
    <MoneyScale.Provider value={scale}>
      <Screen tint={r.colors[0]}>
        {header}
        {r.step > 0 && bar}
        {r.step > 0 && objective}
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
            <Text style={styles.stepTitle}>{t('rebuild.sellTitle', { name: user.slots[selling].name })}</Text>
            <Text style={styles.lead} testID="office-budget">
              {t('board.officeBudget', { budget: money(budgetFor(season, selling), scale), pay: money(payOf(user.slots[selling]), scale) })}
            </Text>
            {options.map((o) => {
              const why = blocked(season, board, selling, o);
              return (
                <View key={`${o.tier}-${o.player.id}`} style={[styles.option, { borderColor: o.callup ? C.neon : TIER_COLOR[o.tier] }]} testID={o.callup ? 'rebuild-callup' : undefined}>
                  <View style={styles.optionHead}>
                    <Text style={[styles.tier, { backgroundColor: o.callup ? C.neon : TIER_COLOR[o.tier] }, o.callup && { color: C.onAccent }]}>
                      {o.callup ? t('board.callup') : t(`board.tiers.${o.tier}`)}
                    </Text>
                    {why && <Text style={styles.why}>{why === 'budget' ? t('board.overBudget') : t('board.crunch')}</Text>}
                  </View>
                  <PlayerCard player={o.player} />
                  <Button label={t('board.officeSign', { pay: money(o.pay, scale) })} disabled={!!why} variant={o.tier === 'top' ? 'gold' : 'primary'}
                    onPress={() => { feel('pickChime'); g.rebuildSign(o); }} testID={o.callup ? 'rebuild-sign-callup' : `rebuild-sign-${o.tier}`} />
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
            <Text style={styles.stepTitle}>{t('rebuild.tipoffTitle')}</Text>
            <Text style={styles.lead} testID="rebuild-sr">{t('rebuild.srChange', { from: r.sr0, to: sr })}</Text>
            {r.coach && <Text style={styles.lead}>{t('rebuild.coachPicked', { name: t(`rebuild.coaches.${r.coach}.name`) })}</Text>}
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
  rolling: { textAlign: 'center', fontFamily: FONT.display, fontSize: 24, color: C.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -S.xs },
  cell: { width: '50%', padding: S.xs },
  stripe: { position: 'absolute', left: 0, right: 0, top: 0, height: 8 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: S.md, borderWidth: 3 },
  barTeam: { fontWeight: '900', color: C.text, fontSize: 15 },
  barBudget: { fontWeight: '800', color: C.neon, fontSize: 14 },
  takeover: { padding: S.xl, gap: 6, borderRadius: 24, overflow: 'hidden', borderWidth: 3, borderBottomWidth: 7 },
  takeKicker: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 2, fontSize: 12, textTransform: 'uppercase', ...shadow },
  takeLine: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, ...shadow },
  takeSub: { color: 'rgba(255,255,255,0.88)', fontWeight: '700', fontSize: 13, ...shadow },
  stepTitle: { fontFamily: FONT.display, fontSize: 26, color: C.text, textAlign: 'center' },
  lead: { color: C.muted, fontWeight: '800', textAlign: 'center' },
  coach: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 6 },
  coachName: { fontWeight: '900', color: C.text, fontSize: 16 },
  coachDesc: { color: C.text, fontSize: 13 },
  coachFee: { fontWeight: '900', color: C.hardwood, fontSize: 15 },
  row: { flexDirection: 'row', gap: S.sm },
  option: { gap: S.sm, padding: S.sm, borderRadius: R.md, borderWidth: 2, backgroundColor: C.surface },
  optionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tier: { color: '#FFFFFF', fontWeight: '900', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 10, paddingVertical: 3, borderRadius: R.pill, overflow: 'hidden' },
  why: { color: C.danger, fontWeight: '800', fontSize: 12 },
  restart: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.surface, borderWidth: 2, borderColor: C.ink, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 6 },
  restartText: { fontWeight: '900', fontSize: 12, color: C.text },
});
