# Architecture

How Rutin works, from boot to sync. Written for someone about to change the code.

---

## 1. The shape of it

```
                       ┌─────────────────────────────┐
                       │      one object: S          │
                       │  everything the app knows   │
                       └──────────┬──────────────────┘
              commit()            │            render()
        ┌───────────────────┐     │     ┌────────────────────┐
        ▼                   ▼     ▼     ▼                    ▼
  localStorage        IndexedDB   │  active screen      sync queue
  (sync, instant)    (async, big) │  redrawn           (1.4s debounce)
                                  │                          │
                                  │                          ▼
                                  │                   Supabase (one row)
                                  │
                            Claude assistant
                       (reads a summary, calls tools)
```

No framework, no state management library, no observers. One global object `S`, one `commit()`, one `render()`. Every change goes through `commit()`.

---

## 2. Boot order

`40-gerbang-boot.js` closes the bundle and starts everything:

```
applyTheme()          set the theme before anything paints, to avoid a flash
Store.init()          open IndexedDB
Store.load()          if IndexedDB is newer than localStorage, take it
Store.flush()         bring both layers back in step
LT()                  initialise the training data shape
go('home')            paint the first screen
Native.init()         status bar, splash, back button, app lifecycle
Notif.apply()         reschedule all reminders
  ↓
Cloud.configured()?
  yes → Cloud.restore() → session alive? → close gate, syncDown()
                                         → no: show sign-in
  no  → mode 'local'? → close gate
      → never set up → show the welcome gate
```

The order matters. Storage opens **before** the first paint — reversed, the user would see stale data for a fraction of a second before it's overwritten by the correct data.

---

## 3. Data model

Everything lives in one object `S`. The full shape is defined by `seed()` in `10-core.js`.

```js
S = {
  v: 1,                    // schema version, used to validate backups
  updatedAt: 1755...,      // epoch ms — this decides who wins a sync
  profile:  { nama, mulai },
  settings: { theme, budget, targetTidur, targetAir, targetKalori,
              targetSkripsiMenit, beratTarget, jamKerjaTarget,
              ingatkan, jamPagi, jamMalam },

  routines: [ {id, n, tag} ],                    // tag: pagi | badan | fokus | malam
  days: {                                        // keyed 'YYYY-MM-DD'
    '2026-08-17': {
      bangun, tidur, mood, energi, catatan,
      rt: { routineId: true },                   // routine ticks
      blocks: [ {id, s, e, c, t} ]               // c = activity category
    }
  },

  txns:     [ {id, d, type:'in'|'out', amt, cat, note} ],
  tasks:    [ {id, t, proj, prio, due, est, done, doneAt} ],
  workLogs: [ {id, d, jam, proj, note} ],

  skripsi: {
    judul, dosen, deadline,
    bab:       [ {id, n, p, st, dl} ],           // st: belum|nulis|revisi|acc
    bimbingan: [ {id, d, catatan, aksi, selesai} ]
  },

  badan: {
    berat:   [ {d, kg} ],
    latihan: [ {id, d, jenis, menit, note} ],
    asupan:  { '2026-08-17': {kcal, air} }
  },

  ide: [ {id, judul, st, platform, hook, isi, tag, dl, created} ],

  latihan: {
    jadwal: { 0..6: ['lowerA', ...] },           // 0 = Sunday
    sesi:   [ {id, d, sid, mulai, selesai, ceklis:{exId:bool},
               set:{exId:[{kg,rep}]}, kurang, rasa, dicatat} ],
    jamIngat, ingatLatihan
  }
}
```

### Why an object, not tables

This is a single-user app. Forty-five days of full usage comes out around 300 KB of JSON. While it stays under a few megabytes, one object is far simpler: no joins, no schema migrations, backup is `JSON.stringify`, and sync is one row.

The ceiling is real and documented in [LIMITATIONS.md](LIMITATIONS.md) §2.

### Two things stored outside `S`

- `LS.get('rutin.sb')` — Supabase URL and public key
- `LS.get('rutin.ai')` — Anthropic API key and chosen model

Deliberately separate: both belong to the device, not the account. If they lived in `S`, the API key would sync to every other device — not what anyone wants.

---

## 4. Rendering

```js
function commit(rerender = true){
  S.updatedAt = Date.now();
  LS.set('rutin.state', S);      // synchronous, immediate — the safety net
  Store.save();                  // IndexedDB, 250 ms debounce
  pushTimer = setTimeout(Cloud.push, 1400);
  if (rerender) render();
}

function render(){
  applyTheme();
  if (view==='home')  renderHome();
  ...
}
```

Each `renderX()` builds one HTML string and assigns it to its container's `innerHTML`. No diffing, no virtual DOM.

At this data size it's fast — the Money screen with 126 transactions paints in a few milliseconds. The consequences are in [LIMITATIONS.md](LIMITATIONS.md) §3.

### Where `render()` is deliberately avoided

Two places redraw surgically, because a full redraw would ruin the experience:

- **`toggleCeklis()`** (`22-view-latihan.js`) — ticking an exercise mid-session. A full redraw would reset scroll to the top and close the technique cue being read. So only the element's classes change, plus the progress bar in the header.
- **`gambarSesi()`** saves `scrollTop` and the list of open cues before rewriting, then restores them.

Both were bugs first, found by the tests. Assertions in `03-latihan.spec.mjs` now guard them.

### Event delegation

All interaction runs through one `document.addEventListener('click', ...)` reading `data-*` attributes:

```html
<button data-sheet="out">        open the expense form
<button data-rt="r3">            tick a routine
<button data-tx="abc123">        open a transaction to edit
<button data-go="money">         switch screens
```

Since markup is constantly rewritten, attaching listeners per element would leak and detach. Delegation makes that a non-issue.

---

## 5. Storage

### Why two layers

| | localStorage | IndexedDB |
|---|---|---|
| Synchronous | yes | no |
| Typical quota | 5–10 MB | hundreds of MB |
| Survives a sudden kill | yes, the write already completed | no, if the transaction hadn't committed |

`localStorage` is the safety net: written **synchronously** on every `commit()`, so if Android kills the app a second later the data is already on disk. IndexedDB is written right after and holds far more.

On boot, whichever has the newer `updatedAt` wins.

### Forced-write triggers

```js
['pagehide','freeze','blur']  →  LS.set + Store.flush()
visibilitychange (hidden)     →  LS.set + Store.flush()
appStateChange (native)       →  LS.set + Store.flush() + Cloud.push()
```

Every `localStorage` access is wrapped in try/catch with an in-memory fallback — private mode and storage-blocking settings must not kill the app. Covered by `06-tahan-banting.spec.mjs`.

---

## 6. Sync

### Schema

One table, one row per user:

```sql
create table public.rutin_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
```

Row-level security ensures each person can only read and write their own row. That's what makes the public key safe to ship inside the app.

### The protocol

```
Local change     → 1.4s debounce → upsert the whole object
App backgrounded → immediate upsert
Boot / sync button → pull → remote.updatedAt > local.updatedAt ?
                              yes: take remote
                              no:  push local
```

The winner is decided by `updatedAt`, not the server's `updated_at`, so the timestamp comes from the device that actually made the change.

**What to know:** this is last-write-wins at whole-document level. Two devices both edited offline, then both online, and one side's changes disappear with no warning. Reasoning and fix plan in [LIMITATIONS.md](LIMITATIONS.md) §1.

### Loading the library

`@supabase/supabase-js` is dynamically imported from a CDN the first time it's needed:

```js
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
```

If sync is never enabled, the library is never downloaded and the app runs fully offline.

---

## 7. Native bridge

`11-storage-native.js` wraps everything Capacitor-specific. The app checks `Native.on` once and adapts; the rest of the code doesn't know.

| Need | Native (APK) | Web |
|---|---|---|
| Status bar color | StatusBar plugin | `theme-color` meta |
| Reminders | LocalNotifications, runs in background | Notification API, only while the tab is open |
| Anthropic API calls | CapacitorHttp (bypasses CORS) | `fetch` + browser-access header |
| Back button | App listener | — |
| Save on background | `appStateChange` | `visibilitychange` |

### Why CapacitorHttp for the assistant

The Android WebView serves the app from `https://localhost`. A `fetch` to `api.anthropic.com` from there is subject to CORS. CapacitorHttp makes the request natively, so CORS doesn't apply at all — more reliable than depending on the browser-access header.

On the web, the `anthropic-dangerous-direct-browser-access` header is used instead.

### Back button

```
assistant panel open?  → close it
sheet open?            → close it
on the welcome gate?   → ignore (don't exit mid-setup)
not on Home?           → go to Home
otherwise              → exit the app
```

### Reminders

Two groups, rescheduled whenever their settings change:

- ids 101, 102 — morning and evening reminders
- ids 210–216 — one per training day, naming that day's sessions

Android 14 can refuse exact alarms. The code tries `allowWhileIdle: true` first and falls back to ordinary scheduling rather than failing silently.

A bug lived here: training-day reminders were gated behind the daily-reminder switch, so they were never scheduled if daily reminders were off. Now both groups are composed separately and sent together. Guarded by assertions in `05-native.spec.mjs`.

---

## 8. The assistant

### Request path

```
user types
  → AI.raw.push({role:'user'})
  → POST /v1/messages { system: AI_SYS(), tools: AI_TOOLS, messages: AI.raw }
  → response contains tool_use?
       yes → run each tool locally → tool_result → send again (max 8 rounds)
       no  → show the text, done
  → commit()
```

The 8-round cap stops the model from looping on tool calls forever.

### Tools

19 tools, all synchronous and touching `S` directly. Each returns one Indonesian sentence rather than JSON — that sentence becomes the `tool_result`, and is also shown to the user as a green checked line so a misfiled entry is visible.

```
catat_transaksi      tambah_tugas          selesaikan_tugas
catat_jam_kerja      simpan_ide            catat_blok_waktu
centang_rutinitas    atur_jam_tidur        catat_berat
catat_latihan        catat_asupan          ubah_bab_skripsi
catat_bimbingan      tambah_rutinitas      atur_target
baca_latihan         catat_sesi_latihan    ubah_jadwal_latihan
baca_data
```

Name matching (tasks, routines, chapters) uses a tiered `cocok()`: exact → contains → contained-by. On a miss the tool returns the list of valid options, so the model can correct itself on the next round instead of giving up.

### What reaches Anthropic

`AI_SYS()` composes a system prompt with the rules plus a compact summary: today's date, name, routines completed, streak, this month's money totals, thesis percentage, open tasks, latest weight, today's training sessions, jump contacts.

What is **not** sent automatically: full transaction history, daily note contents, advisor notes. Those only travel if the model calls `baca_data` or `baca_latihan` — meaning only when the question actually needs them.

This keeps cost down and reduces what leaves the device per message.

### Model selection

Not hardcoded. After the key is entered, the app calls `GET /v1/models` and picks whichever id contains "sonnet", or the first one. So it doesn't go stale when new models ship, and it never requests a model the account doesn't have.

---

## 9. The training module

The largest module, and the only one carrying built-in domain knowledge.

### Program catalogue

`PROGRAM` is a constant: 8 sessions → blocks → exercises.

```js
lowerA: {
  n, jenis:'gym', menit:85, warna, ikon, fokus,
  blok: [
    { n:'Plyometric reaktif', m:20, catatan:'…',
      ex: [ { id, n, set, rep, ist, int, kontak, cue, log } ] }
  ]
}
```

- `kontak` — high-intensity ground contacts. These sum into the injury guardrail.
- `log: true` — this exercise shows kg × reps fields per set.
- `cue` — technique guidance. Every exercise must have one; an assertion enforces it.

The catalogue is static and not part of `S`. Only the record goes into `S.latihan.sesi`: ticks, weights, shortfall notes.

**Consequence:** rename an exercise `id` and old logs are orphaned. See [LIMITATIONS.md](LIMITATIONS.md) §9.

### Rules encoded in tests

The program enforces several things automatically rather than merely documenting them:

1. Gym sessions ≤ 90 minutes, basketball ≤ 120
2. Block minutes must sum exactly to the session duration
3. Lower-body days never coincide with basketball
4. Weekly jump contacts ≤ 200 (the advanced-athlete ceiling)
5. Every exercise has a technique cue and valid sets/reps

Break one and `npm test` fails. That's deliberate: those rules are why the program is safe, so they belong in tests, not just notes.

### The contact counter

```js
function kontakMinggu(){
  const hari = mingguIni();
  return sum(LT().sesi.filter(s => hari.includes(s.d)),
             s => kontakSesi(s.sid) * sesiKelar(s));
}
```

Computed from **logged** sessions, not the schedule — move Lower A to another day and its contacts still count. It used to read from the schedule, and that was a bug the tests caught.

Note the `× sesiKelar(s)`: the result is scaled by checklist percentage. That's a rough approximation, discussed in [LIMITATIONS.md](LIMITATIONS.md) §8.

### Where a session flows

A completed session writes into two other places, exactly once (guarded by a `dicatat` flag):

- `days[today].blocks` — appears in the daily timeline as an exercise block
- `badan.latihan` — appears in the Body tab's workout chart

So nothing is logged twice.

---

## 10. Design system

Color tokens live on `:root`, overridden per theme under `[data-theme]`. No color is written directly in a component.

Decisions that shape the look:

- **Monochrome first.** UI and buttons use neutrals (`--inv` / `--inv-fg`). Color is reserved for data — green for income, red for expense, one hue per category. It keeps the interface calm and makes the charts stand out without effort.
- **Blur used sparingly.** `backdrop-filter` appears only on the bottom nav and sheet backdrop. Heavy blur measurably drops frame rate on mid-range Android.
- **Plus Jakarta Sans** with a system fallback. If the font fails to load, the layout is still correct.
- **`font-size: 16px` on every input.** Below that, iOS zooms when an input is focused.
- **Touch targets ≥ 44 px** on primary controls.
- **`prefers-reduced-motion`** disables all animation.

---

## 11. Build

```bash
node build.mjs --check
```

Concatenates `src/*` in numeric order, then verifies:

1. Every `<script>` block parses (`new Function`)
2. The HTML skeleton is intact
3. Every id the boot path uses exists in the markup
4. No merge conflict markers slipped through

Exits 1 on failure, so it works in CI.

What it does **not** do: minify, tree-shake, or emit source maps. For a 246 KB bundle served from inside an APK, none of those earn their complexity.

---

## 12. Tests

Six specs, 192 assertions, Playwright at a 390×844 viewport.

| Spec | What it protects |
|---|---|
| 01-inti | dates (leap years, year rollover), currency formatting, streaks, sleep across midnight, storage when localStorage is blocked |
| 02-modul | five screens through the real UI, data surviving a reload |
| 03-latihan | program rules, session mode, timer, cross-module integration |
| 04-asisten | every tool executor, the tool-use loop, error messages |
| 05-native | notifications, back button, status bar, native HTTP |
| 06-tahan-banting | both storage layers, recovery, backup, sync tie-breaking |

The tests exercise **behavior through the UI**, not internal functions. `02-modul.spec.mjs` fills forms, taps chips, and presses save the way a person would. That catches real problems: if a category chip stops writing to its hidden input, the test fails, while a unit test of `catOf()` would still pass.

What is **not** covered: real devices, iOS, and live Supabase (the network is stubbed). See [LIMITATIONS.md](LIMITATIONS.md) §17.
