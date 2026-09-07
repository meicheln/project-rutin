# Roadmap — from tracker to assistant

Rutin today is an excellent **logger**: you tell it what happened, it stores and charts it.
It is not yet an **assistant**: it never speaks first, it has no idea what you *meant* to do,
and it can only be reached by unlocking the phone and opening the app.

This document is the plan for closing that gap — schedule, time management, two-way control,
notifications, and the network and security work each of those requires.

Same convention as [ROADMAP.md](ROADMAP.md): ordered by value per hour, estimates assume one person
who already knows the code.

---

## Where the gaps actually are

| What's wanted | What exists today | The missing piece |
|---|---|---|
| Track a schedule | `days[d].blocks` — logged *after* the fact. `latihan.jadwal` — training only | No forward-looking agenda |
| Time management | Minutes are logged, never compared to anything | No plan vs. actual |
| Expenses | Done. Budget, categories, charts | Only needs to speak up on its own |
| Personal assistant | 19 tools, but purely reactive | It never initiates |
| Two-way control | One direction: you → app, in-app only | Reply *from* a notification; reach it remotely |
| Notifications | Two fixed times, static text | Not composed from state, not actionable |
| Internet | Blob sync of one row | No server-side brain |
| Someone else schedules you | Nothing. `S` has exactly one writer | An inbox, not shared state |
| Security | API key in cleartext `localStorage` (§5) | The key has to leave the device |

The order below is deliberate: phases 1 and 2 add no attack surface at all and deliver most of the
"assistant" feeling. Do not start with the Telegram bridge.

---

## Phase 1 — An agenda, and plan vs. actual — DONE

The single highest-value addition. The app knows where your **money** leaks and has no idea where
your **time** leaks, because nothing records what you intended to do.

### Data

One new array in `S`, using the existing `ACTS` vocabulary so it lines up with `blocks` for free:

```js
agenda: [
  { id, judul, kat,          // kat = ACTS id: skripsi | kerja | kelas | olahraga | ...
    mulai, selesai,          // 'HH:MM'
    ulang,                   // 'sekali' | 'harian' | 'mingguan'
    hari,                    // [1,3,5] when ulang = 'mingguan'
    tgl,                     // 'YYYY-MM-DD' when ulang = 'sekali'
    sumber,                  // 'manual' | 'latihan' | 'tugas' | 'ics' | 'delegasi'
    oleh }                   // who proposed it; null when it's yours
]
```

`sumber` and `oleh` cost two fields now and save a migration later — phase 6 is additive if every
agenda item can already say where it came from.

Today's agenda is **derived**, not stored: manual entries for today, plus `latihan.jadwal[weekday]`
expanded through `PROGRAM`, plus `tasks` whose `due` is today. One function, `agendaHari(d)`.

### Screens

Two places, each where it belongs:

- **Home** — *Agenda hari ini*, the glance screen answering "what's on today". The item covering the
  current time is marked *sekarang*; finished ones dim. Derived items route to their real owner:
  a training block opens the session, a task jumps to the work tab.
- **Daily** — *Rencana vs kejadian*, next to the timeline the `blocks` come from. One row per
  category, the plan line pinned at a **fixed** position so rows can be compared at a glance: bar
  short of the line means under, past it means it ate more than planned. Categories with no plan at
  all get a dimmed bar labelled *di luar rencana* — a full bar there is the leak, not an achievement.

That one comparison is the entire time-management product:

> planned 2h skripsi → logged 40m. Planned 0h scrolling → logged 2h10.

### Assistant tools

`tambah_agenda`, `baca_agenda`, `geser_agenda`. "Besok jam 7 pagi ke kampus sampai jam 12" should
land as an agenda entry the same way "jajan 25rb" lands as a transaction today.

**No server, no new permissions, no new secrets.**

Shipped. `ingat` (per-item reminder minutes) was deliberately left out of the shape until phase 2
builds the code that reads it — a field the UI shows but nothing acts on is a promise the app breaks.

---

## Phase 2 — Notifications you can answer — DONE

This is two-way control with **zero backend**. Android's direct-reply already does it.

```js
// 11-storage-native.js
LocalNotifications.registerActionTypes({ types: [{
  id: 'rutin-balas',
  actions: [
    { id: 'balas', title: 'Balas', input: true, inputPlaceholder: 'ketik aja...' },
    { id: 'geser', title: 'Geser 15m' },
    { id: 'skip',  title: 'Lewati' }
  ]
}]});
LocalNotifications.addListener('localNotificationActionPerformed', ev => { ... });
```

Three changes:

1. **Per-agenda-item reminders.** `ingat` minutes before `mulai`, ids from a reserved block (300+),
   rescheduled in `Notif.apply()` alongside the existing groups.
2. **Text composed at schedule time**, not hardcoded — this is ROADMAP D1. "Rutinitas pagi tinggal 2"
   beats "Ceklis rutinitas pagi lo" when everything is already ticked.
3. **The reply is parsed.** Route it through a small local parser first (`25rb makan` → transaction)
   and fall back to the assistant tool loop only when the parser misses. Most gym and meal logging is
   a number and a word; spending an API round trip on that is waste, and the parser works with no
   signal at all.

The rest-timer fix (ROADMAP A2) is the same mechanism — do them together.

### What shipped

All three, plus the timer. Notes on where it differs from the sketch above:

- **`Notif.apply()` reruns on background**, at most hourly, so composed text is as fresh as the last
  time the phone was put down. Android cannot rewrite a pending notification, so this is the best
  available; the residual staleness is [LIMITATIONS §18](LIMITATIONS.md).
- **"Geser 15m" schedules a one-shot follow-up and does not touch the agenda item.** Moving the data
  would shift a daily or weekly entry *forever* — a snooze must not be a reschedule.
- **Agenda reminder ids are 300 + i×8**, one slot for the once/daily case and seven for weekday
  entries, capped at 24 items. A reminder that crosses midnight (`00:20` minus an hour) walks the
  weekday back a day rather than producing a negative hour.
- **The rest timer holds an end timestamp**, redraws from the clock every 250 ms, schedules its own
  notification on a separate high-importance channel, and resumes on reopening the session.
  `Notif.apply()` deliberately skips id 250 when cancelling so a running rest is never wiped.
- **Undo instead of confirm-before** for both blind write paths — see
  [LIMITATIONS §4](LIMITATIONS.md) for the reasoning. That covers the urgent half of ROADMAP A3.

---

## Phase 3 — Move the brain to the server — CODE DONE, NEEDS DEPLOYING

**This is the security fix, and it is a prerequisite for everything remote.**

Today the Anthropic key sits in `localStorage` in the clear ([LIMITATIONS §5](LIMITATIONS.md)).
Encrypting it on-device (ROADMAP E3) helps the APK and does nothing for the web. Proxying solves both
and is less code.

```
supabase/functions/asisten/index.ts

  verify the caller's Supabase JWT      ->  401 if absent or invalid
  read ANTHROPIC_API_KEY from env       ->  never reaches any client
  forward /v1/messages, stream back
```

Client side: `aiReq()` in `31-asisten.js` changes its URL and swaps `x-api-key` for the session's
bearer token. `AI.cfg.key` and the key field in settings are deleted.

What this buys beyond the key:

- system prompt and model change server-side, no APK rebuild
- one place to rate-limit and to log spend
- the tool loop can later run with no phone present — which is what phase 4 needs

What it costs: the assistant no longer works without a network. It already didn't.

### What shipped

`supabase/functions/asisten/index.ts` plus the client half. Deploy steps are in
[SUPABASE.md](SUPABASE.md) — two commands, and they need your account, so they are yours to run.

Differences from the sketch above, all deliberate:

- **Both paths stay.** The key field wasn't deleted. The app prefers the function; if it answers 404
  (not deployed) or 501 (no key set) it falls back to a local key **for that session only**, so
  deploying later flips it back with no action. Deleting the local path before the function exists
  would have stranded a working app.
- **`Pindah ke server` verifies before it deletes.** It calls the function first and only wipes the
  on-device key once that succeeds.
- **A 401 never falls back.** An expired or forged session is a real error and surfaces as one —
  quietly reverting to the local key on an auth failure would hide exactly the thing worth seeing.
- **Path allowlist, body cap, daily quota.** Only `/v1/messages` and `/v1/models` are forwarded, the
  body is capped at 512 KB, and each user gets 300 requests a day. Without the allowlist the function
  is an open proxy for your key; without the quota a leaked session drains your Anthropic credit.
- **The quota table has no RLS policies at all.** Only the function, using the service role, can
  write it. A user-writable counter is one a leaked token can reset to zero.
- **The request body is never logged.** It carries the daily summary.

The function still receives `system` and `tools` from the app — it is a thin authenticated proxy.
Phase 4 is where that has to change, because there is no phone open to compose them.

### Provider swap (added after the fact)

The function fronts **either** Gemini or Anthropic, chosen by which secret is set — `GEMINI_API_KEY`
wins. `gemini.ts` translates the Anthropic request shape both ways, so the app, its 22 tools, the
tool-use loop, and every existing test stay exactly as they were. Swapping provider is one
`secrets set`, no redeploy.

The translation earns its own spec (`tests/07-gemini.spec.mjs`, no browser needed) because the
failure modes are silent: Gemini wants the *function name* in a `functionResponse` where Anthropic
only gives a `tool_use_id`, it rejects JSON Schema keys outside a small subset, and it returns no id
for a tool call. Each of those is a bug that looks like "the assistant just ignored me".

Data cost of the free tier, and the three fields dropped in response: [LIMITATIONS §5](LIMITATIONS.md).

---

## Phase 4 — Reach it from anywhere (Telegram) — 2–3 days

Push that Android cannot kill, a chat UI for free, no app-store review, no FCM or Firebase setup, no
VAPID keys, no service worker. For one user this beats building a PWA push pipeline.

### Pairing — the part that must not be sloppy

```sql
create table public.rutin_link (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  chat_id  bigint unique not null,
  kode     text,                       -- one-time pairing code
  kode_exp timestamptz,
  dibuat   timestamptz default now()
);
alter table public.rutin_link enable row level security;
-- policies: the user reads/writes only their own row; the function uses the service role
```

The app shows a 6-digit code valid 5 minutes; you send it to the bot once; the `chat_id` is bound.
**Every message from an unbound `chat_id` is dropped without a reply** — a "wrong code" response would
confirm the bot exists to anyone probing it.

### Message flow

```
Telegram -> webhook (Edge Function)
  1. check X-Telegram-Bot-Api-Secret-Token   <- set at setWebhook time; reject otherwise
  2. chat_id -> rutin_link -> user_id        <- NEVER take a user id from the payload
  3. rate limit per chat_id (e.g. 30/hour)
  4. load rutin_state.data, run the same tool loop, write back, bump updatedAt
  5. reply in Telegram; the phone picks the change up on its next pull
```

### Outbound — what makes it feel like an assistant

`pg_cron` calling the function on a schedule:

- **07:00** — today's agenda, the one thing that matters most, yesterday's leftovers
- **21:00** — nightly rollup: spend vs. budget, plan vs. actual, tomorrow's first item
- **event-driven** — budget crosses 80%, an agenda block starts and nothing was logged, a thesis
  deadline lands inside 7 days

The nightly rollup is roughly 2 hours of work once 3 and 4 exist, and is the single feature that
changes the app's character from form to assistant.

### Security rules for this phase

1. Bot token and service-role key live **only** in Edge Function env. Never in `S`, never in the APK.
2. Webhook secret header verified on every request.
3. One bound `chat_id`, with an unbind button in the app that clears the row.
4. Rate limit per `chat_id` — a leaked bot username otherwise means anyone can spend your Anthropic
   credit.
5. **Confirm before destructive writes.** Money above a threshold, and any delete, get inline buttons
   in Telegram and a toast in-app. This is ROADMAP A3, and it stops being optional the moment the
   assistant is reachable from a phone that is not in your hand.
6. Send the summary, not the state. Server-side, keep the `aiSnapshot()` discipline: totals and counts,
   with full history only when a read tool asks. Less data leaving, less to leak.
7. **Treat all inbound text as data, not instruction.** Message bodies — and later calendar event
   titles — can contain "ignore previous instructions and...". The system prompt says instructions come
   only from the bound user; imported text is wrapped and labeled as untrusted.
8. **App lock** — PIN or biometric on the gate. The app now holds a remote-control channel, and an
   unlocked phone should not hand it over. Half a day.

### One thing this makes worse

Blob last-write-wins ([LIMITATIONS §1](LIMITATIONS.md)) now has **two writers**: the phone and the
function. Read-modify-write inside a single request keeps the window small, but per-record sync
(ROADMAP B1) moves up the priority list once the bot writes regularly.

---

## Phase 5 — Read an external calendar — 1 day, optional

Google Calendar's **secret iCal address** (Settings → the calendar → "Secret address in iCal format").
The Edge Function fetches it, expands the next 14 days, and merges the result into the agenda as
read-only entries with `sumber:'ics'`.

No OAuth, no Google Cloud project, no consent screen, no verification. One-way and read-only, which is
all a personal tracker needs. The secret URL is a bearer credential — it lives in the function's env
next to the bot token, never on the device.

Skip this until phase 1 proves you actually keep an agenda.

---

## Phase 6 — Someone else can schedule you — 2 days

A manager, a thesis supervisor, a coach: a second person who may put things on your calendar.

[ROADMAP.md §F](ROADMAP.md) says multi-user "changes the data model at its root," and that is true of
the obvious implementation — two accounts editing one `S`. That version is not worth building: `S` is
a blob synced last-write-wins, and a second writer turns every silent-data-loss scenario in
[LIMITATIONS §1](LIMITATIONS.md) into a daily event.

**So don't share the state. Share an inbox.**

```
manager  ->  rutin_usulan (proposals)  ->  you accept  ->  S.agenda
                                       ->  you reject  ->  nothing happens
```

`S` keeps exactly one writer — you. The proposal table is append-only and is the audit log for free.
Nothing about phases 1–5 changes.

### Schema

```sql
-- who may propose to whom, and for what
create table public.rutin_delegasi (
  pemilik   uuid not null references auth.users(id) on delete cascade,  -- you
  delegasi  uuid not null references auth.users(id) on delete cascade,  -- them
  peran     text not null,                       -- 'manajer' | 'dosen' | 'pelatih'
  ruang     text[] not null default '{agenda}',  -- scopes they may touch
  auto      boolean not null default false,      -- accept without asking
  lapor     boolean not null default false,      -- may they see the outcome
  primary key (pemilik, delegasi)
);

-- the inbox: proposals, never state
create table public.rutin_usulan (
  id      uuid primary key default gen_random_uuid(),
  pemilik uuid not null references auth.users(id) on delete cascade,
  oleh    uuid not null references auth.users(id) on delete cascade,
  ruang   text not null,                         -- 'agenda' | 'tugas' | 'skripsi'
  op      text not null,                         -- 'tambah' | 'ubah' | 'batal'
  target  text,                                  -- existing item id, for ubah/batal
  isi     jsonb not null,
  pesan   text,
  status  text not null default 'menunggu',      -- menunggu | diterima | ditolak
  dibuat  timestamptz default now(),
  diputus timestamptz
);
```

### The permission boundary is the absence of a policy

```sql
-- a delegate may insert a proposal, only within a granted scope
create policy "delegate proposes" on public.rutin_usulan for insert
  with check (
    oleh = auth.uid()
    and exists (select 1 from public.rutin_delegasi d
                where d.pemilik = rutin_usulan.pemilik
                  and d.delegasi = auth.uid()
                  and ruang = any(d.ruang))
  );

-- you decide
create policy "owner decides" on public.rutin_usulan for update
  using (pemilik = auth.uid());
```

There is **no policy on `rutin_state` for anyone but its owner**, and none is added. A manager cannot
read your money, your weight, your sleep, or your thesis notes — not because the UI hides it, but
because no policy exists that would return the row. That property is worth more than any setting
screen, and it is preserved by never granting the scope `txns` or `badan` to anyone. Ever.

### In the app

- `syncDown()` also pulls `rutin_usulan where status = 'menunggu'`.
- Home shows an inbox chip: *"2 usulan jadwal dari Pak Budi"*.
- Accepting materializes a **copy** into `S.agenda` with `sumber:'delegasi'`, `oleh`. It is now your
  item: editable, deletable, and it does not change again when they change theirs.
- Accepting runs an overlap check against `agendaHari(d)` first — a proposed 09:00–12:00 on a Lower A
  morning should say so before you tap yes.
- `auto:true` skips the prompt but not the stamp. Items still show who put them there, and revoking
  the delegation is one row delete.

**The copy, not a live reference, is the whole design.** It is the difference between "my manager can
put things on my schedule" and "my manager controls my phone."

### `lapor` — the direction that needs a deliberate choice

Off by default. When on, the delegate sees the status of **their own proposals only**: accepted,
rejected, and whether items they created got done. Never your logged blocks, never mood, sleep,
weight, spending, or anything they did not propose.

Say no to any request to widen this. The moment a delegate can see your whole timeline, this stops
being a personal tracker and becomes employee monitoring, which is a different product with different
consent requirements.

### Where the manager actually types

Ranked by how little there is to build:

| Option | Build | Trade-off |
|---|---|---|
| **Shared Google Calendar** (phase 5) | ~0 — it *is* phase 5 | Read-only by construction, they need no account. But no approval loop, no status back, agenda only, and polling lag |
| **The same Telegram bot** (phase 4) | ~half a day on top of phase 4 | Bind their `chat_id` with `peran:'manajer'` and a proposal-only tool set. You get Terima/Tolak inline buttons. Best balance |
| **A manager web view** | ~200 lines: same bundle, `?peran=manajer` boot path, week grid only | Only worth it if they need to see and drag a real week |

If the manager already lives in Google Calendar, phase 5 delivers most of this for free and the inbox
can wait. Build the inbox when you need the approval loop.

---

## Suggested order

```
1. Phase 1   agenda + plan vs actual     <- DONE
2. Phase 2   replyable notifications     <- DONE
3. A3        undo for UI deletes         <- DONE for blind writes; UI deletes still final
4. Phase 3   brain on the server         <- CODE DONE, waiting on `supabase functions deploy`
5. Phase 4   Telegram + nightly rollup   <- reachable from anywhere
6. B1        per-record sync             <- now that there are two writers
7. Phase 5   calendar import             <- also the cheap version of phase 6
8. Phase 6   delegated scheduling        <- when you need the approval loop
```

Phases 1 and 2 are about two and a half days and cover "schedule, time management, notifications,
two-way control" without opening a single new port. Phases 3 and 4 are what "connected to the internet
with proper security" actually costs. Phase 6 adds a second person without adding a second writer.
