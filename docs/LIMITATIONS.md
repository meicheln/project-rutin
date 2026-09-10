# Known limitations

An honest list of what's wrong with this, ordered by how likely it is to actually cause a problem.

Some of these are deliberate choices for a single-user app — they're listed so the choice is visible rather than hidden. Others are debt I haven't paid.

**[!]** marks the ones that can lose data or lead to a wrong decision. Those are the ones worth fixing first.

---

## 1. [!] Sync can silently swallow changes

**The problem.** Sync is last-write-wins at the level of the whole document — not per record, but the entire `S` object at once.

The scenario that loses data:

```
09:00  Phone offline    log 6 transactions
09:30  Laptop online    log 1 transaction   → pushes to cloud
10:00  Phone online     phone's updatedAt is newer → phone wins
                        the laptop's transaction is gone, no warning
```

**When it bites.** Only with genuine two-device use where one side was offline. Single-phone use will never hit it.

**Why it ships this way.** Per-record sync needs a change log, version numbers, and conflict resolution — several times more complex than the entire current storage layer. For one person with one phone, that isn't earned yet.

**The fix.** Replace the single `data jsonb` row with an append-only `changes` table (`user_id, entity, entity_id, op, payload, ts`) and rebuild state from the log. Conflicts become detectable and mergeable per record. Estimate: 2–3 days.

**Workaround today.** Tap the sync icon before and after using a second device. Take a JSON backup before long sessions.

---

## 2. [!] State size grows without bound

**The problem.** Every day adds an entry to `days`. Every transaction, training session, and work log accumulates forever. There's no archiving and no pruning.

Extrapolating from 45 days of seeded data:

| Usage | Size of `S` | Effect |
|---|---|---|
| 45 days | ~300 KB | fine |
| 1 year | ~2.5 MB | sync starts feeling slow |
| 3 years | ~7 MB | near the localStorage quota; every small edit pushes 7 MB to Supabase |

**What makes it worse.** Every `commit()` writes the **entire** object to localStorage synchronously. At 7 MB that means serializing 7 MB on the main thread every time a checkbox is ticked.

**The fix.** Three steps, cheapest first:
1. Split rarely-changing data (old `days`, last year's `txns`) into separate IndexedDB keys, loaded on demand.
2. Make the localStorage write deferred and backup-only; promote IndexedDB to primary.
3. Auto-archive anything older than 18 months into a separate downloadable file.

---

## 3. Full re-render on every change

**The problem.** `render()` rebuilds the active screen's HTML string and assigns it to `innerHTML`.

At current data sizes this is fast. What will show first: the Money screen in a busy month, and the four-month consistency heatmap, which builds ~300 elements every time.

**Already patched where it mattered most.** Training session mode doesn't re-render when you tick an exercise — it used to, and that reset the scroll position and closed the technique cue you were reading. Now only the element's classes change. An assertion guards it.

**Not patched elsewhere.** Other screens still re-render fully. If a focused text input lives inside a container being re-rendered, focus is lost. It isn't visible today because the long text inputs (`#dayNote`, `#sesKurang`) deliberately don't trigger `render()` — but that's avoidance, not a solution.

**The fix.** When it starts to hurt: move to a keyed-patch pattern — key each list row and update only what changed. Or, more cheaply, virtualize the long lists.

---

## 4. Undo covers the blind writes, not the visible ones

There is now an undo stack (last 5 states, whole-`S` snapshots as strings) behind the two paths that
write **without you seeing a form first**:

- an assistant turn that calls any writing tool gets an *Urungkan* row under its actions
- a notification reply gets an *Urungkan* button in its toast for six seconds

The design choice: **undo after, rather than confirm before.** A confirmation dialog on every logged
expense costs a tap every single time to guard against a rare misparse, and the result line already
shows the parsed amount — so the mistake is visible either way. Undo makes it reversible without
taxing the correct case. If a confirmation step is wanted anyway, the natural trigger is an amount
above a threshold, not every write.

**Still missing.** Deleting a transaction, task, idea, or block from the UI is guarded only by a
browser `confirm()` and is not undoable. Those are lower risk — you are looking at the thing you are
deleting — but they should join the stack. Full reset and backup restore are likewise final.

The stack is memory-only and dies with the app. Snapshotting the whole state is fine while `S` is a
few hundred KB; past a few MB (§2) it should become per-branch snapshots.

---

## 5. The free Gemini tier trains on what you send it

The Edge Function can front either provider — `GEMINI_API_KEY` set means Gemini, otherwise
`ANTHROPIC_API_KEY`. On Gemini's **unpaid** tier, Google's terms say plainly:

> Google uses the content you submit to the Services and any generated responses to provide,
> improve, and develop Google products and services… human reviewers may read, annotate, and
> process your API input and output.

and: *"Do not submit sensitive, confidential, or personal information to the Unpaid Services."*

What this app sends on every assistant message is exactly that: this month's income and spending
totals, the budget, thesis percentage and chapter deadlines, open tasks, latest weight, today's
training. A `baca_data` call adds transaction history with notes, daily journal entries, and
supervisor meeting notes.

Three fields were dropped because they identify without informing — the user's name, the thesis
title, and the **supervisor's name** (someone else's data, who never agreed to any of this). The
numbers stay, because they are the feature: an assistant that can't see the amounts can't answer
"where did the money go".

**This is a deliberate, informed trade** — free inference in exchange for the daily record being
readable by Google and its reviewers. The paid tier of the same API carries the opposite terms
(no training, brief retention only). Switching is one command: `supabase secrets set` on a billed
key, no redeploy, no code change.

---

## 5b. The API key is in the clear unless you deploy the proxy

There are two paths now, and which one you are on is shown in the assistant's settings.

**Through the Edge Function** (`supabase/functions/asisten`) the Anthropic key lives only in
Supabase secrets. The app sends its own session token and nothing else; the key never reaches any
device, on web or in the APK. This is the intended setup — see [SUPABASE.md](SUPABASE.md).

**On a local key**, which is what you get before deploying the function or without cloud sync at
all, the key sits in `localStorage` as plain text. Inside the APK that storage is app-private and
reasonably safe from other apps. On the web, anyone who can open devtools on that device can read
it. No encryption, no Android Keystore, no app lock.

The app prefers the function and only falls back for the current session, so the exposure ends the
moment the function is deployed. But nothing forces the move, and a device that never signs in to
Supabase has no other option.

---

## 6. The rest timer survives a dark screen now

It holds the end timestamp in `localStorage` and recomputes the remaining seconds from the clock on
every draw, so a throttled or dead `setInterval` no longer corrupts it. A local notification is
scheduled for the end time, so the buzz arrives even if the process was killed, and reopening the
session resumes a rest that is still running instead of resetting it.

**What is still true.** On the web there is no notification when the tab is backgrounded — only the
recomputed display when you come back. And the end-of-rest vibration only fires if the app is alive;
otherwise you get the notification instead.

---

## 7. Session completion percentage is misleading

`sesiKelar()` weights every exercise equally. A 5-minute stationary bike warm-up counts the same as back squat 5×3 at 87%.

So "50% complete" doesn't mean half the work is done — it might mean only the warm-up and cool-down are ticked.

**The fix.** Weight by block, or at minimum count only the main and accessory blocks toward progress.

---

## 8. The jump-contact counter is an approximation

Two things make the number imprecise:

1. **It scales with checklist completion.** Ticking a box without actually doing every set still counts in full.
2. **It doesn't see pickup basketball.** An hour of open gym can add hundreds of contacts and the app has no idea.

The number is useful as a guardrail, not as a measurement. Fortunately the default program only uses 100 of the 200, leaving headroom for what isn't logged — but that's a lucky margin, not a design.

**The fix.** Count contacts per ticked exercise rather than per session. Add a quick "played pickup for N minutes" input that estimates contacts from duration.

---

## 9. Training logs are keyed to exercise IDs

This is now load-bearing rather than incidental: swapping an exercise works *because* logs follow the
exercise id, so each movement keeps its own weight history. The cost is unchanged — rename an id in
`PROGRAM` or `ALT` and the logs under the old id are orphaned. Add new ids; don't rename shipped ones.

`S.latihan.sesi[].set` and `.ceklis` are keyed by exercise IDs from the `PROGRAM` constant. Rename or remove `la_m1` and the old weight logs are orphaned — still in the data, but shown nowhere.

Not a problem yet, because the program hasn't changed. It becomes one the moment it does.

**The fix.** Store the exercise name alongside its ID in the log, plus an old-ID → new-ID mapping when the program version changes.

---

## 10. The thing that matters most isn't tracked

This entire training program exists to raise vertical jump. The app tracks load, contacts, duration, notes — but **it never asks how high you jump.**

Without that, there's no way to know whether the program is working. It's the largest gap in the training module and the cheapest to close.

**The fix.** One form: standing reach, standing vertical, approach vertical, date. Plus a trend chart and a reminder to re-test every 4 weeks. Under a day's work. It's first on the [roadmap](ROADMAP.md).

---

## 11. Shooting percentage isn't recorded

Basketball sessions say "5 makes per spot" and the user just ticks it off. How many attempts it took to get those 5 makes — the number that actually matters to a shooter — goes nowhere.

**The fix.** For shooting-type exercises, show two fields: makes and attempts. Compute the percentage and chart it per spot over time.

---

## 12. The program has no periodization

The same week repeats forever. No deload weeks, no structured progression, no blocks that shift emphasis.

The reference used to build this program specifically recommends a deload every 3–4 weeks. That isn't implemented.

Weights are logged, but nothing suggests next week's numbers. All progression is decided by the user.

**The fix.** A 4-week cycle with volume dropped in week four. Plus simple load suggestions: if every set hit its rep target and it felt "easy", add 2.5%.

---

## 13. Time comes from the device clock

All dates come from local device time. Flying across time zones can skip or double-count a day. Manually changing the phone's clock can corrupt a streak.

Not an issue for use in one city. It is one for frequent long-haul travel.

**The fix.** Store the time zone alongside each record, or pin "day" to a configurable home time zone.

---

## 14. Accessibility hasn't been done

- Most controls are `<button>` elements without `aria-label`; icon-only ones are unreadable to a screen reader
- Some chips fall below a 44 px touch target
- Tertiary text (`--text-3`) in the light theme sits around 4.0:1 contrast — below the recommended 4.5:1
- Never tested with TalkBack
- Color alone distinguishes status in a few places; red-green color blindness would struggle to tell income from expense in the history list

**The fix.** One dedicated pass: `aria-label` on every icon button, raise `--text-3` to pass AA, add + and − signs next to amounts, test with TalkBack.

---

## 15. iOS has never been tried

The CSS already accounts for iOS — `dvh`, `env(safe-area-inset-*)`, `font-size: 16px` on inputs to prevent zoom, `-webkit-backdrop-filter`. But it has never run in real Safari.

Most likely to break: `<input type="date">` and `type="time"` rendering, `dvh` behavior as the address bar collapses, and `backdrop-filter` on older devices.

A native iOS app needs a Mac and an Apple Developer account. The realistic path on iOS is a PWA via Add to Home Screen.

---

## 16. `days` keys accumulate even for empty days

`day(d)` creates an entry as soon as it's called, including from read paths. Opening the Daily tab and paging through dates creates an empty entry for every day passed.

There's already `dayRO()` for non-creating reads, but it isn't used everywhere.

Low impact — it just makes the data bigger than it needs to be.

---

## 17. What the tests don't cover

192 assertions cover a lot, but not everything:

- **Real devices.** The native path is tested against a fake Capacitor. That verifies our code calls the right things with the right arguments — not that Android actually fires a notification at 6 a.m.
- **Real Supabase.** The network is stubbed. The RLS policies have never been exercised against a live server.
- **The real Anthropic API.** Also stubbed. The request shape is correct, but it has never met an unexpected response from a live model.
- **Visual regression.** No screenshot comparison. A CSS change that breaks layout would pass.
- **Large datasets.** Tests run with 45 days. Behavior at 3 years is untested.
- **iOS / Safari.** Zero.

---

## 18. Notification text can be a day stale

Morning, evening and agenda reminders are composed from live state — routines left, today's first
agenda item, whether any spending was logged — but composed **at schedule time**, not at fire time.
Android has no hook to rewrite a pending notification's body.

`Notif.apply()` therefore reruns whenever the app moves to the background (at most hourly), which
means the text is as fresh as the last time you put the phone down. Leave the app closed for a full
day and the numbers it quotes will be yesterday's.

---

## 19. A notification reply needs the app to wake up

Replying to a notification is real two-way control — you type from the lock screen and it lands as a
transaction, a glass of water, or a weight. But the reply is delivered through Capacitor's
`localNotificationActionPerformed`, which means Android starts or resumes the app to hand it over.
It is much faster than opening the app and navigating, and it works from the lock screen, but it is
not a background write.

The quick parser handles money, water and weight. Anything it does not recognise is appended to
today's note rather than dropped, so no reply is ever lost silently — but it is also not understood.
Sending unrecognised replies to the assistant would need a network round trip and the API key, which
is exactly what a lock-screen reply should not depend on.

---

## 20. Smaller things

- The bundle isn't minified. 246 KB could be roughly 80 KB. Irrelevant inside the APK; slightly relevant on the web over a slow connection.
- No service worker on the web build, so the PWA needs a connection for the first load each time the browser cache clears.
- The quick-add menu shows the same options on every screen except training sessions.
- Transaction categories aren't user-editable; changing them means changing code.
- No search. Finding a specific transaction from six months ago means scrolling.
- No CSV export — backups are JSON only, which doesn't open in a spreadsheet.
- Haptics fire with no setting to turn them off.
- `sesiKelarMinggu()` counts any completed session, so doing Push twice in one week counts as two against a schedule-based denominator.
