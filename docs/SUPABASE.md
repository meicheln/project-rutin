# Cloud sync with Supabase

Optional. Without it the app works fully; data just stays on one device.

## Setup

1. **supabase.com** → New project. Pick a region close to you.

2. **SQL Editor** → run:

```sql
create table if not exists public.rutin_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.rutin_state enable row level security;

drop policy if exists "read own row"   on public.rutin_state;
drop policy if exists "insert own row" on public.rutin_state;
drop policy if exists "update own row" on public.rutin_state;

create policy "read own row"   on public.rutin_state
  for select using (auth.uid() = user_id);
create policy "insert own row" on public.rutin_state
  for insert with check (auth.uid() = user_id);
create policy "update own row" on public.rutin_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Daily assistant quota. Deliberately has NO policies: only the Edge Function,
-- using the service role, may write it. If the user could write it themselves,
-- a leaked token could just reset the counter to zero.
create table if not exists public.rutin_kuota (
  user_id uuid  not null references auth.users(id) on delete cascade,
  hari    date  not null,
  jumlah  int   not null default 0,
  primary key (user_id, hari)
);

alter table public.rutin_kuota enable row level security;
```

3. **Authentication → Sign In / Providers → Email** → turn off *Confirm email*.

4. **Settings → API Keys** → copy the public key:
   - newer projects: **Publishable key**, starting `sb_publishable_`
   - older projects: **anon public**, starting `eyJ`

   Do not use the `secret` or `service_role` key — those bypass row-level security.

5. In the app: **gear → Sinkronisasi → Sambungkan**, paste the URL and key, sign up with email and password.

---

## Moving the Anthropic key off the phone

Optional, and worth doing. Without it the key sits in `localStorage` in the clear
([LIMITATIONS §5](LIMITATIONS.md)). With it, the key lives only in your Edge Function and the app
authenticates with its own Supabase session instead.

The app works either way — it prefers the function and falls back to a local key for the rest of the
session if the function isn't there yet.

Three commands, from the repo root. Nothing to install and no Docker needed —
`npx` fetches the CLI, and `--use-api` bundles the function on Supabase's side.

Do **not** `npm install -g supabase`; Supabase dropped support for the global npm install.

Your **project ref** is the subdomain of your project URL — `https://<ref>.supabase.co` — also
visible in the dashboard URL, and in the app under *gear → Sinkronisasi*.

### 1. Sign in

```bash
npx supabase@latest login
```

Opens a browser and gives you a code to paste back. Once per machine.

### 2. Deploy the function

`supabase/functions/asisten/index.ts` is already in this repo:

```bash
npx supabase@latest functions deploy asisten --project-ref <ref> --use-api
```

Drop `--use-api` only if you have Docker running and prefer local bundling.

### 3. Put a provider key in, as a secret

Pick one. The function checks `GEMINI_API_KEY` first, so setting it switches provider with no
redeploy and no code change.

**Gemini** — get a key from [aistudio.google.com](https://aistudio.google.com) → *Get API key*:

```bash
npx supabase@latest secrets set GEMINI_API_KEY=... --project-ref <ref>
```

The app still speaks the Anthropic request format; `supabase/functions/asisten/gemini.ts`
translates in both directions (tools → `functionDeclarations`, `tool_use` → `functionCall`,
`assistant` → `model`, and back). Covered by `tests/07-gemini.spec.mjs`, which runs without a
browser. **Read [LIMITATIONS §5](LIMITATIONS.md) before using the unpaid tier** — Google trains on
it and human reviewers may read it.

**Anthropic:**

```bash
npx supabase@latest secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref <ref>
```

This is the whole point: that value never leaves Supabase. `SUPABASE_URL`,
`SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform — you don't set
those. If the service role key is somehow absent the function still works, but the daily quota stops
being enforced and it logs an error.

### 4. Turn it on in the app

Assistant panel → **Nyalakan lewat server**. If the assistant is already running on a local key,
open its settings and use **Pindah ke server** — that verifies the function answers *before* it
deletes the key from the device.

### What the function does and does not do

| | |
|---|---|
| Verifies your Supabase session on every call | so an anonymous caller gets a 401 |
| Only forwards `/v1/messages` and `/v1/models` | it is not a general proxy for your key |
| Caps the body at 512 KB and 300 requests per user per day | a leaked session can't drain your credit |
| Never logs the request body | that's your daily data |
| Still receives the system prompt and tool list from the app | it's a thin proxy today |

That last row changes in phase 4: once Telegram can drive the assistant, there's no phone open to
compose the prompt, so it has to move server-side. See
[ROADMAP-ASSISTANT.md](ROADMAP-ASSISTANT.md).

### Troubleshooting

| Symptom | Cause |
|---|---|
| "ANTHROPIC_API_KEY belum dipasang di Edge Function" | step 3 wasn't run, or was run against a different project |
| Settings says "fungsinya belum di-deploy" | step 2 wasn't run |
| "Sesi nggak valid atau udah kedaluwarsa" | sign out and back in inside the app |
| "Udah 300 permintaan hari ini" | the daily quota; raise `BATAS_HARIAN` in the function and redeploy |
| Deploy fails mentioning Docker | add `--use-api` |
| `--project-ref only applies when targeting the linked project` | that is `db query`, not `functions deploy` — it needs `--linked --project-ref <ref>` together |
| `login` says "Cannot use automatic login flow inside non-TTY" | run it in a real terminal, not from a script or an agent |
| `relation "rutin_kuota" does not exist` in the function logs | the SQL in step 2 above wasn't run on this project |

Read the function's own logs in the dashboard under **Edge Functions → asisten → Logs** — the error
messages there are written to say exactly which step is missing.

---

## How it works

One row per user holding the entire `S` object as JSONB. Pushes are debounced 1.4 seconds after a change, plus an immediate push when the app is backgrounded. On pull, whichever side has the newer `updatedAt` wins.

The public key is safe to ship because row-level security confines each account to its own row.

**The limitation:** last-write-wins at whole-document level. Two devices both edited while offline will lose one side's changes. See [LIMITATIONS.md](LIMITATIONS.md) §1.

## Troubleshooting

| Symptom | Usual cause |
|---|---|
| "Nggak bisa nyambung" (can't connect) | the URL has a stray space or trailing slash |
| "Email atau password salah" | Confirm email is still on, so the account isn't active |
| Sync runs but no data appears | the table wasn't created, or the policies didn't apply |
| Sync icon stays red | check Network in devtools; 401 = wrong key, 42501 = policy |
