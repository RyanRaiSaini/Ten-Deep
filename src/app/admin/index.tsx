/**
 * Private creator-outreach workspace. Not linked from the game; every byte of data comes from the server
 * only after the admin key is accepted. Nothing here sends email or messages.
 */
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Screen } from '../../ui/components';
import { copyText } from '../../ui/share';
import { C, S } from '../../ui/theme';
import { Text } from '../../ui/Text';
import { ideaScore, STARTER_EVIDENCE, STARTER_IDEAS } from '../../outreach/backlog';
import { importCsv, toCsv, type ImportResult } from '../../outreach/contacts';
import { campaignCodes, emailMetrics, funnel, rate, sumCounts } from '../../outreach/metrics';
import { suggestions } from '../../outreach/replies';
import { useAdmin } from '../../outreach/store';
import { blankContact, EVIDENCE_KINDS, IDEA_STATUSES, newId, randomCode, STATUSES, today, type Campaign, type Db, type EvidenceKind, type Status } from '../../outreach/types';
import { landingUrl } from '../../outreach/links';
import { a, Body, Box, Chips, download, Field, Muted, pickTextFile, Pill, Row, Small, Strong } from '../../outreach/ui';

const TABS = ['Contacts', 'Campaigns', 'Follow-ups', 'Ideas', 'Report', 'Setup'] as const;
type Tab = (typeof TABS)[number];

export default function Admin() {
  const { key, db, error, busy, load } = useAdmin();
  const hydrated = useAdmin.persist.hasHydrated();
  const [tab, setTab] = useState<Tab>('Contacts');
  useEffect(() => { if (key && !db) void load(); }, [key, db, load]);

  if (!hydrated) return <Screen wide><Muted>Loading…</Muted></Screen>;
  if (!key || (!db && error)) return <Gate />;
  return (
    <Screen wide>
      <View style={{ gap: S.md, paddingTop: S.lg }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: C.text }}>Creator outreach</Text>
          <Muted>{busy ? 'Saving…' : db?.updatedAt ? `Saved ${db.updatedAt.slice(0, 16).replace('T', ' ')} UTC` : 'Nothing saved yet'}</Muted>
        </Row>
        <Muted>Private workspace. Drafts are for you to review and send yourself; nothing here sends messages.</Muted>
        {error ? <Text style={{ color: C.danger, fontWeight: '800' }} testID="admin-error">{error}</Text> : null}
        <Chips options={TABS} value={tab} onChange={setTab} testID="admin-tabs" />
        {db && tab === 'Contacts' && <Contacts db={db} />}
        {db && tab === 'Campaigns' && <Campaigns db={db} />}
        {db && tab === 'Follow-ups' && <FollowUps db={db} />}
        {db && tab === 'Ideas' && <Ideas db={db} />}
        {db && tab === 'Report' && <Report db={db} />}
        {db && tab === 'Setup' && <Setup db={db} />}
      </View>
    </Screen>
  );
}

function Gate() {
  const { setKey, load, error, key } = useAdmin();
  const [v, setV] = useState('');
  return (
    <Screen>
      <View style={{ gap: S.md, paddingTop: S.xxl }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: C.text }}>Admin</Text>
        <Muted>Enter the admin key (the ADMIN_KEY value from the Vercel project settings). It stays on this device.</Muted>
        <Field label="Admin key" value={v} onChange={setV} testID="admin-key" />
        {error && key ? <Text style={{ color: C.danger, fontWeight: '800' }} testID="admin-error">{error}</Text> : null}
        <Small label="Unlock" tone="primary" onPress={() => { setKey(v); setTimeout(() => void useAdmin.getState().load(), 0); }} disabled={v.trim().length < 8} testID="admin-unlock" />
        {key ? <Small label="Forget saved key" onPress={() => { useAdmin.getState().signOut(); void load(); }} /> : null}
      </View>
    </Screen>
  );
}

// ---------- Contacts ----------

function Contacts({ db }: { db: Db }) {
  const commit = useAdmin((s) => s.commit);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Status | 'All'>('All');
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const shown = useMemo(() => db.contacts
    .filter((c) => filter === 'All' || c.status === filter)
    .filter((c) => !q || `${c.name} ${c.channel} ${c.platform} ${c.category}`.toLowerCase().includes(q.toLowerCase()))
    .sort((x, y) => x.name.localeCompare(y.name)), [db.contacts, filter, q]);

  const add = async () => {
    const c = blankContact({ name: 'New contact' });
    if (await commit((d) => { d.contacts.push(c); })) router.push({ pathname: '/admin/contact/[id]', params: { id: c.id } });
  };
  const runImport = async (text: string) => {
    const r = importCsv(db.contacts, text);
    setResult(r);
    if (r.added || r.merged) await commit((d) => { d.contacts = r.contacts; });
  };

  return (
    <View style={{ gap: S.md }}>
      <Row>
        <Small label="New contact" tone="primary" onPress={add} testID="contact-new" />
        <Small label="Export CSV" onPress={() => { const t = toCsv(db.contacts); if (!download(`ten-deep-contacts-${today()}.csv`, t)) void copyText(t); }} testID="contact-export" />
        <Small label="Import CSV file" onPress={async () => { const t = await pickTextFile(); if (t) await runImport(t); }} />
      </Row>
      <Field label="Search" value={q} onChange={setQ} placeholder="Name, channel, platform" />
      <Chips options={['All', ...STATUSES] as const} value={filter} onChange={(v) => setFilter(v as Status | 'All')} />
      <Box title={`Contacts (${shown.length})`}>
        {shown.length === 0 && <Muted>No contacts yet. Add one, or import a CSV below. Only add people after checking their public profiles.</Muted>}
        {shown.map((c) => (
          <View key={c.id} style={{ gap: 2, paddingVertical: 6, borderTopWidth: 1, borderColor: C.line }} testID="contact-row">
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={a.strong} onPress={() => router.push({ pathname: '/admin/contact/[id]', params: { id: c.id } })}>{c.name}</Text>
              <Pill text={c.status} />
            </Row>
            <Muted>{[c.channel, c.platform, c.category].filter(Boolean).join(' · ') || 'No channel yet'} · {c.email ? 'business email verified' : 'no verified email'}{c.source.checkedOn ? ` · checked ${c.source.checkedOn}` : ' · not checked'}</Muted>
            {c.nextAction ? <Muted>Next: {c.nextAction}{c.nextActionOn ? ` (${c.nextActionOn})` : ''}</Muted> : null}
          </View>
        ))}
      </Box>
      <Box title="Import CSV">
        <Muted>Columns: name, channel, platform, profile_url, email, email_source_url, email_checked_on, source_url, checked_on, category, content_example, content_source_url, fit, angle, status, notes, last_contact, next_action, next_action_on. Rows that match an existing contact by email or profile URL only fill empty fields. An email without a source URL is not saved as an email.</Muted>
        <Field label="Paste CSV" value={csv} onChange={setCsv} multiline lines={5} testID="csv-input" />
        <Small label="Import pasted CSV" onPress={() => void runImport(csv)} disabled={!csv.trim()} testID="csv-import" />
        {result && (
          <View style={{ gap: 2 }} testID="csv-result">
            <Body>{result.added} added, {result.merged} matched existing contacts, {result.skipped.length} skipped.</Body>
            {[...result.skipped.map((s) => `Row ${s.row}: ${s.reason}`), ...result.warnings.map((w) => `Row ${w.row}: ${w.message}`)].map((m, i) => <Muted key={i}>{m}</Muted>)}
          </View>
        )}
      </Box>
    </View>
  );
}

// ---------- Campaigns ----------

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 16) || 'campaign';

function Campaigns({ db }: { db: Db }) {
  const commit = useAdmin((s) => s.commit);
  const [name, setName] = useState('');
  const add = async () => {
    const c: Campaign = {
      id: newId('k_'), name: name.trim(), purpose: '', audience: '', invitation: '', landing: '/', success: '',
      code: `${slug(name)}-${randomCode(4)}`, status: 'planning', createdAt: new Date().toISOString(),
    };
    if (await commit((d) => { d.campaigns.push(c); })) { setName(''); router.push({ pathname: '/admin/campaign/[id]', params: { id: c.id } }); }
  };
  return (
    <View style={{ gap: S.md }}>
      <Box title="New campaign">
        <Muted>Keep each campaign small and specific (for example, five basketball gaming creators trying one draft).</Muted>
        <Field label="Name" value={name} onChange={setName} placeholder="Early feedback from basketball creators" testID="campaign-name" />
        <Small label="Create" tone="primary" onPress={add} disabled={!name.trim()} testID="campaign-create" />
      </Box>
      {db.campaigns.map((c) => {
        const m = emailMetrics(db, c.id);
        const drafts = db.drafts.filter((d) => d.campaignId === c.id);
        return (
          <Box key={c.id} title={c.name} right={<Pill text={c.status} color={c.status === 'active' ? C.neon : C.muted} />}>
            <Body>{c.purpose || 'No purpose written yet.'}</Body>
            <Muted>{m.contacts} contacts · {drafts.filter((d) => d.state === 'draft').length} unsent drafts · {m.messaged} messaged · {m.replied} replied</Muted>
            <Small label="Open" onPress={() => router.push({ pathname: '/admin/campaign/[id]', params: { id: c.id } })} testID="campaign-open" />
          </Box>
        );
      })}
    </View>
  );
}

// ---------- Follow-ups ----------

function FollowUps({ db }: { db: Db }) {
  const list = suggestions(db.contacts, db.messages, today(), db.settings.followUpDays);
  const name = (id: string) => db.contacts.find((c) => c.id === id)?.name ?? 'Unknown';
  return (
    <Box title="Needs attention">
      <Muted>Private reminders. They never send anything. People who declined or asked not to be contacted never appear; people waiting on your answer show as &quot;reply needed&quot;, not as a follow-up.</Muted>
      {list.length === 0 && <Muted>Nothing due.</Muted>}
      {list.map((s, i) => (
        <View key={i} style={{ paddingVertical: 6, borderTopWidth: 1, borderColor: C.line, gap: 2 }} testID="followup-row">
          <Row><Pill text={s.kind === 'reply-needed' ? 'Reply needed' : s.kind === 'follow-up' ? 'Follow-up' : 'Reminder'} color={s.kind === 'reply-needed' ? C.danger : C.blue} /><Strong>{name(s.contactId)}</Strong><Muted>due {s.due}</Muted></Row>
          <Muted>{s.reason}</Muted>
          <Small label="Open contact" onPress={() => router.push({ pathname: '/admin/contact/[id]', params: { id: s.contactId } })} />
        </View>
      ))}
    </Box>
  );
}

// ---------- Ideas and evidence ----------

function Ideas({ db }: { db: Db }) {
  const commit = useAdmin((s) => s.commit);
  const [kind, setKind] = useState<EvidenceKind>('feedback');
  const [text, setText] = useState('');
  const [source, setSource] = useState('');
  const ranked = [...db.ideas].sort((x, y) => IDEA_STATUSES.indexOf(x.status) - IDEA_STATUSES.indexOf(y.status) || ideaScore(y) - ideaScore(x));
  const newIdea = async () => {
    const id = newId('idea_');
    if (await commit((d) => { d.ideas.push({ id, title: 'New idea', problem: '', who: '', evidence: [], assumptions: '', change: '', benefit: '', effort: 'M', dependencies: '', success: '', status: 'Candidate', nextAction: '', value: 3, shareability: 3, createdAt: new Date().toISOString() }); })) {
      router.push({ pathname: '/admin/idea/[id]', params: { id } });
    }
  };
  const loadStarter = () => commit((d) => {
    for (const e of STARTER_EVIDENCE) if (!d.evidence.some((x) => x.id === e.id)) d.evidence.push(e);
    for (const i of STARTER_IDEAS) if (!d.ideas.some((x) => x.id === i.id)) d.ideas.push(i);
  });
  return (
    <View style={{ gap: S.md }}>
      <Row>
        <Small label="New idea" tone="primary" onPress={newIdea} />
        {!STARTER_IDEAS.every((i) => db.ideas.some((x) => x.id === i.id)) && <Small label="Load the audit backlog" onPress={() => void loadStarter()} testID="ideas-starter" />}
      </Row>
      <Box title="Ideas, ranked">
        <Muted>Score = (player value + shareability) / effort (S 1, M 2, L 3). Evidence is what actually happened; assumptions are kept separate.</Muted>
        {ranked.length === 0 && <Muted>No ideas yet.</Muted>}
        {ranked.map((i) => (
          <View key={i.id} style={{ paddingVertical: 6, borderTopWidth: 1, borderColor: C.line, gap: 2 }} testID="idea-row">
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={a.strong} onPress={() => router.push({ pathname: '/admin/idea/[id]', params: { id: i.id } })}>{i.title}</Text>
              <Row><Pill text={i.status} color={i.status === 'Next' || i.status === 'Building' ? C.blue : C.muted} /><Muted>score {ideaScore(i).toFixed(1)} · effort {i.effort}</Muted></Row>
            </Row>
            <Muted>{i.problem}</Muted>
            <Muted>{i.evidence.length ? `${i.evidence.length} evidence item${i.evidence.length > 1 ? 's' : ''}` : 'No evidence yet (assumption only)'}</Muted>
          </View>
        ))}
      </Box>
      <Box title="Evidence log">
        <Muted>Feedback, bugs, observations and numbers that really happened. Paste exact words where you can.</Muted>
        <Chips options={EVIDENCE_KINDS} value={kind} onChange={setKind} />
        <Field label="What happened" value={text} onChange={setText} multiline lines={3} testID="evidence-text" />
        <Field label="Source" value={source} onChange={setSource} placeholder="Contact name, playtest, URL" />
        <Small label="Add evidence" onPress={async () => { if (await commit((d) => { d.evidence.push({ id: newId('ev_'), kind, text: text.trim(), source: source.trim(), contactId: '', at: new Date().toISOString() }); })) { setText(''); setSource(''); } }} disabled={!text.trim()} testID="evidence-add" />
        {[...db.evidence].sort((x, y) => y.at.localeCompare(x.at)).map((e) => (
          <View key={e.id} style={{ paddingVertical: 4, borderTopWidth: 1, borderColor: C.line }}>
            <Row><Pill text={e.kind} /><Muted>{e.at.slice(0, 10)} · {e.source || 'no source'}</Muted></Row>
            <Body>{e.text}</Body>
          </View>
        ))}
      </Box>
    </View>
  );
}

// ---------- Report ----------

function Report({ db }: { db: Db }) {
  const { report, loadReport } = useAdmin();
  useEffect(() => { if (!report) void loadReport(); }, [report, loadReport]);
  const all = emailMetrics(db);
  return (
    <View style={{ gap: S.md }}>
      <Row><Small label="Refresh website numbers" onPress={() => void loadReport()} /><Muted>{report ? `Website events as of ${report.at.slice(0, 16).replace('T', ' ')} UTC` : 'Loading…'}</Muted></Row>
      {report?.truncated && <Text style={{ color: C.danger }}>Event list was cut off at the page limit; website numbers below are a floor.</Text>}
      <Box title="All contacts: messages">
        <MetricLines lines={[
          rate(all.replied, all.messaged, 'people replied', 'people messaged'),
          rate(all.tried, all.contacts, 'tried the game (status)', 'contacts'),
          `${all.messagesSent} messages marked sent · ${all.draftsReady} unsent drafts`,
          'Email opens: unknown (not tracked).',
        ]} />
      </Box>
      {db.campaigns.map((c) => {
        const m = emailMetrics(db, c.id);
        const codes = campaignCodes(db, c.id);
        const web = report ? sumCounts(report.byCode, codes) : null;
        return (
          <Box key={c.id} title={c.name}>
            <Strong>Messages (logged by you)</Strong>
            <MetricLines lines={[
              rate(m.messaged, m.contacts, 'people messaged', 'contacts in campaign'),
              rate(m.replied, m.messaged, 'replied', 'messaged'),
              rate(m.interested, m.messaged, 'interested or further', 'messaged'),
              rate(m.sharedContent, m.messaged, 'shared content', 'messaged'),
              `${m.declined} declined or asked not to be contacted`,
            ]} />
            <Strong>Website (recorded campaign-link visitors)</Strong>
            {web ? <MetricLines lines={[`${web.visit ?? 0} campaign visitors`, ...funnel(web).map((f) => `${f.label}: ${f.text}`)]} /> : <Muted>Loading…</Muted>}
            <Muted>Which person caused a visit is only known for visitors who used that person&apos;s own link; the general campaign link is not attributed to anyone.</Muted>
          </Box>
        );
      })}
    </View>
  );
}

const MetricLines = ({ lines }: { lines: string[] }) => <View style={{ gap: 2 }} testID="metric-lines">{lines.map((l, i) => <Body key={i}>{l}</Body>)}</View>;

// ---------- Setup ----------

function Setup({ db }: { db: Db }) {
  const { status, commit, signOut } = useAdmin();
  const [intro, setIntro] = useState(db.settings.ownerIntro);
  const [days, setDays] = useState(String(db.settings.followUpDays));
  return (
    <View style={{ gap: S.md }}>
      <Box title="Integrations">
        <Body>Storage (private Vercel Blob): {status?.storage ? 'connected' : 'not connected'}</Body>
        <Body>AI drafting (Vercel AI Gateway): {status?.ai.configured ? `ready, model ${status.ai.model}` : 'not configured: set AI_GATEWAY_MODEL in the Vercel project settings'}</Body>
        <Body>Email: not connected. {status?.gmail.note}</Body>
      </Box>
      <Box title="Your voice">
        <Field label="How you introduce yourself" value={intro} onChange={setIntro} multiline lines={2} hint="Used in AI drafts for this campaign only. Your internship networking material is not used here." />
        <Field label="Suggest a follow-up after this many days without a reply" value={days} onChange={setDays} />
        <Small label="Save" tone="primary" onPress={() => void commit((d) => { d.settings.ownerIntro = intro.trim(); d.settings.followUpDays = Math.max(3, Math.min(30, Number(days) || 7)); })} />
      </Box>
      <Box title="Campaign links">
        {db.campaigns.map((c) => <Muted key={c.id}>{c.name}: {landingUrl(c.landing, c.code)}</Muted>)}
        <Muted>Links carry a random code only. Visitors are counted once per device per milestone.</Muted>
      </Box>
      <Small label="Sign out on this device" tone="danger" onPress={signOut} />
    </View>
  );
}
