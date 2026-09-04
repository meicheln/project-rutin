# Arsitektur

Bagaimana Rutin bekerja, dari boot sampai sinkron. Ditulis untuk orang yang mau mengubah kodenya.

---

## 1. Gambaran besar

```
                       ┌─────────────────────────────┐
                       │        satu objek S         │
                       │  seluruh isi aplikasi ada   │
                       │        di sini              │
                       └──────────┬──────────────────┘
              commit()            │            render()
        ┌───────────────────┐     │     ┌────────────────────┐
        ▼                   ▼     ▼     ▼                    ▼
  localStorage        IndexedDB   │   layar aktif      antrean sinkron
  (sinkron, cepat)   (async, luas)│   digambar ulang   (tunda 1,4 detik)
                                  │                          │
                                  │                          ▼
                                  │                   Supabase (1 baris)
                                  │
                            asisten Claude
                       (baca ringkasan, panggil alat)
```

Nggak ada framework, nggak ada state management library, nggak ada observer. Satu objek global `S`, satu fungsi `commit()`, satu fungsi `render()`. Setiap perubahan lewat `commit()`.

---

## 2. Urutan boot

`40-gerbang-boot.js` menutup bundel dan menjalankan semuanya:

```
applyTheme()          pasang tema sebelum apa pun tergambar, biar nggak kedip
Store.init()          buka IndexedDB
Store.load()          kalau versi di IndexedDB lebih baru dari localStorage, pakai itu
Store.flush()         samakan lagi dua lapisnya
LT()                  siapin bentuk data latihan
go('home')            gambar layar pertama
Native.init()         status bar, splash, tombol back, siklus hidup app
Notif.apply()         jadwalkan ulang semua pengingat
  ↓
Cloud.configured()?
  ya  → Cloud.restore() → sesi masih hidup? → tutup gerbang, syncDown()
                                            → nggak: buka layar masuk
  nggak → mode 'local'? → tutup gerbang
        → belum pernah → buka gerbang perkenalan
```

Urutannya penting. Penyimpanan dibuka **sebelum** layar pertama digambar — kalau dibalik, pengguna sempat melihat data lama sepersekian detik sebelum tertimpa data yang benar.

---

## 3. Bentuk data

Semua ada di satu objek `S`. Bentuk lengkapnya didefinisikan di `seed()` (`10-core.js`).

```js
S = {
  v: 1,                    // versi bentuk data, dipakai buat validasi cadangan
  updatedAt: 1755...,      // epoch ms — ini yang nentuin siapa menang waktu sinkron
  profile:  { nama, mulai },
  settings: { theme, budget, targetTidur, targetAir, targetKalori,
              targetSkripsiMenit, beratTarget, jamKerjaTarget,
              ingatkan, jamPagi, jamMalam },

  routines: [ {id, n, tag} ],                    // tag: pagi | badan | fokus | malam
  days: {                                        // dikunci tanggal 'YYYY-MM-DD'
    '2026-08-17': {
      bangun, tidur, mood, energi, catatan,
      rt: { routineId: true },                   // centang rutinitas
      blocks: [ {id, s, e, c, t} ]               // c = kategori kegiatan
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
    jadwal: { 0..6: ['lowerA', ...] },           // 0 = Minggu
    sesi:   [ {id, d, sid, mulai, selesai, ceklis:{exId:bool},
               set:{exId:[{kg,rep}]}, kurang, rasa, dicatat} ],
    jamIngat, ingatLatihan
  }
}
```

### Kenapa pakai objek, bukan tabel

Ini aplikasi satu pengguna. Data sebesar 45 hari pemakaian penuh keluar di sekitar 300 KB JSON. Selama masih di bawah beberapa megabyte, satu objek jauh lebih sederhana: nggak ada join, nggak ada migrasi skema, cadangan tinggal `JSON.stringify`, dan sinkron tinggal ngirim satu baris.

Batasnya nyata dan ada di [KELEMAHAN.md](KELEMAHAN.md) bagian 2.

### Dua tempat data ditulis di luar `S`

- `LS.get('rutin.sb')` — URL dan kunci publik Supabase
- `LS.get('rutin.ai')` — kunci API Anthropic dan model pilihan

Sengaja dipisah: keduanya milik perangkat itu, bukan milik akun. Kalau ikut ke `S`, kunci API bakal ikut tersinkron ke semua perangkat lain — bukan yang diinginkan.

---

## 4. Perenderan

```js
function commit(rerender = true){
  S.updatedAt = Date.now();
  LS.set('rutin.state', S);      // sinkron, langsung — jaring pengaman
  Store.save();                  // IndexedDB, ditunda 250 ms
  pushTimer = setTimeout(Cloud.push, 1400);
  if (rerender) render();
}

function render(){
  applyTheme();
  if (view==='home')  renderHome();
  ...
}
```

Tiap fungsi `renderX()` menyusun satu string HTML dan menugaskannya ke `innerHTML` wadahnya. Nggak ada diffing, nggak ada virtual DOM.

Untuk ukuran data di sini itu cepat — layar Uang dengan 126 transaksi tergambar dalam beberapa milidetik. Konsekuensinya dibahas di [KELEMAHAN.md](KELEMAHAN.md) bagian 3.

### Kapan `render()` sengaja dihindari

Dua tempat menggambar ulang secara bertarget karena menggambar ulang penuh akan merusak pengalaman:

- **`toggleCeklis()`** (`22-view-latihan.js`) — mencentang gerakan di tengah sesi. Menggambar ulang seluruh panel akan mengembalikan scroll ke atas dan menutup petunjuk teknik yang sedang dibaca. Jadi yang diubah cuma kelas elemennya, plus bar progres di kepala.
- **`gambarSesi()`** menyimpan `scrollTop` dan daftar petunjuk yang terbuka sebelum menulis ulang, lalu mengembalikannya.

Ini pelajaran yang didapat dari tes: keduanya dulu bug, sekarang ada assert yang menjaganya (`03-latihan.spec.mjs`).

### Delegasi event

Semua interaksi lewat satu `document.addEventListener('click', ...)` yang membaca atribut `data-*`:

```html
<button data-sheet="out">        buka form pengeluaran
<button data-rt="r3">            centang rutinitas
<button data-tx="abc123">        buka transaksi buat diubah
<button data-go="money">         pindah layar
```

Karena markup terus ditulis ulang, memasang listener per elemen akan bocor dan lepas. Delegasi bikin itu nggak jadi masalah.

---

## 5. Penyimpanan

### Kenapa dua lapis

| | localStorage | IndexedDB |
|---|---|---|
| Sinkron | ya | tidak |
| Kuota umum | 5-10 MB | ratusan MB |
| Selamat saat app dibunuh mendadak | ya, tulisannya langsung selesai | tidak, kalau transaksinya belum kelar |

`localStorage` yang jadi jaring pengaman: ditulis **sinkron** di setiap `commit()`, jadi kalau Android membunuh aplikasi sedetik kemudian, datanya sudah di disk. IndexedDB ditulis menyusul dan menampung lebih banyak.

Saat boot, yang `updatedAt`-nya lebih baru yang dipakai.

### Pemicu tulis paksa

```js
['pagehide','freeze','blur']  →  LS.set + Store.flush()
visibilitychange (hidden)     →  LS.set + Store.flush()
appStateChange (native)       →  LS.set + Store.flush() + Cloud.push()
```

Semua akses `localStorage` dibungkus try/catch dengan cadangan objek di memori — mode penyamaran dan pengaturan browser yang memblokir penyimpanan tidak boleh membuat aplikasi mati. Diuji di `06-tahan-banting.spec.mjs`.

---

## 6. Sinkron

### Skema

Satu tabel, satu baris per pengguna:

```sql
create table public.rutin_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
```

RLS memastikan tiap orang hanya bisa membaca dan menulis barisnya sendiri. Karena itu kunci publik aman dipajang di aplikasi.

### Protokolnya

```
Perubahan lokal  → tunda 1,4 detik → upsert seluruh objek
App ke latar     → langsung upsert
Boot / tombol sinkron → tarik → remote.updatedAt > lokal.updatedAt ?
                                   ya  : pakai remote
                                   tidak: dorong lokal
```

Menang-mana ditentukan `updatedAt`, bukan `updated_at` milik server — supaya waktu yang dipakai berasal dari perangkat yang benar-benar mengubah data.

**Yang perlu disadari:** ini terakhir-menulis-menang di tingkat seluruh dokumen. Dua perangkat yang sama-sama diubah saat offline, lalu sama-sama online, akan membuat perubahan salah satu hilang tanpa pemberitahuan. Alasan dan rencana perbaikannya di [KELEMAHAN.md](KELEMAHAN.md) bagian 1.

### Memuat pustaka

`@supabase/supabase-js` diimpor dinamis dari CDN saat pertama dibutuhkan:

```js
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
```

Kalau sinkron tidak dinyalakan, pustakanya tidak pernah diunduh, dan aplikasi jalan penuh offline.

---

## 7. Jembatan native

`11-storage-native.js` membungkus semua yang khusus Capacitor. Aplikasi memeriksa `Native.on` sekali dan menyesuaikan; kode selebihnya tidak tahu-menahu.

| Kebutuhan | Native (APK) | Web |
|---|---|---|
| Warna status bar | plugin StatusBar | meta `theme-color` |
| Pengingat | LocalNotifications, jalan di latar | Notification API, cuma saat tab kebuka |
| Panggilan API Anthropic | CapacitorHttp (lolos CORS) | `fetch` + header izin browser |
| Tombol back | listener App | — |
| Simpan saat ke latar | `appStateChange` | `visibilitychange` |

### Kenapa CapacitorHttp buat asisten

WebView Android menyajikan aplikasi dari `https://localhost`. Panggilan `fetch` ke `api.anthropic.com` dari sana kena aturan CORS. CapacitorHttp melakukan permintaannya secara native, jadi CORS tidak berlaku sama sekali — lebih andal daripada mengandalkan header izin browser.

Di web, header `anthropic-dangerous-direct-browser-access` yang dipakai.

### Tombol back

```
panel asisten kebuka?  → tutup
sheet kebuka?          → tutup
di gerbang awal?       → abaikan (jangan sampai keluar di tengah setup)
bukan di beranda?      → balik ke beranda
selain itu             → keluar aplikasi
```

### Pengingat

Dua kelompok, dijadwal ulang setiap kali pengaturannya berubah:

- id 101, 102 — pengingat pagi dan malam
- id 210-216 — satu per hari latihan, isinya nama sesi hari itu

Android 14 bisa menolak alarm presisi. Kode mencoba `allowWhileIdle: true` dulu, dan kalau ditolak, mundur ke penjadwalan biasa alih-alih gagal diam-diam.

Bug yang pernah ada di sini: pengingat hari latihan dulu terhalang saklar pengingat harian, jadi tidak pernah terjadwal kalau pengingat harian mati. Sekarang keduanya disusun terpisah lalu dikirim bersama. Dijaga oleh assert di `05-native.spec.mjs`.

---

## 8. Asisten

### Jalur permintaan

```
pengguna ngetik
  → AI.raw.push({role:'user'})
  → POST /v1/messages { system: AI_SYS(), tools: AI_TOOLS, messages: AI.raw }
  → jawaban punya tool_use?
       ya  → jalanin tiap alat lokal → tool_result → kirim lagi (maks 8 putaran)
       tidak → tampilkan teks, selesai
  → commit()
```

Batas 8 putaran mencegah model berputar-putar memanggil alat tanpa henti.

### Alat

19 alat, semuanya sinkron dan langsung menyentuh `S`. Tiap alat mengembalikan satu kalimat bahasa Indonesia, bukan JSON — kalimat itu jadi `tool_result`, dan juga ditampilkan ke pengguna sebagai baris hijau bercentang supaya bisa dicek kalau ada yang salah taruh.

```
catat_transaksi      tambah_tugas          selesaikan_tugas
catat_jam_kerja      simpan_ide            catat_blok_waktu
centang_rutinitas    atur_jam_tidur        catat_berat
catat_latihan        catat_asupan          ubah_bab_skripsi
catat_bimbingan      tambah_rutinitas      atur_target
baca_latihan         catat_sesi_latihan    ubah_jadwal_latihan
baca_data
```

Pencocokan nama (tugas, rutinitas, bab) pakai `cocok()` yang bertingkat: sama persis → mengandung → dikandung. Kalau tidak ketemu, alat mengembalikan daftar pilihan yang ada, supaya model bisa memperbaiki sendiri di putaran berikutnya alih-alih menyerah.

### Yang dikirim ke Anthropic

`AI_SYS()` menyusun system prompt berisi aturan plus ringkasan padat: tanggal hari ini, nama, jumlah rutinitas selesai, runtutan, total uang bulan ini, persen skripsi, daftar tugas terbuka, berat terakhir, sesi latihan hari ini, kontak lompatan.

Yang **tidak** dikirim otomatis: seluruh riwayat transaksi, isi catatan harian, catatan bimbingan. Itu hanya terkirim kalau model memanggil `baca_data` atau `baca_latihan` — artinya hanya ketika pertanyaannya memang butuh.

Pilihan ini menekan biaya dan mengurangi data yang keluar tiap pesan.

### Model

Tidak dipatok di kode. Setelah kunci dimasukkan, aplikasi memanggil `GET /v1/models` dan memilih yang namanya mengandung "sonnet", atau yang pertama. Jadi tidak basi saat model baru dirilis, dan tidak akan meminta model yang tidak ada di akun pengguna.

---

## 9. Modul latihan

Bagian yang paling banyak isinya, dan satu-satunya yang punya pengetahuan bawaan.

### Katalog program

`PROGRAM` adalah konstanta: 8 sesi → blok → gerakan.

```js
lowerA: {
  n, jenis:'gym', menit:85, warna, ikon, fokus,
  blok: [
    { n:'Plyometric reaktif', m:20, catatan:'…',
      ex: [ { id, n, set, rep, ist, int, kontak, cue, log } ] }
  ]
}
```

- `kontak` — berapa kontak lompatan intensitas tinggi. Ini yang dijumlahkan jadi pengaman cedera.
- `log: true` — gerakan ini menampilkan kolom kg × rep per set.
- `cue` — petunjuk teknik. Setiap gerakan wajib punya; ada assert yang menjaganya.

Katalognya statis dan bukan bagian dari `S`. Yang masuk `S.latihan.sesi` cuma catatan: centang, beban, catatan kekurangan.

**Konsekuensinya:** kalau `id` gerakan diubah, catatan lama jadi yatim. Lihat [KELEMAHAN.md](KELEMAHAN.md) bagian 9.

### Aturan yang dikodekan

Program ini menegakkan beberapa hal yang diuji otomatis, bukan sekadar ditulis di dokumen:

1. Sesi gym ≤ 90 menit, sesi basket ≤ 120 menit
2. Menit tiap blok harus berjumlah persis sama dengan durasi sesi
3. Hari lower tidak pernah berbarengan dengan basket
4. Total kontak lompatan seminggu ≤ 200 (batas untuk level lanjut)
5. Setiap gerakan punya petunjuk teknik dan set/rep yang sah

Kalau salah satu dilanggar, `npm test` gagal. Ini pilihan yang disengaja: aturan-aturan itu alasan programnya aman, jadi tempatnya di tes, bukan cuma di catatan.

### Penghitung kontak

```js
function kontakMinggu(){
  const hari = mingguIni();
  return sum(LT().sesi.filter(s => hari.includes(s.d)),
             s => kontakSesi(s.sid) * sesiKelar(s));
}
```

Dihitung dari sesi yang **dicatat**, bukan dari jadwal — kalau Lower A digeser ke hari lain, kontaknya tetap masuk hitungan. Dulu ini dihitung dari jadwal dan itu bug; ketahuan oleh tes.

Perhatikan `× sesiKelar(s)`: hasilnya diskalakan dengan persentase ceklis. Ini perkiraan kasar, dan kelemahannya dibahas di [KELEMAHAN.md](KELEMAHAN.md) bagian 11.

### Ke mana sesi mengalir

Sesi yang diselesaikan menulis ke dua tempat lain, sekali saja (dijaga bendera `dicatat`):

- `days[hari].blocks` — muncul di linimasa harian sebagai blok olahraga
- `badan.latihan` — muncul di grafik latihan tab Badan

Jadi pengguna tidak mencatat dua kali.

---

## 10. Sistem desain

Token warna di `:root`, ditimpa per tema di `[data-theme]`. Tidak ada warna yang ditulis langsung di komponen.

Keputusan yang membentuk tampilannya:

- **Monokrom dulu.** UI dan tombol pakai netral (`--inv` / `--inv-fg`). Warna disimpan khusus untuk data — hijau untuk masuk, merah untuk keluar, satu warna per kategori. Membuat UI-nya tenang dan bikin grafiknya menonjol tanpa usaha.
- **Blur seperlunya.** `backdrop-filter` cuma di nav bawah dan latar sheet. Riset menunjukkan blur berat menurunkan FPS 15-30% di Android kelas menengah.
- **Plus Jakarta Sans** dengan cadangan font sistem. Kalau font gagal dimuat, tampilan tetap benar.
- **`font-size: 16px` di semua input.** Di bawah itu iOS otomatis nge-zoom saat input difokus.
- **Area ketuk ≥ 44 px** untuk kontrol utama.
- **`prefers-reduced-motion`** mematikan semua animasi.

---

## 11. Build

```bash
node build.mjs --check
```

Menggabung `src/*` urut nomor, lalu memeriksa:

1. Tiap blok `<script>` valid sintaksnya (`new Function`)
2. Kerangka HTML utuh
3. Semua id yang dipakai boot ada di markup
4. Tidak ada penanda konflik merge yang kebawa

Keluar dengan kode 1 kalau ada yang gagal, jadi bisa dipasang di CI.

Yang **tidak** dilakukan: minifikasi, tree-shaking, source map. Untuk bundel 246 KB yang dilayani dari dalam APK, tidak ada yang sepadan dengan kerumitan tambahannya.

---

## 12. Tes

Enam spec, 190-an assert, Playwright di viewport 390×844.

| Spec | Yang dijaga |
|---|---|
| 01-inti | tanggal (kabisat, ganti tahun), format rupiah, runtutan, tidur nyeberang tengah malam, penyimpanan waktu localStorage mati |
| 02-modul | alur lima layar lewat UI beneran, data bertahan setelah muat ulang |
| 03-latihan | aturan program, mode sesi, timer, integrasi ke modul lain |
| 04-asisten | tiap pelaksana alat, putaran tool-use, pesan galat |
| 05-native | notifikasi, tombol back, status bar, HTTP native |
| 06-tahan-banting | dua lapis penyimpanan, pemulihan, cadangan, aturan menang-mana |

Yang dites adalah **perilaku lewat UI**, bukan fungsi internal. `02-modul.spec.mjs` mengisi form, mengetuk chip, dan menekan simpan seperti manusia. Tes seperti ini menangkap masalah nyata: kalau chip kategori berhenti mengisi input tersembunyi, tesnya gagal — padahal tes unit terhadap `catOf()` akan tetap lolos.

Yang **tidak** terjaga: perangkat sungguhan, iOS, dan Supabase asli (jaringannya di-stub). Lihat [KELEMAHAN.md](KELEMAHAN.md) bagian 17.
