/**
 * The Weekly Challenge: this week's one-shot draft (same spins and league for everyone), the live leaderboard,
 * the prizes, and last week's result (its prize is paid here once the week is over).
 */
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { dailyKey } from '../engine/daily';
import { previousWeek, weekEnds, weekKey, type Depth } from '../engine/weekly';
import { fetchBoard, type Board, type BoardRow } from '../net/weekly';
import { useFriends } from '../store/friends';
import { useGame } from '../store/game';
import { useWeekly } from '../store/weekly';
import { BackButton, Button, Card, Display, Header, Label, Screen } from '../ui/components';
import { CourtBackdrop } from '../ui/SparkleBackdrop';
import { Icon } from '../ui/icons';
import { goBack } from '../ui/nav';
import { squadColor } from '../ui/squadColor';
import { Text } from '../ui/Text';
import { C, F, S } from '../ui/theme';

const ROUTE: Record<string, '/draft' | '/season' | '/deadline' | '/crisis' | '/playoffs' | '/result'> = {
  draft: '/draft', season: '/season', deadline: '/deadline', crisis: '/crisis', playoffs: '/playoffs', result: '/result',
};
const PRIZES = [['1', 'mythic'], ['top10', 'weekly'], ['top25', 'good']] as const;

/** "4d 6h" / "6h 12m" until the week ends. */
function useCountdown(end: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id); }, []);
  const ms = Math.max(0, end.getTime() - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
}

function Row({ rank, r, me }: { rank: number; r: BoardRow; me?: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.row, me && styles.rowMe]} testID={me ? 'weekly-me' : undefined}>
      <Text style={[styles.rank, rank <= 3 && { color: C.gold }]}>{rank}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
        <Text style={styles.depth}>{t(`weekly.depth${r.depth}`)}</Text>
      </View>
      <View style={[styles.sr, { backgroundColor: squadColor(r.sr) }]}><Text style={styles.srText}>{r.sr}</Text></View>
      <Text style={styles.record}>{r.w}-{r.l}</Text>
    </View>
  );
}

export default function Weekly() {
  const { t } = useTranslation();
  const [week] = useState(() => weekKey(dailyKey()));
  const last = previousWeek(week);
  const run = useWeekly((s) => s.weeks[week]) ?? {};
  const lastRun = useWeekly((s) => s.weeks[last]);
  const pin = useFriends((s) => s.pin);
  const g = useGame();
  const [board, setBoard] = useState<Board | null | 'loading'>('loading');
  const [confirm, setConfirm] = useState(false);
  const countdown = useCountdown(weekEnds(week));
  const live = g.weekly === week && g.phase !== 'idle';
  const otherLive = g.phase !== 'idle' && g.weekly !== week;

  useEffect(() => {
    let alive = true;
    void (async () => {
      // A finished run that didn't reach the board yet (offline) goes now; last week's prize is paid once.
      await useWeekly.getState().submit(week);
      void useWeekly.getState().settle(last);
      const b = await fetchBoard(week, pin);
      if (alive) setBoard(b);
    })();
    return () => { alive = false; };
  }, [week, last, pin]);

  const play = () => {
    if (otherLive && !run.started && !confirm) { setConfirm(true); return; }
    const r = g.newWeekly(week);
    if (r !== 'locked') router.push(ROUTE[useGame.getState().phase] ?? '/draft');
  };

  const fmt = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const range = `${fmt(week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(fmt(week).getTime() + 6 * 86_400_000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  const b = board === 'loading' ? null : board;
  const meRank = b?.me?.rank ?? run.rank;

  return (
    <Screen backdrop={<CourtBackdrop split={0.24} />}>
      <Header title={t('weekly.title')} left={<BackButton onPress={() => goBack()} />} light />

      <View style={styles.hero} testID="weekly-hero">
        <LinearGradient colors={['#2B1B6B', '#5B21B6', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.heroTop}>
          <Icon name="trophy" size={44} />
          <View style={{ flex: 1 }}>
            <Display size={26} color="#FFFFFF" align="left">{t('weekly.title')}</Display>
            <Text style={styles.heroSub}>{range} · {t('weekly.ends', { time: countdown })}</Text>
          </View>
        </View>
        <Text style={styles.rules}>{t('weekly.rules')}</Text>
        {run.result ? (
          <View style={styles.mine} testID="weekly-result">
            <Text style={styles.mineRecord}>{run.result.w}-{run.result.l}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.mineDepth}>{t(`weekly.depth${run.result.depth as Depth}`)}</Text>
              <Text style={styles.mineRank}>
                {meRank ? t('weekly.rankOf', { rank: meRank, total: b?.total ?? run.total ?? meRank }) : t('weekly.sending')}
              </Text>
            </View>
          </View>
        ) : live ? (
          <Button label={t('weekly.resume')} variant="gold" icon={<Icon name="play" size={22} />} onPress={play} testID="weekly-play" />
        ) : run.started ? (
          <Text style={styles.heroSub}>{t('weekly.missed')}</Text>
        ) : (
          <>
            {confirm && <Text style={styles.warn}>{t('weekly.replace')}</Text>}
            <Button label={confirm ? t('weekly.playAnyway') : t('weekly.play')} variant="gold" icon={<Icon name="play" size={22} />} onPress={play} testID="weekly-play" />
          </>
        )}
      </View>

      {lastRun?.prized && lastRun.rank && (
        <Card style={{ gap: 4 }} testID="weekly-last">
          <Label color={C.hardwood}>{t('weekly.lastWeek')}</Label>
          <Text style={styles.lastText}>{t('weekly.rankOf', { rank: lastRun.rank, total: lastRun.total ?? lastRun.rank })}</Text>
        </Card>
      )}

      <Card style={{ gap: S.sm }}>
        <Label color={C.gold}>{t('weekly.prizes')}</Label>
        {PRIZES.map(([k, type]) => (
          <View key={k} style={styles.prize}>
            <Icon name="gift" size={22} />
            <Text style={styles.prizeText}>{t(`weekly.prize_${k}`)}</Text>
            <Text style={styles.prizePick}>{t(`collect.t_${type}`)}</Text>
          </View>
        ))}
        <Text style={styles.note}>{t('weekly.prizeNote')}</Text>
      </Card>

      <Card style={{ gap: 2 }} testID="weekly-board">
        <Label color={C.hardwood}>{t('weekly.board')}{b ? ` · ${b.total}` : ''}</Label>
        {board === 'loading' ? <ActivityIndicator color={C.hardwood} style={{ padding: S.lg }} />
          : !b ? <Text style={styles.note}>{t('weekly.offline')}</Text>
            : b.total === 0 ? <Text style={styles.note}>{t('weekly.empty')}</Text>
              : (
                <>
                  {b.top.map((r, i) => <Row key={i} rank={i + 1} r={r} me={b.me?.rank === i + 1} />)}
                  {b.me && b.me.rank > b.top.length && (
                    <>
                      <Text style={styles.gap}>⋯</Text>
                      <Row rank={b.me.rank} r={b.me} me />
                    </>
                  )}
                </>
              )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 22, overflow: 'hidden', borderWidth: 3, borderColor: C.ink, borderBottomWidth: 7, padding: S.lg, gap: S.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  heroSub: { color: '#E4DAFF', fontWeight: '800', fontSize: 13 },
  rules: { color: '#FFFFFF', fontWeight: '700' },
  warn: { color: '#FFE08A', fontWeight: '800', textAlign: 'center' },
  mine: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 16, padding: S.md },
  mineRecord: { color: '#FFC53D', fontSize: 40, ...F.display },
  mineDepth: { color: '#FFFFFF', fontWeight: '900' },
  mineRank: { color: '#E4DAFF', fontWeight: '800' },
  lastText: { color: C.text, fontWeight: '800' },
  prize: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  prizeText: { color: C.text, fontWeight: '800', flex: 1 },
  prizePick: { color: C.muted, fontWeight: '800', fontSize: 13 },
  note: { color: C.muted, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 10 },
  rowMe: { backgroundColor: '#FFF1E3', borderWidth: 2, borderColor: C.hardwood },
  rank: { color: C.muted, width: 30, fontWeight: '900', fontSize: 15 },
  name: { color: C.text, fontWeight: '800' },
  depth: { color: C.muted, fontSize: 11, fontWeight: '700' },
  sr: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  srText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  record: { color: C.text, fontSize: 17, minWidth: 54, textAlign: 'right', ...F.display },
  gap: { color: C.muted, textAlign: 'center' },
});
