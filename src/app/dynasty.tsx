/**
 * Dynasty: pick a franchise, then keep its real roster or hold a fantasy draft. For the draft, a reel spins your
 * slot (1–30) and all 30 teams draft today's league from scratch, 10 rounds, snake order. Then the seasons roll
 * (career mode: development, offseasons, the rookie draft, free agency), with no board cards.
 */
import { HistoryGate } from '../ui/HistoryGate';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { feel } from '../audio/feel';
import { current2026 } from '../data/current2026';
import { franchiseOf } from '../engine/conference';
import { ROUNDS, available, draftDone, draftPool, picksUntilUser, roundOf, slotForPick } from '../engine/career/fantasy';
import { realRotation } from '../engine/realLeague';
import { squadRating } from '../engine/rotation';
import { POSITIONS, playsPos, type Pos, type Roster, type RosterSlots } from '../engine/types';
import { useCareer } from '../store/career';
import { useGame } from '../store/game';
import { BackButton, Button, Card, Display, Header, Label, Screen } from '../ui/components';
import { Icon } from '../ui/icons';
import { PlayerCard } from '../ui/PlayerCard';
import { RosterBoard } from '../ui/RosterBoard';
import { SquadBadge } from '../ui/SquadBadge';
import { TeamTile, teamSummary } from '../ui/TeamTile';
import { Text } from '../ui/Text';
import { C, FONT, R, S } from '../ui/theme';
import { goBack } from '../ui/nav';

const teamOf = (f: string) => current2026.teams.find((t) => franchiseOf(t) === f)!;

/** Step 1: pick your franchise, then real roster or fantasy draft. */
function Pick() {
  const { t } = useTranslation();
  const startDynasty = useCareer((s) => s.startDynasty);
  const [chosen, setChosen] = useState<string | null>(null);
  const team = chosen ? teamOf(chosen) : null;
  const sum = useMemo(() => (team ? teamSummary(team) : null), [team]);

  const go = (how: 'real' | 'draft') => {
    if (!chosen) return;
    feel('thunk');
    startDynasty(chosen, how);
    if (how === 'real') router.replace('/season');
  };

  return (
    <Screen>
      <Header title={t('dynasty.title')} left={<BackButton onPress={() => goBack()} />} />
      <View style={styles.head}>
        <LinearGradient colors={['#1A0F2E', '#3B1F6B', '#7A4DFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.headIcon}><Icon name="crown" size={40} /></View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.headTitle}>{t('dynasty.title')}</Text>
          <Text style={styles.headDesc}>{t('dynasty.desc')}</Text>
        </View>
      </View>

      {team && sum ? (
        <>
          <Label>{t('dynasty.howStart', { team: `${team.city} ${team.name}` })}</Label>
          <Pressable onPress={() => go('real')} testID="dynasty-real" style={({ pressed }) => [styles.choice, pressed && styles.pressed]}>
            <Icon name="clipboard" size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.choiceTitle}>{t('dynasty.real')}</Text>
              <Text style={styles.choiceDesc}>{t('dynasty.realDesc')}</Text>
              <Text style={styles.choiceMeta}>SR {sum.sr} · {[sum.slots.PG, sum.slots.SG, sum.slots.SF, sum.slots.PF, sum.slots.C].sort((a, b) => b.ovr - a.ovr).slice(0, 3).map((p) => p.name).join(', ')}</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => go('draft')} testID="dynasty-draft" style={({ pressed }) => [styles.choice, styles.choiceGold, pressed && styles.pressed]}>
            <Icon name="cards" size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.choiceTitle}>{t('dynasty.draft')}</Text>
              <Text style={styles.choiceDesc}>{t('dynasty.draftDesc')}</Text>
            </View>
          </Pressable>
          <Button label={t('dynasty.otherTeam')} variant="ghost" onPress={() => setChosen(null)} testID="dynasty-back" />
        </>
      ) : (
        <>
          <Label>{t('dynasty.pickTeam')}</Label>
          <View style={styles.grid}>
            {current2026.teams.map((x) => (
              <View key={x.id} style={styles.cell}>
                <TeamTile t={x} onPress={() => { feel('tick'); setChosen(franchiseOf(x)); }} testID={`dynasty-team-${franchiseOf(x)}`} />
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

/** Step 2: spin your draft slot. */
function Reel({ onSpin, onDone }: { onSpin: () => void; onDone: () => void }) {
  const { t } = useTranslation();
  const spinSlot = useCareer((s) => s.spinSlot);
  const fantasy = useCareer((s) => s.fantasy);
  const [shown, setShown] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const spin = () => {
    if (rolling || fantasy) return;
    setRolling(true);
    onSpin();
    const slot = spinSlot();
    let ticks = 0;
    timer.current = setInterval(() => {
      ticks++;
      feel('tick');
      if (ticks >= 20) {
        clearInterval(timer.current!);
        setShown(slot + 1);
        setRolling(false);
        feel('fanfare');
      } else setShown(1 + Math.floor(Math.random() * 30));
    }, 60 + ticks * 4);
  };

  return (
    <Screen>
      <Header title={t('dynasty.draft')} left={<BackButton onPress={() => goBack()} />} />
      <Text style={styles.stepTitle}>{t('dynasty.spinTitle')}</Text>
      <Text style={styles.lead}>{t('dynasty.spinDesc')}</Text>
      <View style={styles.reel} testID="dynasty-reel">
        <Text style={styles.reelNum}>{shown ?? '?'}</Text>
      </View>
      {shown && !rolling && fantasy ? (
        <>
          <Display size={30}>{t('dynasty.yourSlot', { n: shown })}</Display>
          <Button label={t('dynasty.toDraft')} variant="gold" onPress={onDone} testID="dynasty-to-draft" />
        </>
      ) : (
        <Button label={rolling ? t('dynasty.spinning') : t('dynasty.spin')} variant="gold" disabled={rolling} icon={<Icon name="reroll" size={22} />} onPress={spin} testID="dynasty-spin" />
      )}
    </Screen>
  );
}

/** Step 3: the draft board. */
function Board() {
  const { t } = useTranslation();
  const c = useCareer();
  const fd = c.fantasy!;
  const pool = useMemo(() => draftPool(current2026.teams), []);
  const byId = useMemo(() => new Map(pool.map((p) => [p.id, p])), [pool]);
  const [pos, setPos] = useState<Pos | null>(null);
  const teams = fd.order.length;
  const done = draftDone(fd);
  const left = available(fd, pool).filter((p) => !pos || playsPos(p, pos)).slice(0, 30);
  const mine = fd.picks[fd.userSlot].map((id) => byId.get(id)!).filter(Boolean);
  // Recent picks, newest first: replay the snake order to see who took whom.
  const recent = useMemo(() => {
    const seen = fd.order.map(() => 0);
    const out: { n: number; team: string; name: string; ovr: number }[] = [];
    for (let n = 0; n < fd.made; n++) {
      const slot = slotForPick(n, teams);
      const p = byId.get(fd.picks[slot][seen[slot]++]);
      if (p) out.push({ n: n + 1, team: teamOf(fd.order[slot]).name, name: p.name, ovr: p.ovr });
    }
    return out.reverse().slice(0, 8);
  }, [fd, teams, byId]);
  const roster: Roster | null = mine.length >= 5
    ? { id: 'user', name: '', colors: ['#000', '#fff'], slots: realRotation(mine, 'user') as Required<RosterSlots> }
    : null;
  const team = teamOf(c.franchise!);

  const start = () => { feel('fanfare'); c.finishFantasy(); router.replace('/season'); };

  return (
    <Screen tint={team.colors[0]}>
      <Header title={t('dynasty.draft')} left={<BackButton onPress={() => router.replace('/')} />} />
      <Card style={[styles.clock, { borderColor: team.colors[0] }]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.clockKicker}>{done ? t('dynasty.doneTitle') : t('dynasty.round', { r: roundOf(fd.made, teams) + 1, total: ROUNDS })}</Text>
          <Text style={styles.clockTitle} testID="dynasty-clock">
            {done ? `${team.city} ${team.name}` : picksUntilUser(fd) === 0 ? t('dynasty.onClock', { n: fd.made + 1 }) : t('dynasty.waiting')}
          </Text>
          <Text style={styles.clockSub}>{t('dynasty.slotLine', { n: fd.userSlot + 1, picks: mine.length, total: ROUNDS })}</Text>
        </View>
        {roster && <SquadBadge value={Math.round(squadRating(roster))} size="sm" />}
      </Card>

      {done ? (
        <>
          {roster && <RosterBoard roster={roster.slots} color={team.colors[0]} />}
          <Button label={t('dynasty.startSeason')} variant="gold" icon={<Icon name="play" size={22} />} onPress={start} testID="dynasty-start-season" />
        </>
      ) : (
        <>
          {recent.length > 0 && (
            <Card style={{ gap: 4 }}>
              <Label>{t('dynasty.recent')}</Label>
              {recent.map((x) => (
                <Text key={x.n} style={styles.recent} numberOfLines={1}>#{x.n} {x.team}: <Text style={styles.recentName}>{x.name}</Text> ({x.ovr})</Text>
              ))}
            </Card>
          )}
          {mine.length > 0 && <Text style={styles.mine} numberOfLines={2}>{t('dynasty.yourTeam')}: {mine.map((p) => `${p.name} ${p.ovr}`).join(' · ')}</Text>}
          <View style={styles.chips}>
            {[null, ...POSITIONS].map((x) => (
              <Pressable key={x ?? 'all'} onPress={() => setPos(x)} style={[styles.chip, pos === x && styles.chipOn]} testID={`dynasty-pos-${x ?? 'all'}`}>
                <Text style={[styles.chipText, pos === x && { color: '#FFFFFF' }]}>{x ?? t('dynasty.all')}</Text>
              </Pressable>
            ))}
          </View>
          {left.map((p) => (
            <PlayerCard key={p.id} player={p} testID="dynasty-player" onPress={() => { feel('pickChime'); c.fantasyPick(p.id); }} />
          ))}
          <Button label={t('dynasty.auto')} variant="secondary" onPress={() => c.fantasyAuto()} testID="dynasty-auto" />
        </>
      )}
    </Screen>
  );
}

function DynastyScreen() {
  const c = useCareer();
  const g = useGame();
  // The reel stays up after it lands until you head to the draft.
  const [reel, setReel] = useState(false);
  const pending = c.active && c.mode === 'dynasty' && c.history.length === 0 && !(g.career && g.season);
  if (pending && (!c.fantasy || reel)) return <Reel onSpin={() => setReel(true)} onDone={() => setReel(false)} />;
  if (c.active && c.mode === 'dynasty' && c.fantasy) return <Board />;
  return <Pick />;
}

/** Today's league only, but the career tab's other screens load the history: keep the gate for parity. */
export default function Dynasty() {
  return <HistoryGate><DynastyScreen /></HistoryGate>;
}

const styles = StyleSheet.create({
  pressed: { transform: [{ translateY: 3 }] },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, borderRadius: 24, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7 },
  headIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  headTitle: { color: '#FFFFFF', fontFamily: FONT.display, fontSize: 28 },
  headDesc: { color: '#E6DCFF', fontWeight: '700', fontSize: 13, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -S.xs },
  cell: { width: '50%', padding: S.xs },
  choice: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7 },
  choiceGold: { backgroundColor: '#FFF1D6' },
  choiceTitle: { fontFamily: FONT.display, fontSize: 22, color: C.text },
  choiceDesc: { color: C.text, fontSize: 14, lineHeight: 19 },
  choiceMeta: { color: C.muted, fontWeight: '800', fontSize: 12 },
  stepTitle: { fontFamily: FONT.display, fontSize: 28, color: C.text, textAlign: 'center' },
  lead: { color: C.muted, fontWeight: '800', textAlign: 'center' },
  reel: { alignSelf: 'center', width: 180, height: 180, borderRadius: 90, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: '#FFC53D' },
  reelNum: { fontFamily: FONT.display, fontSize: 84, color: '#FFC53D' },
  clock: { flexDirection: 'row', alignItems: 'center', gap: S.md, borderWidth: 3 },
  clockKicker: { fontWeight: '900', fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: C.muted },
  clockTitle: { fontFamily: FONT.display, fontSize: 24, color: C.text },
  clockSub: { color: C.muted, fontWeight: '800', fontSize: 13 },
  recent: { color: C.muted, fontSize: 13, fontWeight: '700' },
  recentName: { color: C.text, fontWeight: '900' },
  mine: { color: C.text, fontWeight: '800', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, borderWidth: 2, borderColor: C.ink, backgroundColor: C.surface },
  chipOn: { backgroundColor: C.ink },
  chipText: { fontWeight: '900', color: C.text },
});
