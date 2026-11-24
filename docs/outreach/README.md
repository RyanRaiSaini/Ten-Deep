# Creator outreach workspace

A private admin at `/admin` for inviting basketball creators to try Ten Deep: contacts and research, personal drafts with checks, replies, campaigns, an idea board tied to evidence, and campaign-link measurement. **Nothing in it sends email or messages.** Drafts are for the owner to review, edit and send personally.

## Map

### The game (existing)

| Area | Where | Notes |
| --- | --- | --- |
| Screens | `src/app/` (Expo Router) | Home, draft, season, deadline, playoffs, result, challenge links (`/c`), daily, career, party, collection, friends |
| Engine | `src/engine/` | Seeded draft spins, real-contract salary cap ($200M), 82-game season, playoffs |
| Saved state | `src/store/` (zustand, on device) | Cloud backup via `api/save.ts` |
| Server | `api/*.ts` (Vercel Functions) | Private Vercel Blob storage, Runtime Cache for party rooms |

### The outreach workspace (new)

| Piece | Where | What it does |
| --- | --- | --- |
| Admin screens | `src/app/admin/` | Contacts, Campaigns, Follow-ups, Ideas, Report, Setup; one screen per contact, campaign and idea |
| Admin API | `api/admin.ts` | Load/save the workspace, AI drafts, website report, link checks. Requires `x-admin-key` = `ADMIN_KEY` |
| Tracking API | `api/track.ts` | Records anonymous campaign-link milestones (unique visitors) |
| Storage | `api/_outreachstore.ts` | `outreach/db.json` and `outreach/events/...` in the private Blob store |
| Rules and logic | `src/outreach/` | Data model, verified product facts, CSV/dedupe, draft checks, repetition, reply intents, follow-up rules, metrics, AI brief |
| Game hook | `src/net/campaign.ts` | Reads `?c=` on the web, records visit / return / draft started / draft completed / season simulated / shared |

```
Research a creator ──► Contact (verified fields + sources)
        │
        ▼
Campaign (purpose, invitation, landing link, success measure, per-person link code)
        │
        ▼
Draft (research shown beside it) ──► checks ──► save version ──► copy / open in mail app
        │                                                        │
        │                                        you send it yourself
        ▼                                                        ▼
Mark as sent ──► conversation log ──► paste their reply ──► intents + suggested status ──► reply draft
        │
        ▼
Follow-ups (private reminders)      Report (messages logged here | website events from ?c= links)
```

## Using it

1. **Unlock.** Open `https://ten-deep.vercel.app/admin`, enter the admin key. It's stored only on that device.
2. **Contacts.** Add one by hand, or import a CSV (columns listed in the tab). Matches by email or profile URL merge into the existing contact and only fill empty fields, so importing the same file twice adds nobody. An email without the public page it was found on (`email_source_url`) is never stored as an email; it goes to notes marked unverified.
3. **Research.** For each person, record what you checked: profile URL, where you found them and when, one specific piece of their content with its URL, why the game could fit, an angle, and a documented personal connection only if it's true.
4. **Campaigns.** Create a small campaign, write its purpose, the one invitation, the landing path (the home page or a challenge link) and the success measure. Adding a contact gives them their own link code, for example `https://ten-deep.vercel.app/?c=early-feedback-f-zqeg-u9py`. No names or emails go in links.
5. **Draft.** On the contact, "New first message", then write it yourself or press "Draft with AI". The research the message relies on (fact, why it's relevant, what it asks) sits above the text and is editable. Regenerate with an instruction, or make it shorter, warmer or more casual. Each save is a version you can restore.
6. **Checks** run as you type:
   - errors: closed contact, wrong recipient name, missing or foreign game link, a link code that isn't this person's, a dead link (after "Check links"), unsupported feature claims (`src/outreach/facts.ts`), invented familiarity, their unanswered question, a call suggested after they asked for email, placeholders, past dates, emojis, em dashes, a first message without verified content research;
   - warnings: no clear request or too many, obligation wording, booking link without a scheduling question, availability claims, corporate phrases, length outside 60-120 words.
   Saving with errors needs a second press and keeps it as work in progress.
7. **Repetition.** The campaign screen lists phrases shared across several drafts and identical openings, for you to rewrite. Nothing is replaced automatically.
8. **Send it yourself.** Copy it, or "Open in mail app" (a prefilled compose window; you press send). Then "I sent it: mark as sent", which logs the message and sets the contact to Contacted.
9. **Replies.** Paste their reply into the conversation. The workspace tags intents (try, feedback, info, content, schedule, timing, prefers-email, compliment, decline, stop) and suggests a status change you can accept. "Draft a reply" gives the AI the full conversation as data, and the checks flag a reply that skips their question.
10. **Follow-ups** lists: replies you owe, one follow-up after the configured number of days without an answer, and your own reminder dates. Declined and do-not-contact people never appear; people waiting on your answer appear as "reply needed", never as a follow-up.
11. **Ideas.** "Load the audit backlog" adds the ranked starter ideas and the audit observations they rest on. Each idea keeps evidence (linked log entries) separate from assumptions. Add real feedback to the evidence log as it arrives.
12. **Report.** Messages section: only what you logged (people messaged, replied, interested, shared content, declined). Website section: unique visitors per milestone from campaign links, each rate shown with its denominator, `unknown` when the denominator is 0. Email opens are never tracked or estimated.

## Setup

| Setting | Where | Needed for |
| --- | --- | --- |
| `ADMIN_KEY` | Vercel → Project → Settings → Environment Variables (Production), type Sensitive. 24+ random characters, e.g. `openssl rand -base64 33`. Redeploy after adding. | Everything in `/admin`. Without it the API answers 503 and stores nothing. |
| `AI_GATEWAY_MODEL` | Same place, plain value, e.g. `anthropic/claude-sonnet-5.5` (any ID from the AI Gateway model list). | AI drafts. Without it the editor says AI is not configured and manual drafting still works. |
| AI Gateway auth | Uses the deployment's Vercel OIDC token automatically (Project → Settings → Security → OIDC Federation must be on), or set `AI_GATEWAY_API_KEY`. Usage is billed to the team's AI Gateway credits. | AI drafts |
| `BLOB_READ_WRITE_TOKEN` | Already set (private Blob store used by cloud saves). | Storage |
| Email (Gmail) | Not connected. The admin shows this state. Connecting it would need Google OAuth with Gmail scopes and server-side token storage. | Saving unsent Gmail drafts, reading replies |

## Verification

- `npx vitest run src/outreach api/admin.test.ts`: 29 tests. CSV dedupe (same file twice, in-file duplicates, URL variants), unverified emails kept out, every draft check, repetition, reply intents, follow-up rules (decline, stop, reply-needed, one follow-up max), denominators, AI brief treats the conversation as data, API auth (missing/short/wrong key), stale-write conflict, email-needs-source, decline blocks drafting, tracking dedupe and unknown codes, link check limited to the game's domain.
- `npm run admin:e2e`: 13 browser steps against the real web build with the API on an in-memory store and a stand-in AI. Wrong key shows nothing; CSV import twice adds nobody; email without source refused; AI draft with personal link passes checks and stays unsent; invented familiarity flagged; mark-as-sent logs and sets Contacted; reply-needed instead of follow-up; reply that skips their question or ignores "email please" is flagged; decline stops follow-ups and drafting; one visitor opening a link twice counts once; report shows denominators and "unknown"; no contact data in the public page.
- Game regression: `npm run smoke` (23 flows), full unit suite, lint.

## Limitations

- No email integration: sending, Gmail drafts and reply import are manual (copy / paste).
- No research tool runs inside the admin. Research is manual: verify on the creator's own pages and record the URL and date.
- Event counts are unique per device and browser. Clearing storage or switching devices counts as a new visitor, and anyone who knows a link code could add visits. There's no rate limiting.
- Attribution is per link. A visitor through the general campaign link isn't tied to a person. Opens and creator participation are never inferred.
- Single-owner workspace: two tabs saving at once get a conflict message and the latest version is reloaded.
- Challenge links share spins, not opponents (see `src/outreach/facts.ts`). Don't promise identical conditions until the fair challenge idea ships.
