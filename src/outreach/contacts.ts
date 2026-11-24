/** Contact dedupe and CSV import/export. Imports never invent fields and never keep an email without a source. */
import { blankContact, CATEGORIES, STATUSES, type Category, type Contact, type Status } from './types';

export const normEmail = (e: string) => e.trim().toLowerCase();

/** Profile URLs compare by host (no www, no protocol) + path (no trailing slash), case-insensitive; query kept only for ?v=/?list=. */
export function normUrl(u: string): string {
  const s = u.trim();
  if (!s) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    const host = url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
    const path = url.pathname.replace(/\/+$/, '').toLowerCase();
    const keep = ['v', 'list'].filter((k) => url.searchParams.has(k)).map((k) => `${k}=${url.searchParams.get(k)}`).join('&');
    return `${host}${path}${keep ? `?${keep}` : ''}`;
  } catch {
    return s.toLowerCase();
  }
}

export const looksLikeEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e.trim());

/** The existing contact this one duplicates (same email or same profile URL), if any. */
export function findDuplicate(list: Contact[], c: Pick<Contact, 'email' | 'profileUrl' | 'id'>): Contact | undefined {
  const e = normEmail(c.email);
  const u = normUrl(c.profileUrl);
  return list.find((x) => x.id !== c.id && ((e && normEmail(x.email) === e) || (u && normUrl(x.profileUrl) === u)));
}

// ---- CSV ----

export const CSV_COLUMNS = [
  'name', 'channel', 'platform', 'profile_url', 'email', 'email_source_url', 'email_checked_on', 'source_url', 'checked_on',
  'category', 'content_example', 'content_source_url', 'fit', 'angle', 'status', 'notes', 'last_contact', 'next_action', 'next_action_on',
] as const;

/** RFC 4180 parsing: quoted fields, doubled quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"' && s[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') q = false; else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

const cell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toCsv(list: Contact[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const c of list) {
    const v: Record<(typeof CSV_COLUMNS)[number], string> = {
      name: c.name, channel: c.channel, platform: c.platform, profile_url: c.profileUrl, email: c.email,
      email_source_url: c.emailSource.url, email_checked_on: c.emailSource.checkedOn, source_url: c.source.url, checked_on: c.source.checkedOn,
      category: c.category, content_example: c.contentExample, content_source_url: c.contentSource, fit: c.fit, angle: c.angle,
      status: c.status, notes: c.notes, last_contact: c.lastContact, next_action: c.nextAction, next_action_on: c.nextActionOn,
    };
    lines.push(CSV_COLUMNS.map((k) => cell(v[k] ?? '')).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export interface ImportResult {
  contacts: Contact[];
  added: number;
  merged: number;
  skipped: { row: number; reason: string }[];
  warnings: { row: number; message: string }[];
}

const fill = (a: string, b: string) => (a.trim() ? a : b.trim());

/**
 * Merge CSV rows into `existing`. Duplicates (same email or profile URL, in the list or earlier in the file)
 * fill empty fields only; they never overwrite what's there. An email without a public source URL is not
 * stored as the contact's email (it goes to notes as unverified).
 */
export function importCsv(existing: Contact[], text: string, now = new Date()): ImportResult {
  const rows = parseCsv(text);
  const out = existing.map((c) => ({ ...c }));
  const res: ImportResult = { contacts: out, added: 0, merged: 0, skipped: [], warnings: [] };
  if (!rows.length) return res;
  const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  if (!header.includes('name')) {
    res.skipped.push({ row: 1, reason: 'No header row with a "name" column.' });
    return res;
  }
  const col = (r: string[], k: string) => (header.indexOf(k) >= 0 ? (r[header.indexOf(k)] ?? '').trim() : '');
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const rowNo = i + 1;
    const name = col(r, 'name');
    if (!name) { res.skipped.push({ row: rowNo, reason: 'Missing name.' }); continue; }
    let email = col(r, 'email');
    const emailSrc = col(r, 'email_source_url');
    let notes = col(r, 'notes');
    if (email && (!looksLikeEmail(email) || !emailSrc)) {
      res.warnings.push({ row: rowNo, message: `${name}: email "${email}" ${!looksLikeEmail(email) ? 'is not a valid address' : 'has no public source URL'}, so it was left out (kept in notes as unverified).` });
      notes = [notes, `Unverified email from import: ${email}`].filter(Boolean).join('\n');
      email = '';
    }
    const cat = col(r, 'category');
    const status = col(r, 'status');
    const c = blankContact({
      name, channel: col(r, 'channel'), platform: col(r, 'platform'), profileUrl: col(r, 'profile_url'), email,
      emailSource: { url: email ? emailSrc : '', checkedOn: email ? col(r, 'email_checked_on') : '' },
      source: { url: col(r, 'source_url'), checkedOn: col(r, 'checked_on') },
      category: (CATEGORIES as readonly string[]).includes(cat) ? (cat as Category) : '',
      contentExample: col(r, 'content_example'), contentSource: col(r, 'content_source_url'), fit: col(r, 'fit'), angle: col(r, 'angle'),
      status: (STATUSES as readonly string[]).includes(status) ? (status as Status) : 'Researching',
      notes, lastContact: col(r, 'last_contact'), nextAction: col(r, 'next_action'), nextActionOn: col(r, 'next_action_on'),
      createdAt: now.toISOString(), updatedAt: now.toISOString(),
    });
    if (cat && !c.category) res.warnings.push({ row: rowNo, message: `${name}: unknown category "${cat}" left blank.` });
    if (status && status !== c.status) res.warnings.push({ row: rowNo, message: `${name}: unknown status "${status}", set to Researching.` });
    const dup = findDuplicate(out, c);
    if (dup) {
      for (const k of ['channel', 'platform', 'profileUrl', 'email', 'contentExample', 'contentSource', 'fit', 'angle', 'notes', 'nextAction', 'nextActionOn', 'lastContact'] as const) {
        dup[k] = fill(dup[k], c[k]);
      }
      if (!dup.emailSource.url && dup.email === c.email) dup.emailSource = c.emailSource;
      if (!dup.source.url) dup.source = c.source;
      if (!dup.category) dup.category = c.category;
      dup.updatedAt = now.toISOString();
      res.merged++;
    } else {
      out.push(c);
      res.added++;
    }
  }
  return res;
}
