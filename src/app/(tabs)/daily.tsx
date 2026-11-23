import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../ui/Text';
import { dailyKey } from '../../engine/daily';
import { useDaily } from '../../store/daily';
import { useGame } from '../../store/game';
import { BackButton, Button, Card, Display, Header, Label, Screen, TabTitle } from '../../ui/components';
import { C, F, FONT, R, S, alpha } from '../../ui/theme';
import { Icon, type IconName } from '../../ui/icons';
import { CONFIG } from '../../config';
import { shareText } from '../../ui/share';

const ROUTE: Record<string, '/draft' | '/season' | '/deadline' | '/playoffs' | '/result'> = {
  draft: '/draft', season: '/season', deadline: '/deadline', playoffs: '/playoffs', result: '/result',
};

export default function DailyHub() {
  const { t } = useTranslation();
  const [key] = useState(() => dailyKey());
  const day = useDaily((s) => s.days[key]) ?? {};
  const g = useGame();
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [shared, setShared] = useState<'shared' | 'copied' | null>(null);
  const dailyLive = g.daily === key && g.phase !== 'idle';
  const otherRunLive = g.phase !== 'idle' && g.daily !== key;

  const openDraft = () => {
    if (otherRunLive && !day.draftStarted && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    const r = g.newDaily(key);
    if (r !== 'locked') router.push(ROUTE[useGame.getState().phase] ?? '/draft');
  };
  const draftStatus = day.draft
    ? `${day.draft.wins}-${day.draft.losses}${day.draft.champion ? ' ★' : ''}`
    : dailyLive ? null : day.draftStarted ? t('daily.missed') : null;

  const items = [
    {
      id: 'draft', icon: 'ball' as IconName, title: t('daily.draft'), desc: t('daily.draftDesc'), accent: C.hardwood,
      status: draftStatus,
      cta: dailyLive ? t('daily.resume') : undefined,
      open: openDraft,
    },
    {
      id: 'trivia', icon: 'brain' as IconName, title: t('daily.trivia'), desc: t('daily.triviaDesc'), accent: C.neon,
      status: day.trivia !== undefined ? `${day.trivia}/5` : null,
      open: () => router.push('/daily/trivia'),
    },
    {
      id: 'rank', icon: 'chart' as IconName, title: t('daily.rank'), desc: t('daily.rankDesc'), accent: C.gold,
      status: day.rank !== undefined ? `${day.rank}/5` : null,
      open: () => router.push('/daily/rank?kind=players'),
    },
    {
      id: 'team-rank', icon: 'trophy' as IconName, title: t('daily.teamRank'), desc: t('daily.teamRankDesc'), accent: '#7C5CFF',
      status: day.teamRank !== undefined ? `${day.teamRank}/5` : null,
      open: () => router.push('/daily/rank?kind=teams'),
    },
    {
      id: 'derby', icon: 'vs' as IconName, title: t('daily.derby'), desc: t('daily.derbyDesc'), accent: C.danger,
      status: day.derby !== undefined ? `${day.derby}/5` : null,
      open: () => router.push('/daily/pick?kind=derby'),
    },
    {
      id: 'team-duel', icon: 'swap' as IconName, title: t('daily.teamDuel'), desc: t('daily.teamDuelDesc'), accent: '#3B5BFF',
      status: day.teamDuel !== undefined ? (day.teamDuel ? '✓' : '✗') : null,
      open: () => router.push('/daily/pick?kind=duel'),
    },
  ];

  return (
    <Screen tint={C.blue} tabbed>
      <TabTitle icon={<Icon name="calendar" size={46} />} title={t('daily.title')} />
      <View style={styles.progressRow}>
        <View style={styles.progress}>
          {items.map((it) => <View key={it.id} style={[styles.seg, it.status ? { backgroundColor: '#18C08A' } : null]} />)}
        </View>
        <Text style={styles.progressText}>{items.filter((it) => it.status).length}/{items.length}</Text>
      </View>
      {items.map((it) => (
        <Card key={it.id} style={styles.card} onPress={it.status ? undefined : it.open}>
          <View style={[styles.tile, { backgroundColor: alpha(it.accent, 0.18) }]}><Icon name={it.icon} size={44} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Display size={22} align="left">{it.title}</Display>
            <Text style={styles.desc} testID={`daily-${it.id}`}>{it.desc}</Text>
          </View>
          {it.status
            ? <View style={styles.done}><Text style={styles.doneText}>{it.status}</Text></View>
            : <View style={styles.playPill}><Text style={styles.playText}>{(('cta' in it && it.cta) || t('daily.play')).toUpperCase()}</Text></View>}
        </Card>
      ))}
      {items.some((it) => it.status) && (
        <Button
          label={shared ? t(`challenge.${shared}`) : t('daily.share')}
          variant="dark"
          icon={<Icon name="swap" size={22} />}
          testID="daily-share"
          onPress={async () => {
            const EMOJI: Record<string, string> = { draft: '🏀', trivia: '🧠', rank: '📊', 'team-rank': '🏆', derby: '⚔️', 'team-duel': '🔮' };
            const lines = items.map((it) => `${EMOJI[it.id]} ${it.status ?? '—'}`);
            const r = await shareText([`TEN DEEP ${t('daily.title')} ${key}`, ...lines, CONFIG.webUrl].join('\n'));
            if (r !== 'failed') setShared(r);
          }}
        />
      )}
      {confirmReplace && <Text style={[styles.desc, { color: C.gold, textAlign: 'center' }]} testID="replace-warning">{t('daily.replaceRun')}</Text>}
      <Text style={styles.desc}>{t('daily.tomorrow')}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  tile: { width: 66, height: 66, borderRadius: 18, borderWidth: 2.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  desc: { color: C.muted, fontSize: 13, fontWeight: '700' },
  playPill: { borderRadius: R.pill, borderWidth: 2.5, borderColor: C.ink, borderBottomWidth: 5, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  playText: { fontFamily: FONT.display, fontSize: 18, color: C.ink },
  done: { borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#D6FBEA', borderWidth: 2, borderColor: '#18C08A' },
  doneText: { fontWeight: '900', color: '#0B8A61', fontSize: 15 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  progress: { flex: 1, flexDirection: 'row', gap: 3, height: 16, borderRadius: R.pill, borderWidth: 2.5, borderColor: C.ink, padding: 2, backgroundColor: '#FFFFFF' },
  seg: { flex: 1, borderRadius: R.pill, backgroundColor: C.line },
  progressText: { fontFamily: FONT.display, fontSize: 20, color: C.ink },
});
