/** One campaign: purpose, invitation, links, its contacts and their drafts, and repeated wording across drafts. */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Screen } from '../../../ui/components';
import { copyText } from '../../../ui/share';
import { C, S } from '../../../ui/theme';
import { Text } from '../../../ui/Text';
import { landingUrl } from '../../../outreach/links';
import { repeatedPhrases, sameOpeners } from '../../../outreach/repetition';
import { useAdmin } from '../../../outreach/store';
import { randomCode, type Campaign } from '../../../outreach/types';
import { a, Body, Box, Chips, Columns, Field, Muted, Pill, Row, Small, Strong } from '../../../outreach/ui';

const STATES = ['planning', 'active', 'paused', 'done'] as const;

export default function CampaignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, commit, error } = useAdmin();
  const campaign = db?.campaigns.find((c) => c.id === id);
  const [f, setF] = useState<Campaign | null>(campaign ?? null);
  const [sure, setSure] = useState(false);
  if (!db || !campaign || !f) {
    return <Screen><View style={{ paddingTop: S.xl, gap: S.md }}><Muted>{db ? 'Campaign not found.' : 'Open the admin first.'}</Muted><Small label="Back to admin" onPress={() => router.replace('/admin')} /></View></Screen>;
  }
  const set = <K extends keyof Campaign>(k: K) => (v: Campaign[K]) => setF({ ...f, [k]: v });
  const members = db.contacts.filter((c) => c.campaignIds.includes(campaign.id));
  const others = db.contacts.filter((c) => !c.campaignIds.includes(campaign.id) && c.status !== 'Do not contact');
  const drafts = db.drafts.filter((d) => d.campaignId === campaign.id && d.text.trim());
  const names = db.contacts.map((c) => c.name);
  const repeats = repeatedPhrases(drafts, names);
  const openers = sameOpeners(drafts, names);
  const who = (draftId: string) => db.contacts.find((c) => c.id === drafts.find((d) => d.id === draftId)?.contactId)?.name ?? '?';
  const link = landingUrl(campaign.landing, campaign.code);

  return (
    <Screen wide>
      <View style={{ gap: S.md, paddingTop: S.lg }}>
        <Row><Small label="← Admin" onPress={() => router.replace('/admin')} /><Text style={{ fontSize: 24, fontWeight: '900', color: C.text }}>{campaign.name}</Text><Pill text={campaign.status} color={campaign.status === 'active' ? C.neon : C.muted} /></Row>
        {error ? <Text style={{ color: C.danger, fontWeight: '800' }}>{error}</Text> : null}
        <Columns
          left={(
            <Box title="Campaign">
              <Field label="Name" value={f.name} onChange={set('name')} />
              <Field label="Purpose" value={f.purpose} onChange={set('purpose')} multiline lines={2} placeholder="Early feedback from five basketball gaming creators" />
              <Field label="Intended audience" value={f.audience} onChange={set('audience')} multiline lines={2} />
              <Field label="The specific invitation" value={f.invitation} onChange={set('invitation')} multiline lines={2} placeholder="Try one Current Day draft and tell me what felt off." hint="The AI uses this as the request. Keep it to one small ask." />
              <Field label="Landing path" value={f.landing} onChange={set('landing')} hint="Path on the game site, e.g. / or /c?s=...&p=current-2026&w=55&l=27&n=Ryan (a challenge link)." />
              <Field label="Success measure" value={f.success} onChange={set('success')} multiline lines={2} placeholder="3 of 5 reply; 2 complete a draft through their link" />
              <Chips options={STATES} value={f.status} onChange={set('status')} />
              <Row>
                <Small label="Save campaign" tone="primary" onPress={() => void commit((d) => { const i = d.campaigns.findIndex((c) => c.id === f.id); d.campaigns[i] = { ...f, landing: f.landing.trim() || '/' }; })} testID="campaign-save" />
                <Small label={sure ? 'Press again to delete' : 'Delete campaign'} tone="danger" onPress={async () => {
                  if (!sure) return setSure(true);
                  if (await commit((d) => { d.campaigns = d.campaigns.filter((c) => c.id !== f.id); for (const c of d.contacts) { c.campaignIds = c.campaignIds.filter((k) => k !== f.id); delete c.links[f.id]; } })) router.replace('/admin');
                }} />
              </Row>
              <Strong>General link (not tied to a person)</Strong>
              <Row><Body>{link}</Body><Small label="Copy" onPress={() => void copyText(link)} /></Row>
            </Box>
          )}
          right={(
            <>
              <Box title={`Contacts (${members.length})`}>
                <Muted>Small and well researched beats a long list. Each person gets their own link code, so a visit through it can be tied to them.</Muted>
                {members.map((c) => {
                  const ds = db.drafts.filter((d) => d.contactId === c.id && d.campaignId === campaign.id);
                  const personal = c.links[campaign.id] ? landingUrl(campaign.landing, c.links[campaign.id]) : '';
                  return (
                    <View key={c.id} style={{ paddingVertical: 6, borderTopWidth: 1, borderColor: C.line, gap: 2 }}>
                      <Row style={{ justifyContent: 'space-between' }}>
                        <Text style={a.strong} onPress={() => router.push({ pathname: '/admin/contact/[id]', params: { id: c.id } })}>{c.name}</Text>
                        <Pill text={c.status} />
                      </Row>
                      <Muted>{ds.length ? ds.map((d) => `${d.kind} ${d.state}`).join(', ') : 'No draft yet'}{c.email ? '' : ' · no verified email'}</Muted>
                      {personal ? <Muted>{personal}</Muted> : null}
                    </View>
                  );
                })}
                {others.length > 0 && (
                  <>
                    <Strong>Add a contact</Strong>
                    <Chips options={others.map((c) => c.name)} value={[]} onChange={(n) => void commit((d) => {
                      const c = d.contacts.find((x) => x.name === n && !x.campaignIds.includes(campaign.id));
                      if (!c) return;
                      c.campaignIds.push(campaign.id);
                      c.links[campaign.id] = c.links[campaign.id] ?? `${campaign.code}-${randomCode(4)}`;
                      c.updatedAt = new Date().toISOString();
                    })} />
                  </>
                )}
              </Box>
              <Box title="Repeated wording across drafts">
                <Muted>Flags phrases several drafts share, for you to rewrite for each person. Nothing is changed automatically.</Muted>
                {repeats.length === 0 && openers.length === 0 && <Muted>{drafts.length < 2 ? 'Needs at least two drafts.' : 'No repeated phrases found.'}</Muted>}
                {openers.map((r, i) => <Body key={`o${i}`}>Same opening &quot;{r.phrase}…&quot;: {r.draftIds.map(who).join(', ')}</Body>)}
                {repeats.slice(0, 12).map((r, i) => <Body key={i}>&quot;{r.phrase}&quot;: {r.draftIds.map(who).join(', ')}</Body>)}
              </Box>
            </>
          )}
        />
      </View>
    </Screen>
  );
}
