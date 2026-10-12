# Eksperimen dua minggu — kenapa modul mati

Jawaban buat tuntutan: bedain korelasi dari sebab, rancang eksperimen
termurah, dan tentuin aturan keputusan **sebelum** datanya masuk.

Kondisi teknis ada di `UNTUK-AI-LAIN.md`. Ringkasnya: **JavaScript polos,
satu berkas HTML, dibungkus Capacitor.** Bukan Flutter, bukan Dart. Nggak
ada `.dart`, nggak ada `pubspec.yaml` — udah dicek pakai `find`.

---

## 0. Temuan yang ngubah segalanya

**Transaksi cuma nyimpen tanggal (`d`), nggak ada jam.** Begitu juga sesi
latihan, tugas, dan ide.

Artinya hipotesis "pemicu fisik" **nggak bisa diuji sama sekali** pakai data
yang udah ada. Gua nggak bisa tau sebuah catatan dibuat jam berapa, apalagi
berapa lama setelah kejadiannya.

Itu bukan hipotesis yang lemah. Itu hipotesis **yang belum punya alat
ukur.** Dan itu bikin urutan kerjanya kebalik dari yang gua kira: alat ukur
dulu, baru eksperimen.

---

## 1. Tabel hipotesis

Enam penjelasan kenapa uang + gym hidup sementara tugas, jam kerja, ide,
agenda, dan berat mati.

### H1 — Pemicu fisik
*Modul hidup kalau nempel ke kejadian fisik yang selesai sendiri dan
nyisain jeda.*

| | |
|---|---|
| **Mendukung** | Gym punya timer istirahat 90–150 detik yang literal maksa nganggur sambil megang HP. Bayar nyisain struk dan antrean. |
| **Melemahkan** | Agenda juga punya pemicu — kelas kelar, bimbingan kelar — tapi cuma 1 catatan. Jam kerja juga selesai, dan nol. |
| **Data yang belum ada** | **Jam pembuatan tiap catatan.** Nggak kesimpen sama sekali. |
| **Eksperimen termurah** | Catat stempel waktu tiap simpan. Lihat sebarannya per jam. |

### H2 — Beban input
*Makin banyak kolom yang harus diisi, makin cepat modulnya mati.*

| | |
|---|---|
| **Mendukung** | Uang = 1 angka + 1 chip. Gym = 2 angka. Ide = 7 kolom, 2 catatan. Tugas = 5 kolom, 0 catatan. Korelasinya rapi. |
| **Melemahkan** | **Berat badan cuma SATU kolom dan tetap mati (1 catatan).** Ini bantahan telak. Kalau beban input penentunya, berat harusnya paling hidup. |
| **Data yang belum ada** | Berapa sering form dibuka lalu ditutup tanpa disimpan. |
| **Eksperimen termurah** | Catat `form dibuka` dan `form disimpan` kepisah. Rasio batal per modul. |

### H3 — Perilakunya emang nggak ada
*Nol tugas karena emang nggak ada tugas, bukan karena aplikasinya gagal.*

| | |
|---|---|
| **Mendukung** | Mahasiswa skripsi: "tugas" bisa jadi cuma ada di kepala. Berat badan butuh timbangan — kalau nggak punya, nol itu wajar. |
| **Melemahkan** | Dia sengaja bikin modulnya. Orang nggak bikin modul buat sesuatu yang dia tau nggak dia punya. |
| **Data yang belum ada** | Jawaban dia sendiri. |
| **Eksperimen termurah** | **Tanya. Nggak perlu eksperimen sama sekali.** Ini data termurah yang ada dan belum pernah diambil. |

### H4 — Udah ada di tempat lain
*Agenda kalah sama kalender HP, ide kalah sama Notes, tugas kalah sama ingatan.*

| | |
|---|---|
| **Mendukung** | Tiap HP udah punya kalender. Agenda di Rutin jadi tempat kedua yang harus dicek, dan tempat kedua selalu kalah. |
| **Melemahkan** | Sama kayak H3: kenapa dibikin kalau udah ada? |
| **Data yang belum ada** | Jawaban dia sendiri. |
| **Eksperimen termurah** | **Tanya.** |

### H5 — Efek kebaruan
*34 transaksi dan 11 sesi itu ledakan satu bulan yang bakal reda sendiri.*

| | |
|---|---|
| **Mendukung** | Datanya cuma rentang ~1 bulan. Nggak ada garis dasar panjang buat dibandingin. |
| **Melemahkan** | Belum ada apa-apa. Belum bisa dibedain. |
| **Data yang belum ada** | Bulan kedua. |
| **Eksperimen termurah** | **Nunggu dan ngitung per minggu.** Gratis. |

**Ini yang paling bahaya.** Kalau H5 bener, lima hipotesis lainnya jadi
nggak relevan — yang mati bukan empat modul, tapi semuanya, cuma belum
kelihatan.

### H6 — Nilai umpan balik
*Modul hidup kalau dia ngasih balik sesuatu yang nggak lo masukin.*

| | |
|---|---|
| **Mendukung** | Uang ngasih bilah budget, ringkasan bulanan, grafik per kategori. Gym ngasih grafik kekuatan, volume, runtutan. Tugas cuma ngasih balik daftar yang lo tulis sendiri. Ide juga. **Dua modul hidup = dua modul dengan keluaran turunan terkaya.** |
| **Melemahkan** | Bisa kebalik sebab-akibatnya: mungkin dia bikin grafik buat modul yang emang udah sering dia pakai, bukan jadi sering dipakai karena ada grafiknya. |
| **Data yang belum ada** | Apakah dia buka layar tanpa nulis apa-apa. |
| **Eksperimen termurah** | Catat `layar dibuka` kepisah dari `data disimpan`. |

> **Pengakuan bias:** H6 itu hipotesis yang paling nguntungin kerjaan gua
> sendiri — sistem target yang baru gua bangun persis nambah nilai umpan
> balik ke data yang udah ada. Gua condong ke H6 dan gua nggak percaya sama
> kecondongan itu. Tolong tekan yang ini lebih keras dari yang lain.

---

## 2. Tiga hipotesis yang paling penting diuji

Dipilih dari enam di atas berdasarkan **seberapa beda keputusannya kalau
jawabannya beda**, bukan seberapa menarik hipotesisnya.

1. **H5 (kebaruan).** Kalau ini bener, semua rencana lain batal. Harus
   diuji duluan karena dia bisa membatalkan yang lain, dan ongkosnya nol.
2. **H3 + H4 (nggak butuh / udah di tempat lain).** Digabung karena
   keputusannya sama: hapus modulnya. Dan ongkos ngujinya juga nol —
   tinggal nanya.
3. **H2 vs H6 (beban input vs nilai umpan balik).** Ini pasangan yang
   beneran butuh pengukuran, dan keputusannya berlawanan: H2 bilang
   *sederhanain formnya*, H6 bilang *tambahin keluarannya*. Dua-duanya
   kerjaan, dan cuma satu yang bener.

H1 (pemicu fisik) **sengaja diturunin prioritasnya.** Itu hipotesis awal
gua, dan ternyata dia yang paling mahal diuji sekaligus paling lemah
buktinya — agenda dan jam kerja dua-duanya punya pemicu dan dua-duanya
mati.

---

## 3. Rancangan eksperimen

### Satu-satunya perubahan kode: pencatat pemakaian

Sekitar 25 baris. **Lokal doang, nggak pernah ikut sinkron, nggak pernah
dikirim ke AI.** Bisa dilihat dan dihapus pemiliknya kapan aja di
pengaturan.

```
{ t: <stempel waktu>, k: <jenis>, m: <modul> }

jenis:  buka    layar dibuka
        form    form dibuka
        simpan  form disimpan
        batal   form ditutup tanpa disimpan
```

Cincin 500 entri terakhir, numpang di `S` yang udah ada. Nggak ada server,
nggak ada analytics pihak ketiga, nggak ada dependensi baru.

### Peta: sinyal mana nguji hipotesis mana

| Hipotesis | Sinyal | Bentuk buktinya |
|---|---|---|
| H1 pemicu | sebaran jam dari `simpan` | catatan gym numpuk di jam latihan, uang di jam makan |
| H2 beban input | `batal` ÷ `form` per modul | rasio batal tinggi = formnya kemahalan |
| H3 / H4 | — | **cuma bisa dijawab lewat wawancara** |
| H5 kebaruan | jumlah `simpan` per minggu | minggu 2 turun tajam dari minggu 1 |
| H6 umpan balik | `buka` tanpa `simpan` sesudahnya | dia dateng buat baca, bukan buat nulis |

Satu alat ukur, lima hipotesis. Itu yang bikin dia murah.

### Yang nggak bisa diukur, harus ditanya

Empat pertanyaan, sekali, di awal. H3 dan H4 nggak akan pernah kejawab
sama angka:

1. Lo beneran punya tugas dan jam kerja buat dicatat, atau itu emang nggak
   ada di hidup lo sekarang?
2. Lo punya timbangan?
3. Kalau lo buka Rutin, lebih sering buat **nulis** sesuatu atau buat
   **ngecek** sesuatu?
4. Lo setuju pemakaian lo dicatat lokal selama 2 minggu?

Pertanyaan 4 bukan formalitas. Yang diukur itu dia sendiri, dan dia harus
bilang iya duluan.

---

## 4. Metrik dan aturan keputusan

Ditulis sekarang, sebelum datanya ada, biar nggak bisa dibengkokin nanti.

| Temuan sesudah 14 hari | Keputusan |
|---|---|
| Modul: 0 tulis **dan** 0 buka | Calon dihapus. **Tanya dulu, jangan auto-hapus.** |
| Modul: ada buka, 0 tulis | Dia layar baca, bukan layar isi. Berhentiin ajakan nulisnya, pertahankan tampilannya. |
| `batal` ÷ `form` > 50% | Beban input nyata di modul itu → sederhanain formnya |
| `batal` ÷ `form` < 20% tapi tetap sepi | Bukan soal form → beban input bukan penyebabnya |
| Simpan minggu 2 turun > 40% dari minggu 1 **di uang/gym** | **H5 menang. Stop semua rencana lain.** Masalahnya bukan modul mati, tapi aplikasinya lagi ditinggalin. |
| `buka` tanpa `simpan` > 40% dari semua sesi | H6 dapat dukungan → investasi di keluaran, bukan di masukan |
| Nggak ada pola yang jelas | **Perpanjang, jangan tafsirin.** Dua minggu dari satu orang itu sampel kecil. |

Baris terakhir yang paling penting dan paling gampang dilanggar. Data tipis
yang dipaksa ngomong lebih buruk daripada data yang diem.

---

## 5. Yang sengaja NGGAK dikerjain selama eksperimen

Intinya: **bekuin aplikasinya.** Target yang bergerak nggak bisa diukur.

- ❌ Nggak ngapus modul apa pun, walau nol
- ❌ Nggak nambah modul baru
- ❌ Nggak ngubah form mana pun — itu persis variabel yang lagi diukur H2
- ❌ Nggak ngubah tata letak atau navigasi
- ❌ Nggak nambah atau ngubah notifikasi — itu bakal maksa buka aplikasi dan ngerusak angkanya
- ❌ Nggak naruh apa pun di timer istirahat (lihat bagian 7)
- ❌ Nggak nambah atau ngapus alat AI
- ❌ Nggak ngubah tampilan target yang baru

### Pengotor yang udah terlanjur masuk

**Sistem target baru dirilis 12 Oktober, dua hari sebelum eksperimen ini
diusulin.** Itu persis nambah nilai umpan balik — variabel H6.

Gua nggak bisa pura-pura itu nggak ada. Pilihannya:

- **(a)** Terima, dan catat interaksi target kepisah biar efeknya kelihatan
- **(b)** Tunda eksperimen 2 minggu biar efek rilisnya reda dulu

Gua condong ke **(a)**, karena (b) ngorbanin sebulan buat kebersihan data
yang cuma akan dipakai satu orang. Tapi hasil minggu 1 harus dibaca sambil
inget ada rilis baru di dalamnya.

---

## 6. Peran AI — mana yang dipertahanin, diuji, dimatiin

23 alat, dipisah berdasarkan peran. Ini jawaban buat tuntutan nomor 3.

### AI sebagai masukan (9 alat) — **turunin prioritas, jangan matiin**

Ngetik "tadi jajan 25rb" ke chat itu lebih lambat daripada mencet Quick Add
yang udah ada. Alat-alat ini bersaing sama tombol dan kalah.

**Tapi ada dua tempat di mana dia menang telak**, dan ini yang bikin dia
nggak boleh dimatiin: balesan notifikasi (nyatet tanpa buka aplikasi) dan
kalimat jamak ("tadi jajan 25rb terus beli kuota 50rb"). Satu kalimat, dua
catatan — form nggak bisa.

**Keputusan:** pertahankan, jangan dikembangin lagi sampai eksperimennya
kelar.

### AI sebagai pembaca data (3 alat) — **pertahankan**

Murah, nggak ada efek samping, dan pondasi buat peran analis. Nggak ada
alasan diotak-atik.

### AI sebagai analis — **ini nilai sebenarnya, dan ini yang paling rapuh**

Yang nggak bisa dilakuin form: merhatiin, ngebandingin, nggak setuju.

Tapi catatan hariannya baru 7 hari. Pola dari 7 hari itu kebetulan. Dan AI
yang ngarang pola dari data tipis lebih merusak daripada AI yang diem —
karena orang bakal ngambil keputusan dari situ.

**Perubahan konkret yang gua usulin, satu-satunya perubahan AI selama
eksperimen:**

`baca_data` harus balikin **ukuran sampel bareng tiap seri**. Sekarang
bagian uang udah ngasih `jumlah_transaksi`, tapi bagian harian cuma ngasih
daftar hari tanpa jumlahnya. Model nggak bisa nolak ngomong kalau dia
nggak tau datanya tipis.

Plus satu aturan keras di system prompt: **di bawah 14 pengamatan
berpasangan, dilarang ngomongin hubungan antar-variabel sama sekali.**
Boleh nyebut angka mentahnya, nggak boleh bilang yang satu nyebabin yang
lain — dan nggak boleh juga bilang "kelihatannya ada kecenderungan", karena
itu cuma klaim sebab yang dibungkus sopan.

### AI sebagai pelaksana (11 alat) — **pertahankan, udah aman**

Tiap tulisan yang nggak kelihatan formnya udah lewat `tulisBisaUrung` —
ada tombol urungkan. Nggak ada yang perlu ditambah.

### Gimana hasil analisis diverifikasi

Kalau AI bilang "lo skip gym tiga kali", dia harus bisa nyebutin tanggalnya
dan tanggal itu harus bisa dicek sendiri di layar. **Klaim yang nggak bisa
ditelusuri ke baris data yang kelihatan itu dianggap halusinasi**, bukan
analisis.

---

## 7. Soal timer istirahat — gua cabut usulan gua sendiri

Gua sebelumnya nyebut timer istirahat "jendela perhatian paling mahal yang
nganggur". Tuntutan nomor 4 bener, dan gua cabut framing itu.

Istirahat antar-set itu **bagian dari latihannya**, bukan waktu kosong.
Ngisi dia pakai hal lain punya risiko nyata: perhatian pecah, set
berikutnya jelek, waktu istirahat molor karena keasyikan.

Kerangka "ruang kosong yang bisa diisi" itu cara mikir orang yang ngejar
engagement, dan di aplikasi satu-pengguna itu nggak ada gunanya sama
sekali — nggak ada yang mau dijual ke dia.

**Keputusan: nggak ada apa pun yang ditaruh di timer istirahat selama
eksperimen.** Kalau nanti diuji, syaratnya mutlak: nggak ada pop-up, nggak
ada suara, nggak ada apa pun yang nongol sendiri. Paling jauh satu baris
diam yang udah ada di layar, dan hilang tanpa perlu disentuh.

---

## 8. Pertanyaan yang harus kejawab sebelum nulis kode

1. **Setuju dicatat?** Tanpa iya, eksperimennya batal.
2. **Lo punya tugas dan jam kerja beneran?** Nentuin apakah H3 langsung
   menang buat dua modul itu tanpa perlu nunggu dua minggu.
3. **Punya timbangan?** Sama, buat modul berat.
4. **Buka Rutin buat nulis atau buat ngecek?** Prediksi dia sendiri,
   dicatat sekarang, dibandingin sama datanya nanti. Kalau tebakannya
   meleset, itu temuan tersendiri.
5. **Dua minggu cukup, atau empat?** Dua minggu dari satu orang itu sampel
   kecil. Empat minggu dua kali lebih kuat dan ongkosnya cuma sabar.

Pertanyaan 2 dan 3 bisa langsung mencoret dua sampai tiga modul dari
pertanyaan tanpa nulis sebaris kode. **Itu eksperimen termurah yang ada di
dokumen ini, dan dia bukan eksperimen — dia percakapan.**
