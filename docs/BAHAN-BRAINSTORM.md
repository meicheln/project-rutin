# Bahan brainstorming — Rutin

Buat AI kedua yang diajak mikir bareng. Baca `UNTUK-AI-LAIN.md` dulu buat
kondisi teknisnya; berkas ini isinya pertanyaan, bukan status.

Yang gua cari dari lo bukan daftar fitur. Dua daftar fitur udah ada dan
dua-duanya nggak nyentuh masalah sebenernya. Yang gua cari: **tekanan ke
hipotesis gua di bawah**, dan **penjelasan alternatif yang gua lewatin**.

---

## Fakta yang bikin semua usulan fitur jadi curiga

Data pemakaian asli, per sinkron terakhir 4 Oktober 2026:

| Modul | Catatan | |
|---|---|---|
| Keuangan | 34 transaksi | **hidup** |
| Latihan gym | 11 sesi | **hidup** |
| Catatan harian | 7 hari | tipis |
| Ide konten | 2 | sekarat |
| Agenda | 1 | sekarat |
| Berat badan | 1 | sekarat |
| Tugas | 0 | **mati** |
| Jam kerja | 0 | **mati** |

**Empat dari enam modul nggak kepakai.** Semuanya dibikin dengan niat yang
sama baiknya, semuanya jalan tanpa bug, semuanya ada di layar yang sama.

Dua dokumen visi yang udah ada (satu dari pemiliknya, satu dari AI lain)
dua-duanya ngusulin nambah Goals, Mind, Projects, Life Score, Timeline, dan
Sharing **di atas empat modul mati itu.** Nggak ada satu pun yang jelasin
kenapa yang baru bakal beda nasibnya.

Itu pertanyaan nomor satu. Semua yang lain turunannya.

---

## Hipotesis gua — tolong serang ini

**Modul hidup kalau nempel ke kejadian fisik yang selesai sendiri.**

Lihat dua yang hidup:

- **Jajan.** Transaksi selesai, struk di tangan, lo masih berdiri di kasir.
  Ada momen jeda yang dipaksain sama kejadiannya sendiri.
- **Gym.** Set selesai, lo duduk 90–150 detik nunggu istirahat, HP udah di
  tangan, dan aplikasinya udah kebuka karena timernya lagi jalan.

Lihat empat yang mati:

- **Tugas, agenda, ide.** Semuanya minta lo nyatet *niat*, bukan *kejadian*.
  Nggak ada momen yang maksa. Lo harus inget sendiri buat buka aplikasi di
  saat nggak ada apa-apa yang nyuruh.
- **Jam kerja.** Dicatat setelah selesai, tapi selesainya nggak punya batas
  yang jelas kayak set gym.

Kalau hipotesis ini bener, konsekuensinya keras: **Goals, Mind, Projects,
Timeline, dan Sharing semuanya bakal mati juga**, karena semuanya minta
pencatatan niat di momen yang nggak dipaksain apa pun.

Dan konsekuensi keduanya: cara benerin modul mati bukan bikin UI-nya lebih
bagus, tapi **nempelin dia ke momen yang udah ada** — atau hapus aja.

### Di mana gua mungkin salah

Tolong kejar yang ini, jangan cuma setuju:

1. **Mungkin bukan soal pemicu, tapi soal kebutuhan.** Mungkin dia emang
   nggak punya banyak tugas, dan nol itu jujur, bukan gagal.
2. **Mungkin dia nyatet di tempat lain.** Tugas di kepala, agenda di
   kalender HP, ide di Notes. Aplikasi ini kalah sama yang udah ada, bukan
   kalah sama ketiadaan pemicu.
3. **Mungkin sampelnya kekecilan.** 34 transaksi dan 11 sesi itu sekitar
   satu bulan. Bisa jadi ini efek kebaruan yang belum reda, dan dua modul
   "hidup" itu bakal ikut mati bulan depan.
4. **Mungkin yang hidup itu cuma yang angkanya kecil dan jelas.** Nominal
   dan kilogram itu satu angka. Tugas dan ide butuh judul, kategori,
   prioritas, tenggat — kerjaan ngetik yang lebih berat, bukan momen yang
   lebih sepi.

Nomor 3 dan 4 yang paling gua takutin, karena kalau salah satunya bener,
seluruh strategi "nempelin ke pemicu" itu salah arah.

---

## Aset yang nganggur

Satu hal konkret yang gua rasa kelewat sama semua orang:

**Timer istirahat itu jendela perhatian paling mahal yang dipunya aplikasi
ini, dan isinya cuma angka mundur.**

Pas latihan, pemiliknya: lagi megang HP, aplikasinya kebuka, dan punya
90–150 detik yang dipaksain nganggur, berkali-kali per sesi. Nggak ada
layar lain di aplikasi ini yang dapet perhatian sebanyak itu.

Pertanyaan: apa yang pantas ditaruh di situ? Atau justru **nggak boleh**
ditaruh apa-apa, karena istirahat itu bagian dari latihannya dan ngisi dia
pakai hal lain itu ngerusak sesi? Gua belum yakin.

---

## Soal asistennya

AI-nya sekarang punya 23 alat, kebanyakan buat masukin data lewat ngobrol.

Tapi ngetik "tadi jajan 25rb" ke chat itu **lebih lambat** daripada mencet
tombol Quick Add yang udah ada. Jadi separuh kemampuan AI-nya bersaing sama
tombol, dan kalah.

Yang nggak bisa dilakuin tombol: **merhatiin, ngebandingin, dan nggak
setuju.** "Lo skip gym tiga kali, semuanya di hari setelah tidur di bawah 6
jam." Itu yang nggak bisa dikerjain form.

Tapi dia baru punya 7 hari catatan harian. Pola dari 7 hari itu kebetulan,
bukan pola — dan AI yang ngarang pola dari data tipis lebih buruk daripada
AI yang diem.

Pertanyaan: berapa data yang cukup sebelum fitur "deteksi pola" boleh
dinyalain, dan gimana cara nolak ngomong pas datanya belum cukup tanpa
bikin fiturnya kelihatan rusak?

---

## Batasan yang nggak bisa ditawar

1. **Satu pengguna.** Bukan produk. Nggak ada pasar, nggak ada growth, nggak
   ada retensi yang perlu dikejar selain retensi orang ini sendiri.
2. **Satu orang juga yang bayar ongkos perawatannya.** Tiap fitur nambah
   benda yang bisa rusak, dan yang benerin dia sendiri. Dia pernah bilang
   "gua cape banget" di tengah pengerjaan ini. Itu data juga.
3. **Hasil akhirnya harus tetap satu berkas HTML.** Itu batasan produk,
   bukan kemalasan. Apa pun yang butuh langkah build di sisi klien, gugur.
4. **Nggak ada yang boleh ngerusak yang udah jalan.** Keuangan dan gym itu
   satu-satunya yang kepakai. Kalau ada usulan yang risikonya kena dua itu,
   risikonya nggak sepadan.

---

## Tiga pertanyaan yang gua pengen dijawab

1. **Kenapa modul mati?** Hipotesis gua ada di atas. Kasih gua penjelasan
   alternatif yang lebih kuat, atau bukti kenapa punya gua salah.

2. **Modul mati itu dihidupin atau dihapus?** Gua condong ke "hapus yang
   nggak bisa ditempelin ke pemicu yang udah ada", karena modul mati di
   layar bikin aplikasinya kerasa berantakan dan bikin yang hidup susah
   dicari. Tapi ngapus kerjaan sendiri itu berat, dan gua curiga gua
   kurang objektif soal ini.

3. **Apa satu hal yang bakal bikin dia buka aplikasi ini besok pagi,** yang
   belum ada sekarang? Bukan fitur yang paling keren. Yang paling mungkin
   dipakai dua minggu lagi.

Jawab yang spesifik. "Tambahin gamification" atau "perbaiki onboarding" itu
bisa ditulis siapa aja tanpa lihat angka di atas.
