import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { refreshFriend } from '../../net/pins';
import { allChallenges, useChallenges } from '../../store/challenges';
import { ChallengeRow } from '../../ui/duelParts';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CARD_BY_ID } from '../../data/cards';
import { MODE_BY_ID } from '../../data/modes';
import { BEST_OF, type BestOf } from '../../engine/friends/match';
import { ALL_SLOTS } from '../../engine/types';
import { useCollection } from '../../store/collection';
import { useFriends } from '../../store/friends';
import { useGame } from '../../store/game';
import { useProfile } from '../../store/profile';
import { Avatar } from '../../ui/Avatar';
import { CollectCard } from '../../ui/CollectCard';
import { BackButton, Button, Display, Header, Screen, Segmented } from '../../ui/components';
import { Icon, type IconName } from '../../ui/icons';
import { goBack } from '../../ui/nav';
import { RosterBoard } from '../../ui/RosterBoard';
import { Text } from '../../ui/Text';
import { TierBadge } from '../../ui/TierBadge';
import { C, F, FONT, R, S } from '../../ui/theme';

/** A friend: head-to-head record, the three duel modes, their collection and last team. */
export default function FriendPage() {
  const { pin, fresh } = useLocalSearchParams<{ pin: string; fresh?: 'added' | 'updated' }>();
  const { t } = useTranslation();
  const f = useFriends((s) => s.friends.find((x) => x.pin === pin));
  const myTeam = useFriends((s) => s.lastTeam);
  const myPin = useFriends((s) => s.pin);
  const myLineup = useCollection((s) => s.lineup);
  const me = useProfile();
  const [bo, setBo] = useState<BestOf>(3);
  const [removing, setRemoving] = useState(false);
  const byId = useChallenges((x) => x.byId);
  const withThem = useMemo(() => allChallenges(byId).filter((c) => c.from === pin || c.to === pin).slice(0, 5), [byId, pin]);
  // Pull their latest team and collection from the online directory (silent if offline).
  useEffect(() => { if (pin) void refreshFriend(pin); }, [pin]);
  if (!f) return <Screen><Header title={t('friends.title')} left={<BackButton onPress={goBack} />} /></Screen>;
  const s = f.snap;
  const hasMyLineup = ALL_SLOTS.some((k) => myLineup[k]);
  const hasTheirLineup = Object.keys(s.lineup).length > 0;
  const play = (mode: 'clash' | 'finals') => router.push({ pathname: '/friends/play', params: { pin: f.pin, mode, n: String(mode === 'finals' ? 7 : bo) } });
  const race = () => {
    useGame.getState().newRun('current-2026', `race-${myPin}-${f.pin}-${Date.now().toString(36)}`);
    router.push('/draft');
  };

  return (
    <Screen tint={C.blue}>
      <Header title={t('friends.title')} left={<BackButton onPress={goBack} />} />
      {fresh && (
        <View style={styles.toast}><Icon name="check" size={22} /><Text style={styles.toastText}>{t(`friends.${fresh}`, { name: s.name })}</Text></View>
      )}

      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Avatar id={s.avatar} size={92} />
          <View style={{ flex: 1, gap: 4 }}>
            <Display size={30} align="left">{s.name}</Display>
            <View style={styles.badgeRow}>
              <TierBadge tier={s.stats.tier} size={30} />
              <Text style={styles.since}>{t('friends.addedOn', { day: f.added })}</Text>
            </View>
          </View>
        </View>
        <View style={styles.stats}>
          <Stat icon="ball" value={s.stats.drafts} label={t('friends.drafts')} />
          <Stat icon="trophy" value={s.stats.titles} label={t('friends.titles')} />
          <Stat icon="flame" value={s.stats.streak} label={t('friends.streak')} />
          <Stat icon="cards" value={s.stats.cards} label={t('friends.collection')} />
        </View>
      </View>

      <View style={styles.h2h} testID="h2h">
        <View style={styles.side}><Avatar id={me.avatarId} size={44} /><Text style={styles.sideName} numberOfLines={1}>{t('friends.you')}</Text></View>
        <Tally n={f.record.w} label={t('friends.w')} color={C.neon} />
        <Tally n={f.record.d} label={t('friends.d')} color={C.muted} />
        <Tally n={f.record.l} label={t('friends.l')} color={C.danger} />
        <View style={styles.side}><Avatar id={s.avatar} size={44} /><Text style={styles.sideName} numberOfLines={1}>{s.name}</Text></View>
      </View>

      <Button label={t('vs.challengeFriend', { name: s.name })} icon={<Icon name="vs" size={26} />} testID="challenge-friend"
        onPress={() => router.push({ pathname: '/challenge', params: { to: f.pin } })} />
      {withThem.length > 0 && (
        <View style={{ gap: S.sm }}>
          {withThem.map((c) => <ChallengeRow key={c.id} c={c} myPin={myPin} avatarOf={() => s.avatar} />)}
        </View>
      )}
      <Text style={styles.h2hNote}>{t('vs.h2hNote')}</Text>

      <Text style={styles.section}>{t('vs.practice')}</Text>
      <Text style={styles.small}>{t('vs.practiceDesc')}</Text>
      <Mode color={C.purple} icon="cards" title={t('friends.clash')} desc={t('friends.clashDesc')}
        blocked={!hasMyLineup ? t('friends.needLineup') : !hasTheirLineup ? t('friends.theirNoLineup', { name: s.name }) : null}>
        <Segmented options={BEST_OF} value={bo} onChange={setBo} format={(n) => t('friends.bestOf', { n })} />
        <Button label={t('friends.play')} variant="primary" icon={<Icon name="play" size={20} />} onPress={() => play('clash')} disabled={!hasMyLineup || !hasTheirLineup} testID="play-clash" />
      </Mode>
      <Mode color={C.gold} icon="trophy" title={t('friends.finals')} desc={t('friends.finalsDesc')}
        blocked={!myTeam ? t('friends.needTeam') : !s.team ? t('friends.theirNoTeam', { name: s.name }) : null}>
        <Button label={t('friends.play')} variant="gold" icon={<Icon name="play" size={20} />} onPress={() => play('finals')} disabled={!myTeam || !s.team} testID="play-finals" />
      </Mode>
      <Mode color={C.teal} icon="flame" title={t('friends.race')} desc={t('friends.raceDesc')} blocked={null}>
        <Text style={styles.small}>{t('friends.raceNote', { name: s.name })}</Text>
        <Button label={t('friends.raceStart')} variant="blue" icon={<Icon name="play" size={20} />} onPress={race} testID="play-race" />
      </Mode>

      {f.log.length > 0 && (
        <>
          <Text style={styles.section}>{t('friends.recent')}</Text>
          <View style={styles.log}>
            {f.log.slice(0, 8).map((g, i) => (
              <View key={i} style={styles.logRow}>
                <View style={[styles.pill, { backgroundColor: g.outcome === 'w' ? C.neon : g.outcome === 'l' ? C.danger : C.muted }]}>
                  <Text style={styles.pillText}>{t(`friends.${g.outcome}`)}</Text>
                </View>
                <Text style={styles.logMode}>{t(`friends.${g.mode}`)}</Text>
                <Text style={styles.logScore}>{g.score}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {hasTheirLineup && (
        <>
          <Text style={styles.section}>{t('friends.lineup')}</Text>
          <RosterBoard roster={Object.fromEntries(Object.entries(s.lineup).map(([k, v]) => [k, cardAsPlayer(v!.id)]))} color={C.purple} />
        </>
      )}
      {s.showcase.length > 0 && (
        <>
          <Text style={styles.section}>{t('friends.topCards')} · {t('friends.cards', { n: s.stats.cards })}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingVertical: 4 }}>
            {s.showcase.map((id) => (
              <Pressable key={id} onPress={() => router.push({ pathname: '/card/[id]', params: { id } })}>
                <CollectCard card={CARD_BY_ID[id]} width={112} finish={s.finishes?.[id] ?? 'base'} />
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}
      {s.team && (
        <>
          <Text style={styles.section}>{t('friends.lastTeam')}</Text>
          <Text style={styles.small}>{MODE_BY_ID[s.team.mode]?.title ?? s.team.mode} · {s.team.w}-{s.team.l}</Text>
          <RosterBoard roster={s.team.players} color={C.gold} />
        </>
      )}

      <Text style={styles.small}>{t('friends.stale', { day: f.updated })}</Text>
      <Button label={removing ? t('friends.removeSure') : t('friends.remove')} variant="ghost"
        onPress={() => { if (!removing) return setRemoving(true); useFriends.getState().remove(f.pin); goBack(); }} testID="remove-friend" />
    </Screen>
  );
}

const cardAsPlayer = (id: string) => {
  const c = CARD_BY_ID[id];
  return { id, name: c.name, pos: c.pos, pos2: c.pos2, more: c.more, ovr: c.ovr, off: c.ovr, def: c.ovr, reb: c.ovr, ast: c.ovr, three: c.ovr, dur: 90 };
};

function Stat({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={26} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function Tally({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <View style={styles.tally}>
      <Text style={[styles.tallyN, { color }]}>{n}</Text>
      <Text style={[styles.tallyL, { color }]}>{label}</Text>
    </View>
  );
}

function Mode({ color, icon, title, desc, blocked, children }: { color: string; icon: IconName; title: string; desc: string; blocked: string | null; children: React.ReactNode }) {
  return (
    <View style={[styles.mode, { borderColor: color }]}>
      <View style={styles.modeHead}>
        <Icon name={icon} size={30} />
        <Text style={[styles.modeTitle, { color }]}>{title}</Text>
      </View>
      <View style={styles.modeBody}>
        <Text style={styles.modeDesc}>{desc}</Text>
        {blocked && <Text style={styles.blocked}>{blocked}</Text>}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', backgroundColor: '#123326', borderRadius: R.pill, borderWidth: 2, borderColor: C.neon, paddingHorizontal: 14, paddingVertical: 6 },
  toastText: { color: C.neon, fontWeight: '800' },
  hero: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 2, borderColor: C.line, borderBottomWidth: 6, borderBottomColor: C.edge, padding: S.md, gap: S.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  since: { color: C.muted, fontWeight: '700', fontSize: 13, flexShrink: 1 },
  stats: { flexDirection: 'row', gap: S.xs },
  stat: { flex: 1, alignItems: 'center', backgroundColor: C.surface2, borderRadius: R.md, paddingVertical: S.sm, gap: 2 },
  statValue: { fontFamily: FONT.condensed, fontSize: 24, color: C.text },
  statLabel: { fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  h2h: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: R.lg, padding: S.md, gap: S.xs, borderWidth: 2, borderColor: C.line, borderBottomWidth: 6, borderBottomColor: C.edge },
  side: { flex: 1.3, alignItems: 'center', gap: 4 },
  sideName: { color: C.text, fontWeight: '800', fontSize: 13 },
  tally: { flex: 1, alignItems: 'center' },
  tallyN: { fontFamily: FONT.condensed, fontSize: 42, lineHeight: 46 },
  tallyL: { fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  h2hNote: { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  section: { ...F.condensed, fontSize: 24, color: C.text, marginTop: S.sm },
  mode: { borderRadius: R.lg, borderWidth: 2, borderBottomWidth: 5, backgroundColor: C.surface, overflow: 'hidden' },
  modeHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.md, paddingVertical: S.sm, backgroundColor: C.surface2 },
  modeTitle: { ...F.condensed, fontSize: 22 },
  modeBody: { padding: S.md, gap: S.sm },
  modeDesc: { color: C.text, fontSize: 15, lineHeight: 21 },
  blocked: { color: C.danger, fontWeight: '800', fontSize: 13 },
  small: { color: C.muted, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  log: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 2, borderColor: C.line, padding: S.sm, gap: 4 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: 4 },
  pill: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: C.ink, fontWeight: '900' },
  logMode: { flex: 1, color: C.text, fontWeight: '800' },
  logScore: { fontFamily: FONT.condensed, fontSize: 20, color: C.text },
});
