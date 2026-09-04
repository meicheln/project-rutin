# Rutin

Pelacak harian pribadi. Satu tempat buat kegiatan dari bangun sampai tidur, uang masuk-keluar, skripsi, kerjaan, badan, program latihan, dan ide konten.

Satu file HTML tanpa dependensi sisi klien, dibungkus jadi aplikasi Android lewat Capacitor. Ada asisten Claude di dalamnya yang bisa mencatat dan mengubah isi aplikasi lewat bahasa sehari-hari.

```
dist/rutin.html   ~246 KB   buka di browser mana pun
dist/Rutin.apk    ~3,2 MB   Android 6.0+
```

---

## Mulai cepat

```bash
npm install                    # cuma Playwright, buat tes
npx playwright install chromium

npm run build                  # src/ → dist/rutin.html
npm test                       # build + 190-an assert lewat browser sungguhan
npm run serve                  # coba di http://localhost:8099
```

Bikin APK:

```bash
npm run ikon                   # ikon peluncur, ikon notifikasi, splash
npm run android:siapkan        # sekali di awal — pasang Capacitor, bikin keystore
npm run android:build          # → dist/Rutin.apk
```

Syarat buat APK: JDK 17 atau 21, Android SDK (platform 35 + build-tools 35), Python dengan Pillow buat ikon. Detailnya di [docs/ANDROID.md](docs/ANDROID.md).

---

## Isi repo

```
build.mjs               penggabung src → dist, sekalian pemeriksa
package.json

src/                    kode sumber, digabung urut nomor
  00-head.html          <head>, token warna, seluruh CSS
  01-shell.html         markup kerangka: layar, nav, sheet, panel
  10-core.js            helper, bentuk data, penyimpanan, tema, navigasi, Supabase
  11-storage-native.js  IndexedDB, jembatan Capacitor, pengingat
  12-charts.js          grafik SVG buatan tangan
  20-view-beranda-harian.js
  21-view-uang-progres-ide.js
  22-view-latihan.js    katalog program + layar & sesi latihan
  30-form.js            semua form, delegasi event, pengaturan
  31-asisten.js         asisten Claude: alat, putaran tool-use, UI chat
  40-gerbang-boot.js    layar setup awal, manifest PWA, boot

tests/                  Playwright, tiap spec berdiri sendiri
  jalan.mjs             penjalan, keluar kode 1 kalau ada yang gagal
  bantu.mjs             server statis + helper + assert
  01-inti … 06-tahan-banting

tools/
  buat-ikon.py          bikin ikon & splash dari satu skrip
  android.mjs           siapkan/build proyek Capacitor
  sajikan.mjs           server statis buat nyoba
  seed-demo.js          45 hari data contoh buat tes & tangkapan layar

docs/
  ARSITEKTUR.md         cara kerjanya, dari boot sampai sinkron
  FITUR.md              daftar fitur lengkap per modul
  KELEMAHAN.md          batasan yang diketahui, apa adanya
  ROADMAP.md            yang bisa dikembangin, sudah diurut
  PROGRAM-LATIHAN.md    program gym & basket lengkap
  ANDROID.md            build APK dari nol
  SUPABASE.md           pasang sinkron cloud

android-config/
  capacitor.config.json
```

---

## Kenapa bentuknya begini

**Satu file HTML.** Hasil akhirnya harus bisa dibuka dari mana saja — dibundel ke APK, ditaruh di hosting statis, atau diklik dua kali dari folder. Nggak ada langkah transpile, nggak ada `node_modules` di sisi klien, nggak ada yang bisa rusak gara-gara versi bundler berubah. Kode dipecah supaya enak digarap; `build.mjs` cuma nyambungin sesuai urutan nomor.

**Vanilla, tanpa framework.** Untuk aplikasi satu pengguna dengan data sebesar ini, React plus tooling-nya menambah ratusan kilobyte dan satu lapis lagi yang bisa bermasalah, tanpa memecahkan masalah yang benar-benar ada di sini. Perenderannya sederhana: ubah state, panggil `render()`, layar aktif digambar ulang.

**Grafik digambar tangan.** Chart.js dan sejenisnya berat dan bawa tampilan yang seragam. Enam fungsi SVG kecil di `12-charts.js` menghasilkan grafik yang menyatu dengan sistem desainnya dan tetap jalan offline tanpa CDN.

**Penyimpanan dua lapis.** `localStorage` sinkron dan langsung, jadi dia yang jadi jaring pengaman kalau aplikasi mati mendadak. IndexedDB muat lebih banyak dan lebih tahan, tapi asinkron. Yang ditulis ke keduanya, dan yang dibaca lebih dulu waktu boot adalah yang versinya lebih baru.

Alasan lengkap tiap keputusan ada di [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md).

---

## Keadaan sekarang

| | |
|---|---|
| Baris kode | ~3.950 |
| Ukuran bundel | 246 KB (belum diminifikasi, belum dikompres) |
| Assert di tes | 190-an, lewat browser sungguhan |
| Dependensi klien | nol |
| Dependensi build | Node 20+, Playwright buat tes |
| Modul | 6 layar + panel asisten + panel sesi latihan |
| Alat asisten | 19 |

Yang **belum** dikerjakan dan sadar dipilih begitu, ada di [docs/KELEMAHAN.md](docs/KELEMAHAN.md). Baca itu dulu sebelum nambah fitur — beberapa keterbatasan di sana lebih layak dibereskan daripada bikin yang baru.

---

## Lisensi

Pribadi. Nggak buat disebar ulang.
