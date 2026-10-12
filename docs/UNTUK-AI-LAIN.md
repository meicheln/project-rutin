# Baca ini dulu

Buat AI mana pun yang dimintai saran soal aplikasi Rutin tanpa bisa baca
repo-nya sendiri. Tempel berkas ini **sebelum** nanya apa pun.

Kalau saranmu nggak cocok sama fakta di bawah, saranmu yang salah, bukan
berkas ini. Semua angka di sini diambil dari kode dan dari data pemakaian
asli, bukan dari ingatan.

---

## 1. Stack — ini yang paling sering salah ditebak

| | |
|---|---|
| Bahasa | **JavaScript polos.** Nol framework, nol dependency runtime |
| Bentuk | **Satu file HTML.** `build.mjs` nyatuin `src/*` jadi `dist/rutin.html` (5.473 baris, 334 KB) |
| State | Satu objek global `S`, satu `commit()`, satu `render()` |
| Android | Capacitor ngebungkus file HTML itu jadi APK |
| Backend | Supabase: satu baris JSONB per user + satu Edge Function (Deno/TS) sebagai proksi AI |
| Model AI | Gemini lewat adapter bentuk-Anthropic di `supabase/functions/asisten/gemini.ts` |
| Tes | 314 assertion Playwright, hijau |
| Pengguna | **Satu orang.** Pemiliknya sendiri. Bukan produk multi-tenant |

**BUKAN Flutter. BUKAN Dart. BUKAN React/Vue/Svelte.** Nggak ada
`pubspec.yaml`, nggak ada `.dart`, nggak ada `node_modules` di sisi klien,
nggak ada langkah transpile.

Konsekuensinya buat saran teknis: **nggak ada** state management library,
**nggak ada** router, **nggak ada** layer/repository/DI, dan nggak ada
tempat buat masang itu tanpa nulis ulang semuanya. Saran yang mulai dari
"pasang Riverpod/Bloc/Redux" atau "pisahkan ke layer domain" nggak bisa
dipakai di sini.

---

## 2. Kenapa arsitekturnya begitu — ini keputusan, bukan kelalaian

Hasil akhirnya harus **satu berkas yang bisa dibuka dari mana aja**: dibundel
ke APK, ditaruh di hosting statis, atau diklik dua kali dari folder. Itu
batasan produk, dan itu yang nentuin bentuk kodenya.

Di ukuran ini — 5.473 baris, satu pengguna — satu objek `S` plus satu
`commit()` itu **bukan utang teknis.** Itu alasan kenapa 314 tes bisa jalan
tanpa satu pun mock. Nambah lapisan di atasnya nambah tempat buat bug tanpa
nambah kemampuan.

Kalau mau nyaranin perubahan arsitektur, tunjukin dulu bug atau batasan
nyata yang disebabkan bentuk sekarang. "Belum ideal" bukan alasan.

---

## 3. Data pemakaian asli

Ini penting buat nimbang usulan fitur:

| Modul | Catatan | Status |
|---|---|---|
| Keuangan | 34 transaksi | **hidup** |
| Latihan gym | 11 sesi | **hidup** |
| Catatan harian | 7 hari | tipis |
| Ide konten | 2 | hampir mati |
| Agenda | 1 | hampir mati |
| Berat badan | 1 | hampir mati |
| Tugas | 0 | **mati** |
| Jam kerja | 0 | **mati** |

Dari enam modul yang udah ada, **empat nggak kepakai.** Usulan yang nambah
modul ketujuh, kedelapan, kesembilan di atas ini harus jelasin dulu kenapa
yang baru bakal kepakai padahal yang lama nggak. Yang nempel cuma modul yang
punya pemicu alami: abis jajan keinget, abis latihan keinget.

---

## 4. Yang udah jadi (jangan disaranin bikin lagi)

Keuangan lengkap (masuk/keluar, budget, kategori, analitik, grafik) ·
program latihan dengan ~150 gerakan alternatif yang bisa ditukar · log
set/rep/beban · timer istirahat yang tahan layar mati · grafik progres
kekuatan per gerakan (perkiraan 1RM Epley) · berat/kalori/air/tidur ·
checklist rutinitas + runtutan · agenda + banding rencana-vs-kejadian ·
time blocking · bank ide · tracker skripsi · notifikasi yang bisa dibales
langsung dari notification shade · ekspor CSV 9 berkas · cadangan/pulihkan ·
asisten AI dengan 23 alat + riwayat obrolan yang kesimpen · sinkron cloud ·
undo buat tulisan yang nggak kelihatan formnya.

**Belum ada:** sistem target/goal, modul proyek, life score, timeline,
sharing/kolaborasi, pencarian universal, deteksi pola.

---

## 5. Keamanan — udah dikerjain, jangan disaranin dari nol

- API key AI **di server**, bukan di APK. Edge Function yang pegang.
- JWT diverifikasi `auth.getUser()` tiap permintaan.
- Path di-allowlist: cuma `/v1/messages` dan `/v1/models`.
- Badan permintaan dibatasi 512 KB. Kuota 300/hari.
- Tabel kuota & galat: **RLS nyala, nol policy.** Cuma service role yang
  nulis — biar counter-nya nggak bisa direset dari klien.
- Edge Function **nggak pernah nyatat isi obrolan.** Cuma status, model,
  dan pesan galat dari provider.
- Nama pengguna, judul skripsi, dan nama dosen **nggak dikirim** ke AI.

**Yang disadari dan diterima pemiliknya:** Gemini tier gratis ngelatih model
dari apa yang dikirim dan ngizinin peninjauan manusia. Data keuangan dan
badan ikut kekirim. Pemiliknya udah dikasih tau dan tetap milih itu. Ini
trade-off yang udah diputusin, bukan temuan baru.

---

## 6. Masalah yang masih terbuka — dan status buktinya

**Fakta terverifikasi:**
- Paritas alat AI bersih: 23 alat didefinisikan, 23 ada handler. Nol nyangkut.
- Satu penyebab error AI udah ketemu dan udah di-deploy: Gemini nolak tiap
  giliran kedua karena `thoughtSignature` nggak di-round-trip.
- 20 batasan lain udah ditulis sendiri di `docs/LIMITATIONS.md`, lengkap
  sama penanda keparahan. Yang bertanda `[!]` bisa bikin kehilangan data.

**Hipotesis, BELUM terbukti:**
- Dua alat pakai `type:'array'` di skemanya (`tambah_agenda`,
  `ubah_jadwal_latihan`). Array itu bentuk paling rewel buat Gemini. Cocok
  sama gejala "catat transaksi jalan, perintah lain gagal" — tapi belum ada
  buktinya.

**Informasi yang masih dibutuhkan, dan ini yang ngeblokir semuanya:**
- Tabel `rutin_galat` **masih nol baris.** Dia nyatet penyebab asli tiap
  kegagalan AI, tapi pemiliknya masih pakai APK lama. Sampai ada satu galat
  kecatat, **"AI sering error" itu masih laporan gejala, belum diagnosis.**
- UI/UX belum pernah diaudit. Nggak ada layar yang pernah dibuka di HP
  sungguhan oleh siapa pun yang nulis dokumen ini.
- Performa dan latensi belum diukur sama sekali.

Nebak penyebab error di titik ini pernah bikin pemiliknya kebuang sehari
ngejar masalah yang salah. Pesan galat yang nebak lebih bahaya daripada
nggak ada pesan galat.

---

## 7. Berkas yang perlu dibaca sebelum nyimpulin apa pun

| Berkas | Isi |
|---|---|
| `docs/ARCHITECTURE.md` | 536 baris: bentuk `S`, urutan boot, jalur sync, lapisan AI |
| `docs/LIMITATIONS.md` | 20 batasan yang udah diketahui + keparahannya |
| `docs/FEATURES.md` | apa yang beneran ada, per layar |
| `docs/ROADMAP-ASSISTANT.md` | rencana 6 fase asisten, mana yang udah kelar |
| `src/10-core.js` | `seed()` = bentuk data lengkap. `migrate()`, `commit()`, `Undo` |
| `src/31-asisten.js` | 23 alat AI, system prompt, dua jalur transport |
| `supabase/functions/asisten/` | proksi + adapter Gemini |
