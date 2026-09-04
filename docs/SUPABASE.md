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
```

3. **Authentication → Sign In / Providers → Email** → turn off *Confirm email*.

4. **Settings → API Keys** → copy the public key:
   - newer projects: **Publishable key**, starting `sb_publishable_`
   - older projects: **anon public**, starting `eyJ`

   Do not use the `secret` or `service_role` key — those bypass row-level security.

5. In the app: **gear → Sinkronisasi → Sambungkan**, paste the URL and key, sign up with email and password.

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
