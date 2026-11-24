/** One idea: the problem, who has it, linked evidence (kept apart from assumptions), the change and how to measure it. */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Screen } from '../../../ui/components';
import { C, S } from '../../../ui/theme';
import { Text } from '../../../ui/Text';
import { ideaScore } from '../../../outreach/backlog';
import { useAdmin } from '../../../outreach/store';
import { IDEA_STATUSES, type Idea } from '../../../outreach/types';
import { Body, Box, Chips, Columns, Field, Muted, Pill, Row, Small, Strong } from '../../../outreach/ui';

const SCORES = ['1', '2', '3', '4', '5'] as const;

export default function IdeaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, commit } = useAdmin();
  const idea = db?.ideas.find((i) => i.id === id);
  const [f, setF] = useState<Idea | null>(idea ?? null);
  const [sure, setSure] = useState(false);
  if (!db || !idea || !f) {
    return <Screen><View style={{ paddingTop: S.xl, gap: S.md }}><Muted>{db ? 'Idea not found.' : 'Open the admin first.'}</Muted><Small label="Back to admin" onPress={() => router.replace('/admin')} /></View></Screen>;
  }
  const set = <K extends keyof Idea>(k: K) => (v: Idea[K]) => setF({ ...f, [k]: v });
  const toggle = (evId: string) => setF({ ...f, evidence: f.evidence.includes(evId) ? f.evidence.filter((e) => e !== evId) : [...f.evidence, evId] });
  return (
    <Screen wide>
      <View style={{ gap: S.md, paddingTop: S.lg }}>
        <Row><Small label="← Admin" onPress={() => router.replace('/admin')} /><Text style={{ fontSize: 24, fontWeight: '900', color: C.text }}>{f.title}</Text><Pill text={`score ${ideaScore(f).toFixed(1)}`} color={C.blue} /></Row>
        <Columns
          left={(
            <Box title="Idea">
              <Field label="Title" value={f.title} onChange={set('title')} />
              <Field label="Problem it solves" value={f.problem} onChange={set('problem')} multiline lines={2} />
              <Field label="Who has the problem" value={f.who} onChange={set('who')} />
              <Field label="Assumptions (not evidence)" value={f.assumptions} onChange={set('assumptions')} multiline lines={2} />
              <Field label="Proposed change" value={f.change} onChange={set('change')} multiline lines={3} />
              <Field label="Expected benefit" value={f.benefit} onChange={set('benefit')} multiline lines={2} />
              <Field label="Dependencies" value={f.dependencies} onChange={set('dependencies')} multiline lines={2} />
              <Field label="Success criterion (measurable)" value={f.success} onChange={set('success')} multiline lines={2} />
              <Field label="Next action" value={f.nextAction} onChange={set('nextAction')} />
              <Strong>Effort</Strong>
              <Chips options={['S', 'M', 'L'] as const} value={f.effort} onChange={set('effort')} />
              <Strong>Player value</Strong>
              <Chips options={SCORES} value={String(f.value) as (typeof SCORES)[number]} onChange={(v) => set('value')(Number(v))} />
              <Strong>Shareability</Strong>
              <Chips options={SCORES} value={String(f.shareability) as (typeof SCORES)[number]} onChange={(v) => set('shareability')(Number(v))} />
              <Strong>Status</Strong>
              <Chips options={IDEA_STATUSES} value={f.status} onChange={set('status')} />
              <Row>
                <Small label="Save idea" tone="primary" onPress={() => void commit((d) => { const i = d.ideas.findIndex((x) => x.id === f.id); d.ideas[i] = f; })} testID="idea-save" />
                <Small label={sure ? 'Press again to delete' : 'Delete idea'} tone="danger" onPress={async () => { if (!sure) return setSure(true); if (await commit((d) => { d.ideas = d.ideas.filter((x) => x.id !== f.id); })) router.replace('/admin'); }} />
              </Row>
            </Box>
          )}
          right={(
            <Box title={`Evidence (${f.evidence.length} linked)`}>
              <Muted>Tap to link or unlink. Add new evidence in the Ideas tab&apos;s evidence log.</Muted>
              {db.evidence.length === 0 && <Muted>No evidence recorded yet.</Muted>}
              {db.evidence.map((e) => (
                <View key={e.id} style={{ gap: 2, paddingVertical: 6, borderTopWidth: 1, borderColor: C.line, opacity: f.evidence.includes(e.id) ? 1 : 0.55 }}>
                  <Row><Small label={f.evidence.includes(e.id) ? 'Linked' : 'Link'} tone={f.evidence.includes(e.id) ? 'primary' : 'plain'} onPress={() => toggle(e.id)} /><Pill text={e.kind} /><Muted>{e.at.slice(0, 10)} · {e.source}</Muted></Row>
                  <Body>{e.text}</Body>
                </View>
              ))}
            </Box>
          )}
        />
      </View>
    </Screen>
  );
}
