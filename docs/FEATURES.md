# Features

Everything the app does, by module.

---

## Home

A one-screen summary of today.

- **Routine ring** — today's routine percentage, turning green when complete
- **Streak** — consecutive days with at least 60% of routines done
- **Quick-log buttons** — expense, income, task, idea, weight
- **Task alert** — overdue count and due-today count, linking straight to the list
- **Today's agenda** — everything planned for today in one list: manual entries, the training sessions already on the weekly schedule, and tasks due today. The block covering the current time is marked *sekarang*; past ones dim.
- **Agenda reminders** — each entry can fire a notification 5 to 60 minutes before it starts, once, daily, or on chosen weekdays.
- **This month's cash flow** — net, in, out, and a budget bar that changes color at 80% and 100%
- **Four KPI cards** — thesis, work hours over 7 days, latest weight, water today; all tappable
- **7-day routine bar chart**
- **Upcoming deadlines** — thesis, work, and content merged into one sorted list with day counts
- **Four-month consistency heatmap** — one square per day, intensity following routine completion

---

## Daily

A full day, waking to sleeping. Arrows at the top right move between days.

- **Wake and sleep times**, plus **sleep duration** computed automatically from last night's bedtime to this morning's wake time — including across midnight. Green when it meets the target, amber when it doesn't.
- **Routine checklist** grouped into Morning / Body / Focus / Night, with a per-item streak
- **Routine editor** — add, rename, regroup, delete
- **Timeline blocks** — time ranges with a category (11 options) and detail; a 24-hour strip sits above, and gaps between blocks are marked and tappable to fill
- **Time breakdown by category** — total hours and percentage, largest first
- **Plan vs. actual** — planned minutes per category against the minutes actually logged in the timeline. The plan line sits at a fixed position on every row, so a short bar means under and a long one means it ate more than planned. A category you never planned shows dimmed and labelled *di luar rencana*.
- **Mood** and **energy**, five levels each
- **Free note** that saves as you type
- **Today's summary** — total spend, glasses of water, calories, tasks completed, hours worked

---

## Money

Arrows at the top right move between months.

- **Income and expenses** across 14 categories (9 out, 5 in), with a note and date
- **Monthly budget** with a bar that changes color approaching and exceeding the limit
- **"Where it went" donut** with the top five categories and their percentages
- **Per-category breakdown** with proportional bars
- **Daily spend chart** across the month, plus a marker for the heaviest day
- **History grouped by date** with daily totals, filterable to All / Out / In
- **Progressive loading** — 10 days at a time, so a busy month stays responsive
- Tap any transaction to edit or delete

---

## Progress → Training

The gym and basketball program. Full contents in [TRAINING-PROGRAM.md](TRAINING-PROGRAM.md).

- **Weekly summary** — sessions completed, total lift volume, jump-contact counter
- **Jump-contact counter** capped at 200 per week; amber at 85%, red past the limit, with a concrete suggestion of what to cut
- **Today's session card** with progress and a start button
- **Weekly schedule** Monday–Sunday with completion marks
- **Catalogue of 8 sessions** openable any time: Lower A, Lower B, Push, Pull, Upper, Basketball A, Basketball B, Basketball C
- **Schedule editor** — toggle sessions on any day, set the reminder time, restore defaults
- **Session history** with completion percentage
- **Ask-for-advice button** that opens the assistant with a prepared question

- **Swap any exercise** — tap ⇄ on a row to pick a different movement for that slot. Alternatives keep the slot's pattern, sets/reps role, and rest, so the block still does the job it was designed for. Around 150 alternatives across roughly 60 slots, covering push, pull, both leg days, and all three basketball sessions.
  - Load history is keyed to the **exercise**, not the slot. Swapping starts a fresh log for the new movement and leaves the old one intact; swap back and the old numbers return. Without that, dumbbell kilos and barbell kilos would share one chart.
  - The jump-contact guardrail follows the swap. Trading a 15-contact drill for an 18-contact one moves the weekly total, because that counter exists to prevent injury, not to describe the plan.

### Session mode (full screen)

- Exercises grouped into blocks with minute allocations
- Sets, reps, intensity, rest time, and contact count per exercise
- **Technique cues** that expand when you tap an exercise name — why the movement is there and what it should feel like
- **Per-exercise checkboxes** that don't disturb scroll position or an open cue
- **Rest timer** reading the duration from the program, with a progress bar and haptic feedback when it ends
- **kg × reps fields per set** for weighted movements, with volume computed automatically
- **Shortfall notes** and a five-level effort rating
- A completed session writes itself into the daily timeline and the body log, without duplicating

---

## Progress → Thesis

- Title, advisor, target defense date with a countdown
- **Per-chapter progress** with percentage, status (not started / writing / revising / approved), and its own deadline
- Approved status automatically sets progress to 100%
- Add your own chapters if the structure differs
- **7-day writing time chart** pulled from timeline blocks categorized as Thesis
- **Advisor meeting notes** — what the advisor said and what to do about it, kept separate

---

## Progress → Work

- **Tasks** with priority, project, due date, estimated hours
- Filters: Active / Today / Overdue / Done / All
- Auto-sorted: nearest deadline first, then priority
- **Work-hour log** per date with project and note
- **14-day work hours chart** with an average
- **Per-project breakdown** with proportional bars

---

## Progress → Body

- **Weight** with a target and progress bar; logging again on the same date overwrites rather than stacking
- **Weight trend chart** over the last 30 points
- **Water** — tap a glass directly, tap the same one again to decrease
- **Daily calories** against a target
- **Workout log** with type, duration, note
- **14-day workout chart**
- **14-day sleep chart** with different colors for nights that met the target and those that didn't
- **Habit heatmaps** for each Body-tagged routine, 13 weeks, with streaks

---

## Ideas

- Title, hook, long-form concept, platform, tags, target publish date
- **Five stages**: raw idea → concept → production → editing → published
- **Stage distribution bar** with counts
- Filter by stage
- Sorted by target date, with published items dropping to the bottom
- Cards edged with a color matching their stage

---

## Assistant

The star button above the add button.

- **Write in plain language** — "tadi jajan nasi goreng 25rb terus udah olahraga" records the expense and ticks the workout routine in one go
- **Every action is shown** as a green checked line, so you can catch anything filed wrong
- **Answers questions about your own data** — "where am I overspending this month?", "what's my average sleep?"
- **22 tools**: transactions, tasks, work hours, ideas, timeline blocks, agenda entries, routines, sleep times, weight, workouts, intake, thesis chapters, advisor notes, targets, training schedule, training sessions, and three read tools
- **Training advice** that reads the program, history, logged weights, and shortfall notes
- **Model chosen automatically** from what's available on the account, changeable manually
- **Human-readable error messages** for a bad key, exhausted credit, a missing model, and network trouble
- The API key never leaves the device

---

## Settings & system

- **Theme** dark / light / follow system, with the phone's status bar matching
- **Targets** — budget, water, calories, weight, work hours, sleep hours, thesis minutes
- **Daily reminders** morning and evening at configurable times
- **Training-day reminders** naming that day's sessions
- **Supabase sync** with a step-by-step in-app guide, including copyable SQL
- **JSON backup** download and restore
- **Full reset**
- **Swipe left/right** to change tabs
- **Android back button** that behaves correctly
- **Add to home screen** with its own icon and splash
- **Works fully offline**
