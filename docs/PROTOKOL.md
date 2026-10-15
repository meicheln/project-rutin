# Protokol pengamatan — 15 s/d 29 Oktober 2026

Satu halaman. Nol kode baru. Nol fitur baru.

---

## 1. Pembekuan

**Garis dasar = versi aplikasi per 13 Oktober 2026** (commit `e5603d2`), bukan
rollback. Selama 14 hari:

- Nggak ada modul baru
- Nggak ada perubahan desain atau form
- Nggak ada perubahan program latihan
- Cuma bug kritis yang boleh dibenerin — **kritis = kehilangan data atau
  aplikasi nggak kebuka.** Bukan "jelek", bukan "kurang enak"
- Tiap pengecualian ditulis di bagian 6, dengan tanggal dan alasannya
- Semua ide baru masuk `BACKLOG.md`, nggak dikerjain

**Pencatat pemakaian: dibatalin.** Bukan ditunda — dibatalin buat putaran
ini. Nulis dia berarti ngelanggar pembekuan di hari pertama.

---

## 2. Tiga mekanisme, tiga ramalan

Dipisah, bukan disatuin. Ini koreksi yang bener: ketiganya meramal hal beda.

| | Mekanisme | Modulnya | Ramalannya selama 14 hari |
|---|---|---|---|
| **A** | Aplikasi dipakai **selama** aktivitas | Gym | Gym tetap jalan. Kalau A yang bener, pola gym **nggak bisa** disalin ke modul lain — cuma gym yang punya aktivitas berdurasi |
| **B** | Umpan balik **langsung** sesudah nyatet | Uang, dan berat (baru) | **Catatan berat naik tanpa diingetin apa pun** |
| **C** | Manfaat **kumulatif**, kebayar nanti | Tugas, ide, agenda, tren berat | Tetap nol. Kebayarnya nggak pernah nyampe |

**B itu satu-satunya yang beneran diuji putaran ini**, karena cuma itu yang
kondisinya berubah (target berat sekarang ngasih angka langsung begitu
ditimbang). A dan C cuma diamati.

---

## 3. Yang beneran bisa diukur — tanpa kode

Tiap baris data di Rutin udah bawa tanggalnya sendiri. Nggak butuh pencatat.

| Modul | Sumber angkanya |
|---|---|
| Keuangan | `txns`, tiap baris punya tanggal |
| Gym | `latihan.sesi`, tiap sesi punya tanggal |
| **Berat** | `badan.berat`, tiap timbangan punya tanggal |
| Harian | `days`, kuncinya tanggal |
| Tugas / ide / agenda | jumlah barisnya |

**Cara baca, hari 0 dan hari 14:** buka **Pengaturan → Laporan CSV**. Sheet-nya
nampilin jumlah baris tiap berkas. Catat angkanya. Itu doang.

**Nol pemakaian vs nol karena pencatatnya rusak** — dibedain lewat silang:
kalau transaksi dan sesi gym terus nongol bertanggal di rentang ini sementara
berat nggak, berarti aplikasinya jelas nulis dengan bener, dan nol-nya berat
itu nol beneran.

---

## 4. Syarat sebelum mulai

Dua-duanya wajib. Kalau salah satu nggak kepenuhin, hari 0 belum mulai.

1. **APK 12 Oktober atau lebih baru kepasang.** Sebelum itu sistem targetnya
   nggak ada, jadi mekanisme B nggak nyala sama sekali.
2. **Target berat dipasang** lewat Beranda → Target. Tanpa itu, nimbang tetap
   nggak ngasih umpan balik apa-apa, dan B nggak keuji — cuma kebaca gagal.

Pasang target berat itu **tindakan hari 0 yang disengaja**, bukan fitur baru.

---

## 5. Aturan keputusan

Ditulis sekarang, sebelum datanya ada.

**Mekanisme B — catatan berat selama 14 hari.** Garis dasar: **1 catatan**
selama ~6 minggu pemakaian. Dasar angkanya: dia bilang naik timbangan
"sering", dan "sering" paling sedikit 2x seminggu, jadi dalam 14 hari ada
sekitar 4 kesempatan.

| Hasil | Artinya |
|---|---|
| **4 atau lebih** | B didukung — nyatet jadi kebayar, dan itu yang kurang |
| **2–3** | Nggak bisa disimpulin. Jangan dipaksa ngomong |
| **0–1** | B nggak didukung. Umpan balik langsung bukan penyebabnya |

**Mekanisme C — tugas, ide, agenda.** Ramalan: nggak gerak tanpa
intervensi. Kalau salah satunya gerak sendiri padahal nggak ada yang diubah,
C salah dan penjelasannya ada di luar daftar ini.

**Mekanisme A — gym dan uang.** Nggak ada ambang. Angkanya dicatat buat jadi
**garis dasar bersih pertama**, karena semua angka sebelumnya kena rilis baru.

---

## 6. Yang bikin hasilnya nggak bisa ditafsirin

Ditulis duluan biar nggak jadi alasan belakangan.

1. **Program latihan baru ganti total 13 Oktober.** Angka gym 14 hari ini
   kecampur rasa penasaran sama program baru. **Angka gym putaran ini nggak
   boleh dipakai buat nyimpulin apa pun** — cuma dicatat.
2. **n = 1, tanpa pembanding, tanpa acak.** Ini bukan bukti. Paling jauh:
   satu ramalan yang bisa salah.
3. **Nggak ada jam** di catatan mana pun. Hipotesis soal waktu nggak keuji.
4. **Nggak ada data layar dibuka tanpa nulis.** Jadi "dia dateng buat baca"
   nggak keukur putaran ini sama sekali.
5. **Nggak ada data form dibatalin.** Hipotesis beban input nggak keuji.
6. Kalau pembekuannya bocor, **tiap pelanggaran ditulis di bawah ini** dan
   hasilnya dibaca sebagai kotor:

```
Pengecualian selama pembekuan:
(kosong per 15 Oktober 2026)
```

---

## 7. Hari 14

Tanggal **29 Oktober 2026**: buka Laporan CSV, catat jumlah baris, bandingin
sama hari 0, terapin aturan bagian 5. Nggak nambah tafsiran di luar itu.

Kalau hasilnya "nggak bisa disimpulin", jawabannya **perpanjang**, bukan
tafsirin.
