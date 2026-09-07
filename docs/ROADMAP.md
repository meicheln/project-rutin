# Roadmap

Ordered by value per hour of work. Estimates assume one person who already knows the code.

Most of section A is **fixing existing limitations**, not adding features. That's deliberate — see [LIMITATIONS.md](LIMITATIONS.md). Adding a seventh module on top of a leaky foundation just adds more to fix later.

For the separate arc that turns Rutin from a logger into an assistant — agenda, plan vs. actual, notifications you can reply to, and a secured remote channel — see [ROADMAP-ASSISTANT.md](ROADMAP-ASSISTANT.md).

---

## A. Do these first

### A1. Track vertical jump — half a day

The entire training program is built to raise vertical jump, and the jump is never measured. This is the largest hole in the whole app.

```
Form:     standing reach, standing vertical, approach vertical, date
Derived:  vertical = jump height − standing reach
Screen:   trend chart in the Training tab, above the summary card
Reminder: re-test every 4 weeks
Tool:     catat_tes_lompatan for the assistant
```

Without it, nobody can tell whether the program works. With it, every other training decision has a basis.

### A2. Rest timer that survives a dark screen — DONE

Holds the end timestamp, redraws from the clock, schedules its own notification, and resumes an
unfinished rest when the session is reopened. See [LIMITATIONS §6](LIMITATIONS.md).

### A3. Undo — half done

The urgent half shipped: every path that writes **without showing you a form first** — an assistant
turn and a notification reply — now offers *Urungkan*, backed by a 5-deep snapshot stack. Undo-after
was chosen over confirm-before; the reasoning is in [LIMITATIONS §4](LIMITATIONS.md).

Still open: UI deletes (transaction, task, idea, block, agenda, routine) are guarded only by a
`confirm()` and are not undoable, and neither is a full reset or a backup restore.

```
Route the six sheet delete handlers through the same Undo.simpan()
Swap their confirm() for the "Urungkan" toast — fewer taps, more reversible
```

### A4. Shooting percentage — half a day

For shooting-type exercises, replace the checkbox with two fields: makes and attempts.

```
Mark basketball exercises with tembak: true
Makes / attempts fields, percentage computed
Percentage-per-spot chart over time
```

This is the most meaningful metric for a shooter, and it's currently absent entirely.

### A5. Weight session progress by block — 1 hour

"50% complete" can currently mean only the warm-up and cool-down are ticked. Weight by block, or count only the main and accessory blocks toward progress.

---

## B. When usage spans years

### B1. Per-record sync — 2–3 days

Replace blob sync with a change log. Solves the silent data loss when two devices are both edited offline.

```sql
create table changes (
  id bigserial primary key,
  user_id uuid, entity text, entity_id text,
  op text, payload jsonb, ts timestamptz
);
```

The client pushes what it hasn't sent, pulls what's newer than its cursor, and rebuilds state. Conflicts become detectable per record instead of swallowing the whole document.

Only worth it once a second device is genuinely in regular use.

### B2. Archive old data — one day

Split anything older than 18 months into a separate IndexedDB key, loaded on demand. Keeps `S` lean and sync light as history accumulates.

### B3. Make IndexedDB primary — half a day

localStorage is currently written synchronously on every `commit()`. At 5 MB that's serializing 5 MB on the main thread per checkbox tick. Flip the roles: IndexedDB primary, localStorage a deferred backup.

---

## C. Make the training smarter

### C1. Four-week periodization — one day

The reference used to build this program recommends a deload every 3–4 weeks. There isn't one.

```
Weeks 1–3  progressive build
Week 4     volume down ~40%, intensity held
Show the current week number on the summary card
```

### C2. Automatic load suggestions — half a day

Weights are logged but nothing suggests next week's numbers.

```
All sets hit rep target + felt "easy"    → +2.5%
All sets hit rep target + felt "right"   → +2.5% on main lifts only
Any set missed the target                → hold
Two sessions in a row missed             → −5%
```

Show it as a suggestion next to the input, not auto-filled.

### C3. An honest contact counter — 3 hours

Currently: session contacts × checklist percentage. Change to summing contacts from exercises actually ticked. Add a "played pickup for N minutes" input that estimates contacts from duration, since pickup basketball currently doesn't register at all.

### C4. 1RM estimation and percentage-based loads — 3 hours

The program says "85–90% 1RM" but the app doesn't know what the 1RM is. Compute it with the Epley formula from the heaviest logged set, then show the actual kilogram figure next to the percentage.

---

## D. Make daily use lighter

### D1. Context-aware notifications — DONE

Morning, evening and agenda bodies are composed from live state, and `Notif.apply()` reruns when the
app backgrounds so they stay fresh. The residual staleness is [LIMITATIONS §18](LIMITATIONS.md).

### D2. Search — 3 hours

One search field sweeping transactions, tasks, ideas, daily notes, and advisor notes. Finding something from six months ago currently means scrolling.

### D3. CSV export — 2 hours

JSON backups don't open in a spreadsheet. One button per module producing CSV.

### D4. Home screen widget — one day

Routine ring and today's spend, on the home screen. Needs a Capacitor plugin or a little Kotlin.

---

## E. Quality

### E1. Accessibility pass — one day

`aria-label` on every icon button, raise `--text-3` to pass AA, add + and − signs next to amounts so meaning doesn't depend on color alone, test with TalkBack.

### E2. Visual regression tests — half a day

Playwright is already here. Add screenshot comparison per screen per theme. Catches CSS changes that break layout, which currently pass unnoticed.

### E3. Encrypt the API key — 2 hours

Move it to `@capacitor/preferences` backed by EncryptedSharedPreferences in the APK.

### E4. Minify the bundle — 1 hour

246 KB could be roughly 80 KB. Irrelevant inside the APK, relevant on the web over a slow connection.

---

## F. If someone really wants to

These are large and not clearly worth it. Written down so they don't have to be reasoned out from scratch again.

- **iOS** — needs a Mac and an Apple Developer account. The PWA already covers most of the need.
- **Multi-user / sharing** — changes the data model at its root. This is a single-person app.
- **Bank app import** — parsing SMS or notifications needs sensitive permissions and the format differs per bank.
- **Wearable integration** — heart rate and steps from Health Connect. Interesting, but it doesn't answer any question that's currently unanswered.
- **Voice assistant in the gym** — situationally sensible (hands full, phone on the floor), but the Web Speech API in the Android WebView isn't dependable.

---

## Suggested order

If working through it sequentially:

```
1. A1  track vertical jump      ← without it all other training work is blind
2. A5  block weighting          ← 1 hour, makes the numbers honest
3. A3  undo for UI deletes      ← the blind-write half is already done
4. A4  shooting percentage
5. C2  load suggestions
6. C1  periodization
```

A2 and the risky half of A3 are done, along with the whole agenda/notification arc in
[ROADMAP-ASSISTANT.md](ROADMAP-ASSISTANT.md). Of the remaining **[!]** items in
[LIMITATIONS.md](LIMITATIONS.md), only sync and state size are left — the two that genuinely haven't
bitten yet while usage stays on a single phone.
