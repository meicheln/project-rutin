# Kelemahan

Batasan yang diketahui, ditulis apa adanya. Diurut dari yang paling mungkin bikin masalah nyata.

Sebagian dipilih dengan sadar karena ini aplikasi satu orang — dicantumkan supaya pilihannya jelas, bukan disembunyikan. Sebagian lagi memang utang yang belum dibayar.

Tanda **[!]** artinya bisa menghilangkan data atau bikin keputusan salah. Itu yang layak dibereskan duluan.

---

## 1. [!] Sinkron bisa menelan perubahan tanpa bilang

**Masalahnya.** Sinkron memakai terakhir-menulis-menang di tingkat seluruh dokumen. Bukan per catatan — seluruh objek `S` sekaligus.

Skenario yang bikin data hilang:

```
09:00  HP offline    catat 6 transaksi
09:30  Laptop online catat 1 transaksi   → dorong ke cloud
10:00  HP online     updatedAt HP lebih baru → HP menang
                     1 transaksi dari laptop hilang, tanpa pemberitahuan
```

**Kapan kegigit.** Cuma kalau benar-benar pakai dua perangkat dan salah satunya sempat offline. Pemakaian satu HP tidak akan pernah kena.

**Kenapa dibiarkan.** Sinkron per catatan butuh log perubahan, penomoran versi, dan penyelesaian konflik — itu berlipat kali lebih rumit dari seluruh lapisan penyimpanan yang ada sekarang. Untuk satu pengguna dengan satu HP, itu belum sepadan.

**Perbaikannya.** Ganti satu baris `data jsonb` jadi tabel `perubahan` yang append-only (`user_id, entity, entity_id, op, payload, ts`), lalu bangun ulang state dari log. Konflik jadi bisa dideteksi dan digabung per catatan. Perkiraan: 2-3 hari kerja.

**Penambal sementara.** Ketuk ikon sinkron sebelum dan sesudah pakai perangkat kedua. Ambil cadangan JSON sebelum sesi yang panjang.

---

## 2. [!] Ukuran state tumbuh tanpa batas

**Masalahnya.** Setiap hari menambah satu entri di `days`. Setiap transaksi, sesi latihan, dan log kerja menumpuk selamanya. Tidak ada pengarsipan, tidak ada pemangkasan.

Perkiraan dari 45 hari data contoh:

| Pemakaian | Ukuran `S` | Akibatnya |
|---|---|---|
| 45 hari | ~300 KB | baik-baik saja |
| 1 tahun | ~2,5 MB | sinkron mulai kerasa lambat |
| 3 tahun | ~7 MB | mendekati kuota localStorage; tiap perubahan kecil mendorong 7 MB ke Supabase |

**Yang bikin lebih parah.** Setiap `commit()` menulis **seluruh** objek ke localStorage secara sinkron. Di 7 MB itu berarti serialisasi 7 MB di thread utama setiap kali satu kotak dicentang.

**Perbaikannya.** Tiga langkah, dari yang paling murah:
1. Pisahkan data yang jarang berubah (`days` lama, `txns` tahun lalu) ke kunci IndexedDB terpisah, muat sesuai kebutuhan.
2. Tulis localStorage secara ditunda dan hanya sebagai cadangan; jadikan IndexedDB sumber utama.
3. Arsipkan otomatis apa pun yang lebih tua dari 18 bulan ke berkas terpisah yang bisa diunduh.

---

## 3. Menggambar ulang seluruh layar tiap perubahan

**Masalahnya.** `render()` menyusun ulang string HTML seluruh layar aktif lalu menugaskannya ke `innerHTML`.

Di data sekarang ini cepat. Yang akan terasa duluan: layar Uang di bulan yang padat, dan peta konsistensi 4 bulan yang membangun 300-an elemen tiap kali.

**Sudah ditambal di tempat yang paling penting.** Mode sesi latihan tidak menggambar ulang saat mencentang gerakan — dulu iya, dan itu mengembalikan scroll ke atas serta menutup petunjuk yang sedang dibaca. Sekarang cuma kelasnya yang diubah. Ada assert yang menjaganya.

**Yang belum ditambal.** Layar lain masih menggambar ulang penuh. Kalau ada input teks yang sedang difokus di dalam wadah yang digambar ulang, fokusnya lepas. Sekarang tidak terlihat karena input teks yang panjang (`#dayNote`, `#sesKurang`) sengaja tidak memicu `render()` — tapi itu menghindar, bukan menyelesaikan.

**Perbaikannya.** Kalau nanti sudah terasa: pindah ke pola tempel-berkunci — beri kunci pada tiap baris daftar dan perbarui hanya yang berubah. Atau, lebih murah, gulung sebagian besar layar jadi virtual scroll.

---

## 4. [!] Tidak ada urungkan, di mana pun

Hapus transaksi, hapus tugas, atau tekan reset total — hilangnya langsung dan permanen. Konfirmasinya cuma `confirm()` bawaan browser.

Yang paling berbahaya: **asisten menulis tanpa konfirmasi**. Kalau model salah baca "dua juta" jadi "dua ribu", transaksinya masuk begitu saja. Baris hijau bercentang memang menampilkan apa yang dilakukan, tapi itu pemberitahuan setelah kejadian, bukan izin sebelum kejadian.

**Perbaikannya.** Tumpukan urungkan berisi 20 aksi terakhir sebagai snapshot ringan dari cabang yang tersentuh, dengan roti panggang "Batalkan". Untuk asisten, wajibkan konfirmasi sekali ketuk pada alat yang mengubah uang atau menghapus apa pun.

---

## 5. Kunci API disimpan apa adanya

Kunci Anthropic ada di `localStorage` sebagai teks biasa. Di dalam APK, penyimpanan itu privat per aplikasi dan cukup aman dari aplikasi lain. Di web, siapa pun yang bisa membuka devtools di perangkat itu bisa membacanya.

Tidak ada enkripsi, tidak ada Keystore Android, tidak ada penguncian aplikasi.

**Perbaikannya.** Untuk APK, simpan lewat `@capacitor/preferences` yang didukung EncryptedSharedPreferences. Untuk web, tidak ada solusi yang benar-benar aman — yang masuk akal adalah proksi lewat Supabase Edge Function supaya kuncinya tidak pernah ada di klien.

---

## 6. [!] Timer istirahat mati kalau aplikasi ditinggal

Timer istirahat pakai `setInterval` di JavaScript. Kalau layar dimatikan atau pindah aplikasi di tengah istirahat 3 menit — hal yang wajar terjadi di gym — Android membekukan timer-nya. Balik ke aplikasi, angkanya salah atau berhenti.

**Perbaikannya.** Jadwalkan notifikasi lokal saat timer dimulai, dan hitung sisa waktu dari selisih stempel waktu, bukan dari detak interval. Ini perbaikan kecil dengan dampak besar untuk pemakaian sesungguhnya.

---

## 7. Persentase penyelesaian sesi menyesatkan

`sesiKelar()` menghitung semua gerakan dengan bobot sama. Pemanasan sepeda statis 5 menit bernilai sama dengan back squat 5×3 di 87%.

Akibatnya "50% selesai" tidak berarti separuh kerjanya selesai — bisa jadi baru pemanasan dan pendinginan yang tercentang.

**Perbaikannya.** Beri bobot per blok, atau minimal hitung hanya blok utama dan aksesori sebagai penentu progres.

---

## 8. Penghitung kontak lompatan cuma perkiraan

Dua hal yang bikin angkanya tidak persis:

1. **Diskalakan dengan persentase ceklis.** Centang tanpa benar-benar melakukan semua set tetap terhitung penuh.
2. **Tidak menghitung basket lepas.** Main satu jam di lapangan bisa menambah ratusan kontak dan aplikasi tidak tahu sama sekali.

Angkanya berguna sebagai rambu, bukan sebagai ukuran. Untungnya program bawaan cuma memakai 100 dari 200, jadi ada ruang untuk yang tidak tercatat — tapi itu kebetulan yang menguntungkan, bukan desain.

**Perbaikannya.** Hitung kontak per gerakan yang dicentang, bukan per sesi. Tambah input cepat "main lepas berapa menit" yang mengestimasi kontak dari durasi.

---

## 9. Catatan latihan terikat ke id gerakan

`S.latihan.sesi[].set` dan `.ceklis` dikunci dengan id gerakan dari konstanta `PROGRAM`. Kalau `la_m1` diganti nama atau dihapus, catatan beban lamanya jadi yatim — masih ada di data tapi tidak muncul di mana pun.

Belum jadi masalah karena programnya belum pernah berubah. Akan jadi masalah begitu program diperbarui.

**Perbaikannya.** Simpan nama gerakan berdampingan dengan id-nya di catatan, plus tabel pemetaan id lama → id baru saat program berubah versi.

---

## 10. Yang paling penting justru tidak dilacak

Seluruh program latihan ini disusun untuk menaikkan vertical jump. Aplikasinya melacak beban, kontak, durasi, catatan — tapi **tidak pernah menanyakan berapa tinggi lompatannya**.

Tanpa itu, tidak ada cara tahu programnya berhasil atau tidak. Ini kekurangan paling besar di modul latihan, dan paling murah diperbaiki.

**Perbaikannya.** Satu form: jangkauan berdiri, lompatan tanpa awalan, lompatan dengan awalan, tanggal. Ditambah grafik tren dan pengingat tes tiap 4 minggu. Kurang dari satu hari kerja. Ini nomor satu di [ROADMAP.md](ROADMAP.md).

---

## 11. Persentase tembakan tidak dicatat

Sesi basket bilang "5 masuk tiap spot" dan pengguna cuma mencentang selesai. Berapa lemparan yang dibutuhkan untuk dapat 5 masuk — angka yang sebenarnya paling berarti untuk penembak — tidak ke mana-mana.

**Perbaikannya.** Untuk gerakan bertipe tembakan, tampilkan dua kolom: masuk dan percobaan. Persentasenya dihitung sendiri, lalu digrafikkan per spot dari waktu ke waktu.

---

## 12. Program tidak punya periodisasi

Program yang sama diulang tiap minggu, selamanya. Tidak ada minggu ringan, tidak ada penambahan beban terstruktur, tidak ada blok yang bergeser fokus.

Referensi yang dipakai untuk menyusun program ini justru menyarankan minggu ringan tiap 3-4 minggu. Itu tidak diterapkan.

Beban tercatat, tapi tidak ada yang menyarankan angka minggu depan. Semua penambahan beban ditentukan sendiri oleh pengguna.

**Perbaikannya.** Siklus 4 minggu dengan minggu keempat volumenya diturunkan. Ditambah saran beban sederhana: kalau semua set kena target rep dan rasanya "enteng", naikkan 2,5%.

---

## 13. Waktu ditentukan jam perangkat

Semua tanggal dari waktu lokal perangkat. Naik pesawat lintas zona waktu bisa membuat satu hari terlewat atau terhitung dua kali. Mengubah jam HP secara manual bisa merusak runtutan.

Bukan masalah untuk pemakaian di satu kota. Jadi masalah kalau sering bepergian jauh.

**Perbaikannya.** Simpan zona waktu bersama tiap catatan, atau kunci "hari" ke satu zona waktu rumah yang bisa diatur.

---

## 14. Aksesibilitas belum digarap

- Sebagian besar kontrol adalah `<button>` tanpa `aria-label`; yang isinya cuma ikon jadi tidak terbaca pembaca layar
- Beberapa chip di bawah 44 px area ketuknya
- Kontras teks tersier (`--text-3`) di tema terang ada di sekitar 4,0:1 — di bawah anjuran 4,5:1
- Belum pernah diuji dengan TalkBack
- Warna dipakai sendirian untuk membedakan status di beberapa tempat; buta warna merah-hijau akan kesulitan membedakan masuk dan keluar di daftar riwayat

**Perbaikannya.** Satu putaran khusus: `aria-label` di semua tombol ikon, naikkan `--text-3` sampai lolos AA, tambahkan tanda + dan − di samping nominal, uji dengan TalkBack.

---

## 15. iOS belum pernah dicoba

Kode CSS-nya sudah mempertimbangkan iOS — `dvh`, `env(safe-area-inset-*)`, `font-size: 16px` di input untuk mencegah zoom, `-webkit-backdrop-filter`. Tapi belum pernah dijalankan di Safari sungguhan.

Yang paling mungkin bermasalah: tampilan `<input type="date">` dan `type="time"` di Safari, perilaku `dvh` saat bilah alamat menyusut, dan `backdrop-filter` di perangkat lama.

Aplikasi native iOS butuh Mac dan akun Apple Developer. Jalur yang realistis di iOS adalah PWA lewat Add to Home Screen.

---

## 16. Kunci `days` bengkak walau harinya kosong

`day(d)` membuat entri begitu dipanggil, termasuk dari jalur baca. Membuka tab Harian lalu memindah-mindah tanggal akan membuat entri kosong untuk setiap hari yang dilewati.

Sudah ada `dayRO()` untuk pembacaan yang tidak membuat entri, tapi belum dipakai di semua tempat.

Dampaknya kecil, cuma bikin data lebih besar dari seharusnya.

---

## 17. Yang tidak dijangkau tes

190-an assert menutup banyak, tapi tidak semua:

- **Perangkat sungguhan.** Jalur native diuji dengan Capacitor tiruan. Itu memverifikasi bahwa kode kita memanggil hal yang benar dengan argumen yang benar, tapi bukan bahwa Android benar-benar membunyikan notifikasi jam 6 pagi.
- **Supabase asli.** Jaringannya di-stub. Aturan RLS tidak pernah diuji dengan server sungguhan.
- **API Anthropic asli.** Juga di-stub. Bentuk permintaannya benar, tapi belum pernah diadu dengan jawaban model sungguhan yang tidak terduga.
- **Regresi visual.** Tidak ada perbandingan tangkapan layar. Perubahan CSS yang merusak tata letak akan lolos.
- **Data yang sangat banyak.** Tes berjalan dengan 45 hari. Perilaku di 3 tahun belum pernah dicoba.
- **iOS / Safari.** Nol.

---

## 18. Hal-hal kecil

- Bundel tidak diminifikasi. 246 KB bisa jadi sekitar 80 KB. Di dalam APK tidak berpengaruh; di web berpengaruh sedikit di jaringan lambat.
- Tidak ada service worker di versi web, jadi PWA-nya butuh koneksi untuk muat pertama tiap kali cache browser habis.
- Isi notifikasi statis. "Ceklis rutinitas pagi lo" muncul walau rutinitasnya sudah kelar semua tadi malam.
- Menu tambah cepat menampilkan pilihan yang sama di layar mana pun, kecuali sesi latihan.
- Kategori transaksi tidak bisa diubah pengguna; harus ganti kode.
- Tidak ada pencarian. Mencari transaksi tertentu dari enam bulan lalu berarti menggulir.
- Tidak ada ekspor CSV — cadangan hanya JSON, yang tidak bisa dibuka di spreadsheet.
- Getaran dipanggil tanpa saklar. Tidak ada cara mematikannya dari dalam aplikasi.
- `sesiKelarMinggu()` menghitung sesi mana pun yang selesai, jadi mengerjakan Push dua kali dalam seminggu terhitung dua sesi terhadap penyebut yang berbasis jadwal.
