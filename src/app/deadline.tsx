import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/Text';
import { feel } from '../audio/feel';
import { POOLS } from '../data';
import { tradeSwap } from '../engine/season';
import { ALL_SLOTS } from '../engine/types';
import { useGame } from '../store/game';
import { Button, Card, Header, Label, Screen } from '../ui/components';
import { PlayerCard } from '../ui/PlayerCard';
import { Spinner } from '../ui/Spinner';
import { C, S } from '../ui/theme';
import { useRunColors } from '../ui/runColors';
import { Icon } from '../ui/icons';

export default function Deadline() {
  const { t } = useTranslation();
  const runColors = useRunColors();
  const g = useGame();
  const [spinKey, setSpinKey] = useState(0);
  const [landed, setLanded] = useState(true);
  const pool = POOLS[g.poolId];
  const decoys = useMemo(() => pool?.teams ?? [], [pool]);

  if (!g.season || !g.deadline || !pool) return <Redirect href="/season" />;
  const { season, deadline } = g;
  const user = season.teams[0];
  const taken = new Set(season.teams.flatMap((tm) => ALL_SLOTS.map((k) => tm.slots[k].name)));

  const done = (fn: () => void) => { fn(); router.replace('/season'); };
  const candidates = deadline.spin && landed && deadline.outId
    ? deadline.spin.players.filter((p) => !taken.has(p.name)).map((p) => {
        // Show the real reason a signing is blocked (position, superstar limit, or cap).
        let why: string | null = null;
        try { tradeSwap(season, deadline.outId!, p); } catch (e) {
          const m = (e as Error).message;
          why = /superstar/i.test(m) ? t('draft.superstarLimit') : /can't play/i.test(m) ? t('draft.noSlot') : t('draft.overCap');
        }
        return { p, ok: !why, why };
      })
    : [];

  return (
    <Screen tint={runColors[0]}>
      <Header title={t('deadline.title')} />
      <Text style={styles.desc}>{t('deadline.desc')}</Text>

      {!deadline.spun && (
        <>
          <Label>{t('deadline.chooseOut')}</Label>
          <View style={{ gap: S.sm }}>
            {ALL_SLOTS.map((slot) => (
              <PlayerCard
                key={slot}
                player={user.slots[slot]}
                note={slot}
                selected={deadline.outId === user.slots[slot].id}
                onPress={() => g.chooseDeadlineOut(user.slots[slot].id)}
              />
            ))}
          </View>
          <Button
            label={t('deadline.spin')} icon={<Icon name="ball" size={22} />}
            disabled={!deadline.outId}
            onPress={() => { setLanded(false); g.spinDeadline(); setSpinKey((k) => k + 1); }}
            testID="deadline-spin"
          />
        </>
      )}

      {deadline.spun && (
        <Card style={{ gap: S.md }}>
          <Spinner target={deadline.spin ?? null} decoys={decoys} spinKey={spinKey} onLanded={() => setLanded(true)} />
          {candidates.map(({ p, ok, why }) => (
            <PlayerCard key={p.id} player={p} disabled={!ok} note={why ?? undefined}
              onPress={() => done(() => { g.signDeadline(p); feel('pickChime'); })} />
          ))}
        </Card>
      )}

      <Button label={t('deadline.skip')} variant="ghost" onPress={() => done(g.skipDeadline)} testID="deadline-skip" />
      <Text style={[styles.desc, { color: C.muted }]}>{season.records[0].w}-{season.records[0].l}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  desc: { color: C.text, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
