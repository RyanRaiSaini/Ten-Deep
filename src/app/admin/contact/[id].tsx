/** One contact: research (left), drafts and the conversation (right). Nothing here sends a message. */
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { Screen } from '../../../ui/components';
import { copyText } from '../../../ui/share';
import { C, S } from '../../../ui/theme';
import { Text } from '../../../ui/Text';
import { blocking, checkDraft, linksIn, unansweredInbound } from '../../../outreach/checks';
import { findDuplicate, looksLikeEmail } from '../../../outreach/contacts';
import { landingUrl } from '../../../outreach/links';
import type { Preset } from '../../../outreach/prompt';
import { intentsOf, suggestedStatus } from '../../../outreach/replies';
import { repeatedPhrases } from '../../../outreach/repetition';
import { useAdmin } from '../../../outreach/store';
import { CATEGORIES, newId, randomCode, STATUSES, today, type Category, type Contact, type Db, type Draft, type DraftKind, type Message, type Status } from '../../../outreach/types';
import { Body, Box, Checks, Chips, Columns, Field, Muted, Pill, Row, Small, Strong } from '../../../outreach/ui';

const BEFORE_CONTACT: Status[] = ['Researching', 'Ready to draft', 'Draft ready'];

export default function ContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useAdmin((s) => s.db);
  const error = useAdmin((s) => s.error);
  const contact = db?.contacts.find((c) => c.id === id);
  if (!db || !contact) {
    return <Screen><View style={{ paddingTop: S.xl, gap: S.md }}><Muted>{db ? 'Contact not found.' : 'Open the admin first.'}</Muted><Small label="Back to admin" onPress={() => router.replace('/admin')} /></View></Screen>;
  }
  return (
    <Screen wide>
      <View style={{ gap: S.md, paddingTop: S.lg }}>
        <Row><Small label="← Admin" onPress={() => router.replace('/admin')} /><Text style={{ fontSize: 24, fontWeight: '900', color: C.text }}>{contact.name}</Text><Pill text={contact.status} /></Row>
        {error ? <Text style={{ color: C.danger, fontWeight: '800' }} testID="admin-error">{error}</Text> : null}
        <Columns left={<Research key={contact.updatedAt} db={db} contact={contact} />} right={<><Drafts db={db} contact={contact} /><Conversation db={db} contact={contact} /></>} />
      </View>
    </Screen>
  );
}

// ---------- Research ----------

function Research({ db, contact }: { db: Db; contact: Contact }) {
  const commit = useAdmin((s) => s.commit);
  const [f, setF] = useState<Contact>(contact);
  const [msg, setMsg] = useState('');
  const [sureDelete, setSureDelete] = useState(false);
  const set = <K extends keyof Contact>(k: K) => (v: Contact[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = async () => {
    if (f.email && !looksLikeEmail(f.email)) return setMsg('That email address is not valid.');
    if (f.email && !f.emailSource.url.trim()) return setMsg('Add the public page where this email is listed, or leave the email empty. Unverified emails stay missing.');
    const dup = findDuplicate(db.contacts, f);
    if (dup) return setMsg(`Same email or profile URL as ${dup.name}. Edit that contact instead.`);
    setMsg('');
    await commit((d) => { const i = d.contacts.findIndex((c) => c.id === f.id); d.contacts[i] = { ...f, updatedAt: new Date().toISOString() }; });
  };
  const toggleCampaign = (name: string) => {
    const k = db.campaigns.find((c) => c.name === name);
    if (!k) return;
    setF((x) => {
      const on = x.campaignIds.includes(k.id);
      return {
        ...x,
        campaignIds: on ? x.campaignIds.filter((c) => c !== k.id) : [...x.campaignIds, k.id],
        links: on || x.links[k.id] ? x.links : { ...x.links, [k.id]: `${k.code}-${randomCode(4)}` },
      };
    });
  };
  return (
    <Box title="Research">
      <Muted>Record only what you verified, with where you found it. Leave anything unknown empty.</Muted>
      <Field label="Name" value={f.name} onChange={set('name')} testID="f-name" />
      <Field label="Channel / show / publication" value={f.channel} onChange={set('channel')} />
      <Field label="Platform" value={f.platform} onChange={set('platform')} placeholder="YouTube, Twitch, X, Substack, podcast" />
      <Field label="Public profile URL" value={f.profileUrl} onChange={set('profileUrl')} testID="f-profile" />
      <Field label="Where you found them (URL)" value={f.source.url} onChange={(v) => setF((x) => ({ ...x, source: { ...x.source, url: v } }))} />
      <Field label="Date checked" value={f.source.checkedOn} onChange={(v) => setF((x) => ({ ...x, source: { ...x.source, checkedOn: v } }))} placeholder={today()} />
      <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted }}>AUDIENCE</Text>
      <Chips options={CATEGORIES} value={f.category as Category} onChange={(v) => set('category')(v === f.category ? '' : v)} />
      <Field label="Public business email (only if published)" value={f.email} onChange={set('email')} testID="f-email" />
      <Field label="Where the email is published (URL)" value={f.emailSource.url} onChange={(v) => setF((x) => ({ ...x, emailSource: { ...x.emailSource, url: v } }))} testID="f-email-source" />
      <Field label="Email checked on" value={f.emailSource.checkedOn} onChange={(v) => setF((x) => ({ ...x, emailSource: { ...x.emailSource, checkedOn: v } }))} placeholder={today()} />
      <Field label="Relevant content example" value={f.contentExample} onChange={set('contentExample')} multiline lines={2} hint="A specific video, episode or article and what it's about. Not an opinion of it." />
      <Field label="Content URL" value={f.contentSource} onChange={set('contentSource')} />
      <Field label="Why Ten Deep could fit" value={f.fit} onChange={set('fit')} multiline lines={2} />
      <Field label="Challenge or conversation angle" value={f.angle} onChange={set('angle')} multiline lines={2} />
      <Field label="Documented personal connection" value={f.familiarity} onChange={set('familiarity')} multiline lines={2} hint="Leave empty unless it's true (for example, you really have watched their show). Drafts can't claim familiarity without it." />
      <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted }}>STATUS</Text>
      <Chips options={STATUSES} value={f.status} onChange={set('status')} testID="f-status" />
      <Text style={{ fontSize: 12, fontWeight: '800', color: C.muted }}>CAMPAIGNS</Text>
      {db.campaigns.length ? <Chips options={db.campaigns.map((c) => c.name)} value={db.campaigns.filter((c) => f.campaignIds.includes(c.id)).map((c) => c.name)} onChange={toggleCampaign} /> : <Muted>No campaigns yet.</Muted>}
      <Field label="Notes" value={f.notes} onChange={set('notes')} multiline lines={3} />
      <Field label="Last contact (YYYY-MM-DD)" value={f.lastContact} onChange={set('lastContact')} />
      <Field label="Next action" value={f.nextAction} onChange={set('nextAction')} />
      <Field label="Remind me on (YYYY-MM-DD)" value={f.nextActionOn} onChange={set('nextActionOn')} hint="A private reminder in Follow-ups. It never sends anything." />
      {msg ? <Text style={{ color: C.danger, fontWeight: '800' }} testID="research-msg">{msg}</Text> : null}
      <Row>
        <Small label="Save research" tone="primary" onPress={() => void save()} testID="research-save" />
        <Small label={sureDelete ? 'Press again to delete' : 'Delete contact'} tone="danger" onPress={async () => {
          if (!sureDelete) return setSureDelete(true);
          if (await commit((d) => { d.contacts = d.contacts.filter((c) => c.id !== f.id); d.drafts = d.drafts.filter((x) => x.contactId !== f.id); d.messages = d.messages.filter((m) => m.contactId !== f.id); })) router.replace('/admin');
        }} />
      </Row>
    </Box>
  );
}

// ---------- Drafts ----------

function Drafts({ db, contact }: { db: Db; contact: Contact }) {
  const commit = useAdmin((s) => s.commit);
  const mine = db.drafts.filter((d) => d.contactId === contact.id).sort((x, y) => y.updatedAt.localeCompare(x.updatedAt));
  const [open, setOpen] = useState<string | null>(mine.find((d) => d.state === 'draft')?.id ?? null);
  const thread = db.messages.filter((m) => m.contactId === contact.id);
  const waiting = unansweredInbound(thread);
  const closed = contact.status === 'Declined' || contact.status === 'Do not contact';
  const create = async (kind: DraftKind) => {
    const now = new Date().toISOString();
    const d: Draft = {
      id: newId('d_'), contactId: contact.id, campaignId: contact.campaignIds[0] ?? '', kind, subject: '', text: '',
      basis: { fact: kind === 'first' ? contact.contentExample : '', relevance: kind === 'first' ? contact.fit : '', ask: '' },
      versions: [], state: 'draft', sentAt: '', replyTo: kind === 'reply' ? waiting?.id ?? '' : '', createdAt: now, updatedAt: now,
    };
    if (await commit((x) => { x.drafts.push(d); })) setOpen(d.id);
  };
  const current = mine.find((d) => d.id === open);
  return (
    <Box title="Drafts">
      {closed ? <Text style={{ color: C.danger, fontWeight: '800' }}>{contact.name} is marked &quot;{contact.status}&quot;. No new drafts or follow-ups.</Text> : (
        <Row>
          <Small label="New first message" onPress={() => void create('first')} testID="draft-new-first" />
          <Small label="New follow-up" onPress={() => void create('follow-up')} disabled={!thread.some((m) => m.direction === 'out') || !!waiting} />
          <Small label={waiting ? 'Draft a reply to their message' : 'Reply (no message waiting)'} onPress={() => void create('reply')} disabled={!waiting} testID="draft-new-reply" />
        </Row>
      )}
      {waiting && !closed ? <Muted>They wrote last ({waiting.at.slice(0, 10)}). Answer them before asking for anything else; no follow-up is suggested while they wait.</Muted> : null}
      {mine.map((d) => (
        <Row key={d.id}>
          <Small label={`${d.kind === 'first' ? 'First message' : d.kind === 'reply' ? 'Reply' : 'Follow-up'} · ${d.state === 'sent' ? `sent ${d.sentAt.slice(0, 10)}` : `draft, ${d.versions.length} version${d.versions.length === 1 ? '' : 's'}`}`} onPress={() => setOpen(d.id)} tone={d.id === open ? 'primary' : 'plain'} />
        </Row>
      ))}
      {current && <Editor key={current.id + current.updatedAt} db={db} contact={contact} draft={current} />}
    </Box>
  );
}

function Editor({ db, contact, draft }: { db: Db; contact: Contact; draft: Draft }) {
  const { commit, generate, checkUrl, urlStatus } = useAdmin();
  const [subject, setSubject] = useState(draft.subject);
  const [text, setText] = useState(draft.text);
  const [basis, setBasis] = useState(draft.basis);
  const [campaignId, setCampaignId] = useState(draft.campaignId);
  const [instruction, setInstruction] = useState('');
  const [note, setNote] = useState('manual edit');
  const [info, setInfo] = useState('');
  const [confirm, setConfirm] = useState<'save' | 'sent' | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const sent = draft.state === 'sent';
  const campaign = db.campaigns.find((c) => c.id === campaignId) ?? null;
  const link = campaign ? landingUrl(campaign.landing, contact.links[campaign.id] ?? campaign.code) : landingUrl('/', '');
  const thread = db.messages.filter((m) => m.contactId === contact.id);
  const validCodes = contact.campaignIds.flatMap((k) => [db.campaigns.find((c) => c.id === k)?.code ?? '', contact.links[k] ?? '']).filter(Boolean);
  const checks = checkDraft({ draft: { kind: draft.kind, subject, text }, contact, otherNames: db.contacts.map((c) => c.name), thread, validCodes, today: today(), urlStatus });
  const repeats = useMemo(() => {
    const others = db.drafts.filter((d) => d.campaignId === campaignId && d.id !== draft.id && d.text.trim());
    return repeatedPhrases([...others, { id: draft.id, text }], db.contacts.map((c) => c.name)).filter((r) => r.draftIds.includes(draft.id));
  }, [db.drafts, db.contacts, campaignId, draft.id, text]);
  const dirty = subject !== draft.subject || text !== draft.text || campaignId !== draft.campaignId || JSON.stringify(basis) !== JSON.stringify(draft.basis);

  const save = async () => {
    if (blocking(checks) && confirm !== 'save') { setConfirm('save'); return; }
    setConfirm(null);
    await commit((d) => {
      const x = d.drafts.find((y) => y.id === draft.id)!;
      Object.assign(x, { subject, text, basis, campaignId, updatedAt: new Date().toISOString() });
      x.versions.push({ at: new Date().toISOString(), subject, text, note });
      const c = d.contacts.find((y) => y.id === contact.id)!;
      if (!blocking(checks) && ['Researching', 'Ready to draft'].includes(c.status) && draft.kind === 'first') { c.status = 'Draft ready'; c.updatedAt = new Date().toISOString(); }
    });
    setNote('manual edit');
  };

  const ai = async (preset?: Preset) => {
    setAiBusy(true); setInfo('');
    const r = await generate({ contactId: contact.id, kind: draft.kind, campaignId, preset, instruction: instruction.trim() || undefined, current: text.trim() ? { subject, text } : undefined });
    setAiBusy(false);
    if (r.draft) {
      setSubject(r.draft.subject || subject); setText(r.draft.text); setBasis(r.draft.basis);
      setNote(`AI: ${preset ?? (instruction.trim() ? `"${instruction.trim()}"` : text.trim() ? 'revise' : 'first draft')}`);
      setInfo('New AI version loaded. Read it, edit it, then save. It is not saved yet.');
    } else setInfo(r.error === 'ai-not-configured' ? `AI drafting is not connected: ${r.detail}` : `AI draft failed: ${r.detail ?? r.error}`);
  };

  const markSent = async () => {
    if (dirty) { setInfo('Save this version first, so the record matches what you sent.'); return; }
    if (blocking(checks) && confirm !== 'sent') { setConfirm('sent'); return; }
    setConfirm(null);
    const at = new Date().toISOString();
    await commit((d) => {
      const x = d.drafts.find((y) => y.id === draft.id)!;
      x.state = 'sent'; x.sentAt = at;
      d.messages.push({ id: newId('m_'), contactId: contact.id, direction: 'out', at, subject, body: text, channel: contact.email ? 'email' : 'dm' });
      const c = d.contacts.find((y) => y.id === contact.id)!;
      c.lastContact = at.slice(0, 10);
      if (BEFORE_CONTACT.includes(c.status) || c.status === 'Follow up later') c.status = 'Contacted';
      c.updatedAt = at;
    });
  };

  return (
    <View style={{ gap: S.sm, borderTopWidth: 2, borderColor: C.line, paddingTop: S.sm }} testID="draft-editor">
      <Box title="What this message is based on" style={{ backgroundColor: '#FFF9F0' }}>
        <Field label="Verified fact used" value={basis.fact} onChange={(v) => setBasis({ ...basis, fact: v })} multiline lines={2} />
        <Field label="Why it's relevant" value={basis.relevance} onChange={(v) => setBasis({ ...basis, relevance: v })} multiline lines={2} />
        <Field label="What it asks them to do" value={basis.ask} onChange={(v) => setBasis({ ...basis, ask: v })} />
        {contact.contentSource ? <Muted>Source: {contact.contentSource}</Muted> : <Muted>No content source recorded for this contact.</Muted>}
      </Box>
      {sent ? <Strong>Sent {draft.sentAt.slice(0, 10)} (marked by you). Read-only.</Strong> : null}
      {db.campaigns.length > 0 && !sent && <Chips options={db.campaigns.filter((c) => contact.campaignIds.includes(c.id)).map((c) => c.name)} value={campaign?.name ?? ''} onChange={(n) => setCampaignId(db.campaigns.find((c) => c.name === n)?.id ?? '')} />}
      <Muted>Link for this person: {link}</Muted>
      {draft.kind !== 'reply' && <Field label="Subject" value={subject} onChange={setSubject} testID="draft-subject" />}
      <Field label="Message" value={text} onChange={setText} multiline lines={10} testID="draft-text" />
      <Muted>{(text.match(/[A-Za-z0-9']+/g) ?? []).length} words</Muted>
      <Checks checks={checks} />
      {repeats.length > 0 && (
        <View style={{ gap: 2 }}>
          <Strong>Repeated in other drafts in this campaign</Strong>
          {repeats.slice(0, 5).map((r, i) => <Muted key={i}>&quot;{r.phrase}&quot; appears in {r.draftIds.length} drafts. Consider rewriting it in your own words for this person.</Muted>)}
        </View>
      )}
      {!sent && (
        <>
          <Row>
            <Small label="Insert link" onPress={() => setText((t) => (t.includes(link) ? t : `${t.trimEnd()}\n\n${link}`))} />
            <Small label="Check links" onPress={() => { for (const l of linksIn(text).filter((x) => x.startsWith('https://ten-deep.vercel.app'))) void checkUrl(l); }} testID="draft-check-links" />
          </Row>
          <Field label="Instruction for the AI (optional)" value={instruction} onChange={setInstruction} placeholder="e.g. mention the salary cap angle, drop the second sentence" />
          <Row>
            <Small label={aiBusy ? 'Working…' : text.trim() ? 'Regenerate' : 'Draft with AI'} onPress={() => void ai()} disabled={aiBusy} testID="draft-ai" />
            <Small label="Shorter" onPress={() => void ai('shorter')} disabled={aiBusy || !text.trim()} />
            <Small label="Warmer" onPress={() => void ai('warmer')} disabled={aiBusy || !text.trim()} />
            <Small label="More casual" onPress={() => void ai('casual')} disabled={aiBusy || !text.trim()} />
          </Row>
          <Row>
            <Small label={confirm === 'save' ? 'Save anyway (has problems)' : 'Save version'} tone="primary" onPress={() => void save()} disabled={!text.trim()} testID="draft-save" />
            <Small label="Copy message" onPress={async () => { if (await copyText(draft.kind === 'reply' || !subject ? text : `${subject}\n\n${text}`)) setInfo('Copied.'); }} />
            {contact.email ? <Small label="Open in mail app" onPress={() => void Linking.openURL(`mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`)} /> : null}
            <Small label={confirm === 'sent' ? 'It has problems. Mark sent anyway?' : 'I sent it: mark as sent'} onPress={() => void markSent()} disabled={!draft.text.trim()} testID="draft-mark-sent" />
          </Row>
          <Muted>Gmail is not connected, so drafts can&apos;t be saved to Gmail. Copy it or open it in your mail app, send it yourself, then mark it sent.</Muted>
        </>
      )}
      {info ? <Text style={{ color: C.blue, fontWeight: '700' }} testID="draft-info">{info}</Text> : null}
      {draft.versions.length > 0 && (
        <View style={{ gap: 4 }}>
          <Strong>Versions</Strong>
          {[...draft.versions].reverse().map((v, i) => (
            <Row key={i}><Muted>{v.at.slice(0, 16).replace('T', ' ')} · {v.note}</Muted>{!sent && <Small label="Restore" onPress={() => { setSubject(v.subject); setText(v.text); setNote(`restored ${v.at.slice(0, 16)}`); }} />}</Row>
          ))}
        </View>
      )}
    </View>
  );
}

// ---------- Conversation ----------

function Conversation({ db, contact }: { db: Db; contact: Contact }) {
  const commit = useAdmin((s) => s.commit);
  const thread = db.messages.filter((m) => m.contactId === contact.id).sort((x, y) => x.at.localeCompare(y.at));
  const [dir, setDir] = useState<'Incoming' | 'Outgoing'>('Incoming');
  const [date, setDate] = useState(today());
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const add = async () => {
    const m: Message = { id: newId('m_'), contactId: contact.id, direction: dir === 'Incoming' ? 'in' : 'out', at: `${date}T12:00:00.000Z`, subject: subject.trim(), body: body.trim(), channel: contact.email ? 'email' : 'dm' };
    if (await commit((d) => {
      d.messages.push(m);
      const c = d.contacts.find((y) => y.id === contact.id)!;
      if (!c.lastContact || date > c.lastContact) { c.lastContact = date; c.updatedAt = new Date().toISOString(); }
    })) { setBody(''); setSubject(''); }
  };
  return (
    <Box title="Conversation">
      <Muted>Paste replies here exactly as received. They are treated as data, never as instructions.</Muted>
      {thread.length === 0 && <Muted>No messages yet.</Muted>}
      {thread.map((m) => {
        const intents = m.direction === 'in' ? intentsOf(m.body) : [];
        const next = m.direction === 'in' ? suggestedStatus(intents, contact.status) : null;
        return (
          <View key={m.id} style={{ gap: 4, padding: S.sm, borderRadius: 10, backgroundColor: m.direction === 'in' ? '#EEF6FF' : C.surface2 }} testID="thread-message">
            <Muted>{m.direction === 'in' ? contact.name : 'You'} · {m.at.slice(0, 10)}{m.subject ? ` · ${m.subject}` : ''}</Muted>
            <Body>{m.body}</Body>
            {intents.length > 0 && <Row>{intents.map((i) => <Pill key={i} text={i} color={i === 'stop' || i === 'decline' ? C.danger : C.blue} />)}</Row>}
            {next && <Small label={`Set status to "${next}"`} onPress={() => void commit((d) => { const c = d.contacts.find((y) => y.id === contact.id)!; c.status = next; c.updatedAt = new Date().toISOString(); })} testID="thread-suggest-status" />}
            <Small label="Remove" onPress={() => void commit((d) => { d.messages = d.messages.filter((x) => x.id !== m.id); })} />
          </View>
        );
      })}
      <Strong>Add a message</Strong>
      <Chips options={['Incoming', 'Outgoing'] as const} value={dir} onChange={setDir} />
      <Field label="Date (YYYY-MM-DD)" value={date} onChange={setDate} />
      <Field label="Subject" value={subject} onChange={setSubject} />
      <Field label="Message" value={body} onChange={setBody} multiline lines={5} testID="thread-body" />
      <Small label="Add to conversation" onPress={() => void add()} disabled={!body.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)} testID="thread-add" />
    </Box>
  );
}
