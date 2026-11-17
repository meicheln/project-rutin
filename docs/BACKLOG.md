# Backlog — dibekukan sampai 29 Oktober 2026

Tempat parkir ide selama pembekuan (`PROTOKOL.md`). Masuk sini bukan berarti
bakal dikerjain — cuma berarti nggak dikerjain sekarang.

Aturannya satu: **kalau ide baru muncul, dia ditulis di sini, bukan di
kode.**

---

## Dari riset aplikasi lain (13 Okt)

- Kalkulator plat — berapa plat buat 72,5 kg
- Timer istirahat nyala sendiri tiap set kelar (Hevy gitu). Hati-hati: ini
  nabrak keputusan "jangan isi waktu istirahat"
- Jenis set khusus: warmup, drop set, AMRAP (dari Strong)
- Transaksi berulang — kos, kuota
- Envelope / zero-based budget (YNAB, Goodbudget)

## Dari analisis modul mati

- Pencatat pemakaian lokal 2 minggu — **dibatalin buat putaran ini**, lihat
  PROTOKOL bagian 1
- Jam pembuatan catatan (sekarang cuma tanggal). Ini syarat buat nguji
  hipotesis apa pun yang nyangkut waktu
- Pencarian universal
- Deteksi pola — butuh data jauh lebih banyak dari yang ada

## Dari master prompt & diskusi

- Modul proyek, Life Score, timeline, sharing — **sengaja ditolak**, bukan
  ditunda. Dua modul yang hidup dulu dibuktiin berguna
- Telegram (Fase 4), kalender ICS (Fase 5), penjadwalan terdelegasi (Fase 6)

## Ketemu 1 November

- **Jalur cadangan asisten mati buat setelan sekarang.** `aiReqLangsung`
  nembak ke `api.anthropic.com`; dia dibangun waktu masih pakai Anthropic.
  Begitu pindah ke Gemini, penerjemahnya pindah ke Edge Function
  (`gemini.ts`), dan jalur cadangan itu jadi kode mati — butuh kunci
  Anthropic yang nggak ada.
  Akibatnya: **kalau Supabase mati, asistennya mati total, nggak ada
  cadangan sama sekali.**
  Jangan dibenerin dengan naruh kunci Gemini di HP — itu ngebalikin
  keputusan keamanan yang sengaja diambil. Kalau mau dibenerin, pilihannya
  proksi kedua di tempat lain, dan itu bukan pekerjaan kecil.

## Ketemu selama pembekuan

- ~~**Saklar "Ingetin di hari latihan" nggak langsung ngejadwalin.**~~
  Dibenerin 2 November, sesudah pembekuan kelar. `jlNotif` sekarang manggil
  `Notif.apply()` dan ngasih toast, persis kayak saklar saudaranya di
  Pengaturan. (ketemu 23 Okt)

## Utang yang belum dibayar

- `rutin_galat` masih 0 baris — penyebab error asisten masih belum kebaca
- ~~GitHub Pages belum dinyalain, workflow "Deploy demo" merah tiap push~~
  Workflow-nya dihapus 17 Nov: nggak pernah sukses sekali pun, dan merah tiap
  push bikin kegagalan yang beneran ikut kelewat. Kalau mau demo publik, itu
  keputusan pemiliknya — repo-nya publik, jadi demonya juga bakal publik.
- **Penjaga Supabase ijo palsu sampai 17 Nov.** Secret SUPABASE_URL nggak pernah
  diisi, jadi dia exit 0 tanpa ngeping apa pun — centang ijo tiap 3 hari. Sekarang
  merah kalau belum diatur. Yang ngisi secret-nya harus pemiliknya.
- Betis & perut di program cuma pas-pasan di 10 set
- ~~Kolom "terakhir" dicocokin per nomor set; kalau minggu lalu cuma 2 dari 4
  set yang diisi, baris 3–4 kosong walau sebenernya ngangkat~~ Dibenerin 18 Nov:
  baris yang nggak kecatat pakai set terakhir yang kecatat. Sekalian
  setTerakhir() cuma dihitung sekali per gerakan, bukan tiap baris.

## Model lokal: dicoba, diukur, dibuang (12 November)

Dipasang 4 November, dibuang 12 November sesudah penggunanya nyoba di HP:
"jelek, nggak bisa apa-apa, malah bikin ngelag."

Itu cocok sama angka yang keukur duluan di GPU desktop: Gemma 3 1B ngarang
1 dari 5 jawaban, Qwen2.5 0,5B 130 detik buat satu jawaban dan hasilnya
sampah. Yang ketambahan dari HP cuma satu hal baru: lag.

Yang disimpen, karena ini yang beneran kepakai:
- parseCepat() — nyatet dari kalimat, pencocokan pola, nggak bisa ngarang
- jawabCepat() — pertanyaan angka diitung kode, selalu tepat

Pelajarannya: tiap pertanyaan yang layak ditanya ke aplikasi pencatat itu
punya jawaban pasti yang aplikasinya emang bisa hitung. Model cuma nambah
ketidakpastian di tempat yang nggak butuh ketidakpastian.

Jangan diulang kecuali ada model yang jelas-jelas beda kelas DAN diuji dulu
di HP-nya sendiri, bukan di komputer.
