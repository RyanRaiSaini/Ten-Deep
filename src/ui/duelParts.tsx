/** Pieces the duel screens share: the face-off header, a format tile, and a challenge row. Arena Night look. */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { opponentOf, outcomeFor, scoreFor, type Challenge, type ChallengeMode } from '../engine/friends/challenge';
import { Avatar } from './Avatar';
import { Icon, type IconName } from './icons';
import { Text } from './Text';
import { C, F, FONT, R, S } from './theme';

export const MODE_LOOK: Record<ChallengeMode, { icon: IconName; color: string }> = {
  draft: { icon: 'ball', color: C.hardwood },
  clash: { icon: 'cards', color: C.purple },
  finals: { icon: 'trophy', color: C.gold },
};
export const ME_COLOR = C.hardwood;
export const THEM_COLOR = C.blue;

/** Two coaches under the lights: avatars, names, and (once it's played) the series score. */
export function FaceOff({ me, them, wins, mode, testID }: {
  me: { name: string; avatar: string }; them: { name: string; avatar?: string | null };
  wins?: [number, number]; mode?: ChallengeMode; testID?: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.arena} testID={testID}>
      <LinearGradient colors={['rgba(255,116,23,0.45)', 'rgba(255,116,23,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 0.55, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(106,168,255,0)', 'rgba(106,168,255,0.45)']} start={{ x: 0.45, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <View style={styles.midLine} />
      {mode && (
        <View style={[styles.modePill, { borderColor: MODE_LOOK[mode].color }]}>
          <Icon name={MODE_LOOK[mode].icon} size={16} />
          <Text style={[styles.modePillText, { color: MODE_LOOK[mode].color }]}>{t(`vs.mode.${mode}`)}</Text>
        </View>
      )}
      <View style={styles.faceRow}>
        <Coach name={me.name} avatar={me.avatar} color={ME_COLOR} wins={wins?.[0]} />
        <View style={styles.vsBadge}><Icon name="vs" size={56} /></View>
        <Coach name={them.name} avatar={them.avatar} color={THEM_COLOR} wins={wins?.[1]} />
      </View>
    </View>
  );
}

function Coach({ name, avatar, color, wins }: { name: string; avatar?: string | null; color: string; wins?: number }) {
  return (
    <View style={styles.coach}>
      <View style={[styles.ring, { borderColor: color, shadowColor: color }]}>
        {avatar ? <Avatar id={avatar} size={72} /> : <View style={styles.mystery}><Text style={styles.mysteryText}>?</Text></View>}
      </View>
      <Text style={styles.coachName} numberOfLines={1}>{name}</Text>
      {wins !== undefined && <Text style={[styles.wins, { color }]}>{wins}</Text>}
    </View>
  );
}

/** A format to pick on the challenge page: icon, name, what it is, and why it's locked if it is. */
export function FormatTile({ mode, selected, locked, onPress, children }: {
  mode: ChallengeMode; selected: boolean; locked: string | null; onPress: () => void; children?: ReactNode;
}) {
  const { t } = useTranslation();
  const look = MODE_LOOK[mode];
  return (
    <Pressable onPress={onPress} disabled={!!locked} testID={`format-${mode}`} accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!locked }}
      style={[styles.format, selected && { borderColor: look.color, backgroundColor: C.surface2 }, locked && { opacity: 0.55 }]}>
      <View style={[styles.formatIcon, { backgroundColor: `${look.color}22`, borderColor: look.color }]}><Icon name={look.icon} size={30} /></View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.formatName}>{t(`vs.mode.${mode}`)}</Text>
        <Text style={styles.formatDesc}>{t(`vs.desc.${mode}`)}</Text>
        {locked && <Text style={styles.locked}>{locked}</Text>}
        {selected && children}
      </View>
      <View style={[styles.radio, selected && { borderColor: look.color }]}>{selected && <View style={[styles.radioDot, { backgroundColor: look.color }]} />}</View>
    </Pressable>
  );
}

/** One challenge in a list: who, which format, where it stands. Opens the face-off. */
export function ChallengeRow({ c, myPin, avatarOf, unseen }: { c: Challenge; myPin: string; avatarOf: (pin: string) => string | null; unseen?: boolean }) {
  const { t } = useTranslation();
  const opp = opponentOf(c, myPin);
  const name = opp.name ?? t('vs.friend');
  const out = outcomeFor(c, myPin);
  const incoming = c.to === myPin;
  const status = c.status === 'done' ? t(out === 'w' ? 'vs.statusWon' : 'vs.statusLost', { score: scoreFor(c, myPin) })
    : c.status === 'open' ? t(incoming ? 'vs.statusOpenIn' : 'vs.statusOpenOut', { name })
    : t(c.status === 'declined' ? 'vs.statusDeclined' : 'vs.statusExpired');
  const tone = c.status === 'done' ? (out === 'w' ? C.neon : C.danger) : c.status === 'open' && incoming ? C.accent : C.muted;
  return (
    <Pressable onPress={() => router.push({ pathname: '/vs/[id]', params: { id: c.id } })} testID={`challenge-${c.id}`} accessibilityRole="button"
      style={({ pressed }) => [styles.row, incoming && c.status === 'open' && styles.rowHot, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}>
      {avatarOf(opp.pin) ? <Avatar id={avatarOf(opp.pin)!} size={44} /> : <View style={[styles.mystery, { width: 44, height: 44, borderRadius: 22 }]}><Icon name="friends" size={24} /></View>}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
        <View style={styles.rowMeta}>
          <Icon name={MODE_LOOK[c.mode].icon} size={14} />
          <Text style={styles.rowMode}>{t(`vs.mode.${c.mode}`)}{c.mode === 'clash' ? ` · ${t('friends.bestOf', { n: c.bestOf })}` : ''}</Text>
        </View>
      </View>
      <View style={[styles.status, { borderColor: tone }]}>
        <Text style={[styles.statusText, { color: tone }]} numberOfLines={1}>{status}</Text>
      </View>
      {unseen && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  arena: {
    borderRadius: R.lg, overflow: 'hidden', backgroundColor: '#0E1422', borderWidth: 2, borderColor: C.line, borderBottomWidth: 6, borderBottomColor: C.edge,
    paddingVertical: S.lg, paddingHorizontal: S.md, alignItems: 'center', gap: S.sm,
  },
  midLine: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 2, marginLeft: -1, backgroundColor: 'rgba(255,255,255,0.18)' },
  modePill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 3, backgroundColor: 'rgba(7,10,16,0.7)' },
  modePillText: { ...F.condensed, fontSize: 15 },
  faceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  vsBadge: { marginHorizontal: -4, zIndex: 2 },
  coach: { flex: 1, alignItems: 'center', gap: 4, minWidth: 0 },
  ring: { borderRadius: 48, borderWidth: 4, backgroundColor: C.surface, shadowOpacity: 0.7, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  coachName: { ...F.condensed, fontSize: 18, color: C.text, maxWidth: 130 },
  wins: { fontFamily: FONT.condensed, fontSize: 56, lineHeight: 60 },
  mystery: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' },
  mysteryText: { fontFamily: FONT.display, fontSize: 38, color: C.blue },
  format: {
    flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md, borderRadius: R.lg, backgroundColor: C.surface,
    borderWidth: 2, borderColor: C.line, borderBottomWidth: 5, borderBottomColor: C.edge,
  },
  formatIcon: { width: 54, height: 54, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  formatName: { ...F.condensed, fontSize: 21, color: C.text },
  formatDesc: { color: C.muted, fontSize: 14, lineHeight: 19 },
  locked: { color: C.danger, fontSize: 13, fontWeight: '800' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.sm + 2, borderRadius: R.lg, backgroundColor: C.surface,
    borderWidth: 2, borderColor: C.line, borderBottomWidth: 5, borderBottomColor: C.edge,
  },
  rowHot: { borderColor: C.accent },
  rowName: { fontSize: 17, fontWeight: '800', color: C.text },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowMode: { color: C.muted, fontSize: 13, fontWeight: '700' },
  status: { borderWidth: 2, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 150 },
  statusText: { ...F.condensed, fontSize: 14 },
  dot: { position: 'absolute', top: 6, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
});
