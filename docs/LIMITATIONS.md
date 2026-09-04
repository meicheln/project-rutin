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

## 4. [!] No undo, anywhere

Deleting a transaction, deleting a task, or hitting full reset is immediate and permanent. The only confirmation is a browser `confirm()`.

The riskiest part: **the assistant writes without asking**. If the model misreads "two million" as "two thousand", the transaction just lands. The green checked line does show what it did, but that's notification after the fact, not permission before it.

**The fix.** An undo stack holding the last 20 actions as lightweight snapshots of the touched branch, with a "Undo" toast. For the assistant, require a one-tap confirmation on any tool that touches money or deletes anything.

---

## 5. The API key is stored in the clear

The Anthropic key sits in `localStorage` as plain text. Inside the APK that storage is app-private and reasonably safe from other apps. On the web, anyone who can open devtools on that device can read it.

No encryption, no Android Keystore, no app lock.

**The fix.** For the APK, store it through `@capacitor/preferences` backed by EncryptedSharedPreferences. For the web there's no genuinely safe answer — the sensible move is proxying through a Supabase Edge Function so the key never reaches the client.

---

## 6. [!] The rest timer dies when the app is backgrounded

The rest timer is a JavaScript `setInterval`. Turn the screen off or switch apps mid-way through a 3-minute rest — a normal thing to do in a gym — and Android freezes it. Come back and the number is wrong or stopped.

**The fix.** Schedule a local notification when the timer starts, and compute remaining time from a timestamp difference rather than from interval ticks. Small change, large real-world impact.

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

## 18. Smaller things

- The bundle isn't minified. 246 KB could be roughly 80 KB. Irrelevant inside the APK; slightly relevant on the web over a slow connection.
- No service worker on the web build, so the PWA needs a connection for the first load each time the browser cache clears.
- Notification text is static. "Check off your morning routine" fires even if everything was already done last night.
- The quick-add menu shows the same options on every screen except training sessions.
- Transaction categories aren't user-editable; changing them means changing code.
- No search. Finding a specific transaction from six months ago means scrolling.
- No CSV export — backups are JSON only, which doesn't open in a spreadsheet.
- Haptics fire with no setting to turn them off.
- `sesiKelarMinggu()` counts any completed session, so doing Push twice in one week counts as two against a schedule-based denominator.
