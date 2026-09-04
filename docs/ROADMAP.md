# Yang bisa dikembangkan

Diurut dari yang rasio manfaat-per-usahanya paling tinggi. Perkiraan waktu untuk satu orang yang sudah paham kodenya.

Sebagian besar nomor di bagian A adalah **memperbaiki kelemahan yang sudah ada**, bukan menambah fitur. Itu disengaja — lihat [KELEMAHAN.md](KELEMAHAN.md). Menambah modul ketujuh di atas fondasi yang bocor cuma menambah yang harus diperbaiki nanti.

---

## A. Kerjakan duluan

### A1. Lacak vertical jump — setengah hari

Program latihannya seluruhnya disusun untuk menaikkan lompatan, tapi lompatannya tidak pernah diukur. Ini lubang paling besar di seluruh aplikasi.

```
Form:   jangkauan berdiri, lompatan tanpa awalan, lompatan dengan awalan, tanggal
Turunan: vertical = lompatan − jangkauan berdiri
Layar:  grafik tren di tab Latihan, di atas kartu ringkasan
Ingat:  pengingat tes tiap 4 minggu
Alat:   catat_tes_lompatan buat asisten
```

Tanpa ini, tidak ada yang tahu programnya jalan atau tidak. Dengan ini, tiap keputusan latihan lain punya dasar.

### A2. Timer istirahat yang selamat dari layar mati — 2 jam

Timer sekarang mati kalau HP ditaruh di tengah istirahat 3 menit. Di gym itu bukan kasus langka, itu kasus normal.

```
mulai:   simpan stempel waktu selesai, jadwalkan notifikasi lokal
tampil:  sisa = selesai − sekarang, bukan hitungan detak
kembali: hitung ulang dari stempel waktu
```

### A3. Urungkan — satu hari

Sekarang tidak ada urungkan di mana pun, dan asisten menulis tanpa konfirmasi.

```
Tumpukan 20 aksi terakhir, tiap entri snapshot cabang yang tersentuh
Roti panggang "Batalkan" muncul 6 detik setelah aksi yang menghapus
Alat asisten yang menyentuh uang atau menghapus → konfirmasi sekali ketuk
```

Yang paling mendesak bagian asistennya: salah baca "dua juta" jadi "dua ribu" sekarang langsung masuk tanpa rem.

### A4. Persentase tembakan — setengah hari

Untuk gerakan bertipe tembakan, ganti ceklis dengan dua kolom: masuk dan percobaan.

```
Tandai gerakan basket dengan tembak: true
Kolom masuk / percobaan, persentase dihitung
Grafik persentase per spot lintas waktu
```

Ini metrik yang paling berarti buat penembak, dan sekarang hilang sepenuhnya.

### A5. Bobot per blok di persentase sesi — 1 jam

"50% selesai" sekarang bisa berarti baru pemanasan dan pendinginan yang tercentang. Beri bobot per blok, atau hitung progres hanya dari blok utama dan aksesori.

---

## B. Kalau pemakaian sudah bertahun

### B1. Sinkron per catatan — 2-3 hari

Mengganti sinkron blob dengan log perubahan. Menyelesaikan kehilangan data diam-diam waktu dua perangkat sama-sama offline.

```sql
create table perubahan (
  id bigserial primary key,
  user_id uuid, entity text, entity_id text,
  op text, payload jsonb, ts timestamptz
);
```

Klien mengirim yang belum terkirim, menarik yang lebih baru dari kursornya, membangun ulang state. Konflik jadi terdeteksi per catatan, bukan menelan seluruh dokumen.

Baru sepadan kalau perangkat kedua benar-benar dipakai rutin.

### B2. Arsip data lama — satu hari

Pisahkan apa pun yang lebih tua dari 18 bulan ke kunci IndexedDB terpisah, muat sesuai kebutuhan. Menjaga `S` tetap ramping dan sinkron tetap ringan seiring bertambahnya riwayat.

### B3. Jadikan IndexedDB sumber utama — setengah hari

localStorage sekarang ditulis sinkron di setiap `commit()`. Di 5 MB itu berarti serialisasi 5 MB di thread utama tiap kotak dicentang. Balik perannya: IndexedDB jadi utama, localStorage jadi cadangan yang ditulis tertunda.

---

## C. Bikin latihannya lebih pintar

### C1. Periodisasi 4 minggu — satu hari

Referensi yang dipakai menyusun program ini menyarankan minggu ringan tiap 3-4 minggu. Sekarang tidak ada.

```
Minggu 1-3  naik bertahap
Minggu 4    volume turun ~40%, intensitas dijaga
Tampilkan minggu ke berapa di kartu ringkasan
```

### C2. Saran beban otomatis — setengah hari

Beban tercatat tapi tidak ada yang menyarankan angka minggu depan.

```
Semua set kena target rep + rasa "enteng"     → +2,5%
Semua set kena target rep + rasa "pas"        → +2,5% cuma buat angkatan utama
Ada set yang meleset target                   → tahan
Dua sesi berturut meleset                     → turun 5%
```

Tampilkan sebagai saran di sebelah kolom input, bukan diisi otomatis.

### C3. Penghitung kontak yang lebih jujur — 3 jam

Sekarang: kontak sesi × persentase ceklis. Ganti jadi menjumlahkan kontak per gerakan yang benar-benar dicentang. Tambah input "main lepas berapa menit" yang mengestimasi kontak dari durasi, karena basket lepas sekarang sama sekali tidak terhitung.

### C4. Estimasi 1RM dan beban berbasis persen — 3 jam

Program menyebut "85-90% 1RM" tapi aplikasi tidak tahu 1RM-nya berapa. Hitung dengan rumus Epley dari set terberat, lalu tampilkan angka kilogram yang sebenarnya di sebelah persentasenya.

---

## D. Bikin pemakaian harian lebih enteng

### D1. Notifikasi yang tahu keadaan — 3 jam

Sekarang isinya statis. "Ceklis rutinitas pagi lo" muncul walau semuanya sudah kelar tadi malam. Susun isinya saat dijadwalkan dari keadaan hari itu.

### D2. Pencarian — 3 jam

Satu kolom cari yang menyapu transaksi, tugas, ide, catatan harian, dan catatan bimbingan. Sekarang mencari sesuatu dari enam bulan lalu berarti menggulir.

### D3. Ekspor CSV — 2 jam

Cadangan JSON tidak bisa dibuka di spreadsheet. Satu tombol per modul yang mengeluarkan CSV.

### D4. Widget layar utama — satu hari

Cincin rutinitas dan pengeluaran hari ini, langsung di home screen. Butuh plugin Capacitor atau sedikit kode Kotlin.

---

## E. Kualitas

### E1. Putaran aksesibilitas — satu hari

`aria-label` di semua tombol ikon, naikkan `--text-3` sampai lolos AA, tambah tanda + dan − di samping nominal supaya tidak bergantung warna saja, uji dengan TalkBack.

### E2. Tes regresi visual — setengah hari

Playwright sudah ada. Tambah perbandingan tangkapan layar per layar per tema. Menangkap perubahan CSS yang merusak tata letak, yang sekarang lolos begitu saja.

### E3. Enkripsi kunci API — 2 jam

Pindahkan ke `@capacitor/preferences` dengan EncryptedSharedPreferences di APK.

### E4. Minifikasi bundel — 1 jam

246 KB bisa jadi sekitar 80 KB. Tidak berpengaruh di dalam APK, berpengaruh di web pada jaringan lambat.

---

## F. Kalau ada yang benar-benar mau

Nomor-nomor ini besar dan belum jelas sepadan. Ditulis supaya tidak kepikiran ulang dari nol.

- **iOS** — butuh Mac dan akun Apple Developer 1,5 juta/tahun. PWA sudah menutupi sebagian besar kebutuhan.
- **Multi-pengguna / berbagi** — mengubah model data dari akarnya. Ini aplikasi satu orang.
- **Impor dari aplikasi bank** — parsing SMS atau notifikasi butuh izin sensitif dan formatnya beda tiap bank.
- **Integrasi wearable** — detak jantung dan langkah dari Health Connect. Menarik, tapi tidak menjawab pertanyaan apa pun yang sekarang belum terjawab.
- **Asisten suara di gym** — masuk akal secara situasi (tangan penuh, HP di lantai), tapi Web Speech API di WebView Android tidak bisa diandalkan.

---

## Urutan yang disarankan

Kalau mau dikerjakan berurutan:

```
1. A1  lacak vertical jump        ← tanpa ini semua latihan lain buta
2. A2  timer selamat layar mati   ← paling sering kegigit
3. A3  urungkan + konfirmasi AI   ← paling berisiko sekarang
4. A5  bobot blok                 ← 1 jam, langsung bikin angka jujur
5. A4  persentase tembakan
6. C2  saran beban
7. C1  periodisasi
```

Empat nomor pertama total sekitar dua setengah hari, dan menutup semua tanda **[!]** di [KELEMAHAN.md](KELEMAHAN.md) kecuali sinkron dan ukuran state — yang dua itu memang belum kegigit selama pemakaiannya masih satu HP.
