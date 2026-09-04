# Sinkron Supabase

Opsional. Tanpa ini aplikasi jalan penuh, data cuma nempel di satu perangkat.

## Pasang

1. **supabase.com** → New project, region Southeast Asia (Singapore).

2. **SQL Editor** → jalankan:

```sql
create table if not exists public.rutin_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.rutin_state enable row level security;

drop policy if exists "baca punya sendiri"  on public.rutin_state;
drop policy if exists "tulis punya sendiri" on public.rutin_state;
drop policy if exists "ubah punya sendiri"  on public.rutin_state;

create policy "baca punya sendiri"  on public.rutin_state
  for select using (auth.uid() = user_id);
create policy "tulis punya sendiri" on public.rutin_state
  for insert with check (auth.uid() = user_id);
create policy "ubah punya sendiri"  on public.rutin_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

3. **Authentication → Sign In / Providers → Email** → matikan *Confirm email*.

4. **Settings → API Keys** → salin kunci publiknya:
   - proyek baru: **Publishable key**, diawali `sb_publishable_`
   - proyek lama: **anon public**, diawali `eyJ`

   Jangan ambil yang `secret` atau `service_role` — itu menembus RLS.

5. Di aplikasi: **gerigi → Sinkronisasi → Sambungkan**, tempel URL dan kunci, daftar dengan email dan password.

## Cara kerjanya

Satu baris per pengguna berisi seluruh objek `S` sebagai JSONB. Dorong ditunda 1,4 detik setelah perubahan, plus segera saat aplikasi ke latar. Saat menarik, yang `updatedAt`-nya lebih baru yang menang.

Kunci publik aman dipajang karena RLS membatasi tiap orang ke barisnya sendiri.

**Batasannya:** terakhir-menulis-menang di tingkat seluruh dokumen. Dua perangkat yang sama-sama diubah saat offline akan membuat perubahan salah satu hilang. Lihat KELEMAHAN.md bagian 1.

## Kalau bermasalah

| Gejala | Sebab biasanya |
|---|---|
| "Nggak bisa nyambung" | URL ada spasi atau garis miring di ujung |
| "Email atau password salah" | Confirm email masih nyala, akunnya belum aktif |
| Sinkron jalan tapi data nggak muncul | tabel belum dibuat, atau policy belum jalan |
| Ikon sinkron merah | cek Network di devtools; 401 = kunci salah, 42501 = policy |
