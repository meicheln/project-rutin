<script>
/* ============================================================
   RUTIN — modul Latihan: jadwal gym & basket
   Program disusun buat nambah vertical jump, level lanjut,
   alat gym lengkap. Hari lower sengaja dipisah dari basket.
   ============================================================ */

/* ---------- katalog sesi ---------- */
/* ex: {id, n, set, rep, ist, int, kontak, cue, log:true kalau catat beban} */
const PROGRAM = {
  lowerA: {
    n:'Lower A — Reaktif & Kecepatan', jenis:'gym', menit:85, warna:'--c-lime', ikon:'⚡',
    fokus:'Kecepatan kontak tanah dan tenaga ledak. Ini sesi paling nentuin buat vertical jump.',
    blok:[
      { n:'Pemanasan & aktivasi', m:12, ex:[
        {id:'la_w1', n:'Sepeda statis / lompat tali ringan', set:1, rep:'5 menit', ist:'—',
         cue:'Detak jantung naik pelan, jangan sampai ngos-ngosan.'},
        {id:'la_w2', n:'Ankle rocking + leg swing', set:1, rep:'10 tiap arah', ist:'—',
         cue:'Lutut maju lewat ujung jari kaki. Pergelangan kaki yang kaku bikin bocor tenaga pas take-off.'},
        {id:'la_w3', n:'Glute bridge + monster walk band', set:2, rep:'15 / 10 tiap arah', ist:'30 dtk',
         cue:'Rasain pantat yang kerja, bukan punggung bawah.'},
        {id:'la_w4', n:'Pogo hop di tempat', set:2, rep:'20', ist:'45 dtk',
         cue:'Lutut hampir lurus, mantul dari pergelangan kaki. Ini nyalain refleks pegas betis.'},
      ]},
      { n:'Plyometric reaktif', m:20, catatan:'45 kontak intensitas tinggi. Kualitas di atas jumlah — begitu tinggi lompatan turun, stop.', ex:[
        {id:'la_p1', n:'Depth jump (box 40 cm)', set:4, rep:'3', ist:'2,5 mnt', kontak:12,
         cue:'Melangkah turun dari box, jangan lompat turun. Begitu nyentuh lantai langsung meledak ke atas. Target waktu kontak di bawah 0,25 detik — kalau kerasa "mendarat lalu mikir", boxnya kerendahin dulu.'},
        {id:'la_p2', n:'Hurdle hop berturut (5 gawang 30 cm)', set:3, rep:'5 gawang', ist:'2 mnt', kontak:15,
         cue:'Dua kaki, mendarat langsung mantul. Jangan berhenti antar gawang.'},
        {id:'la_p3', n:'Broad jump → vertikal (kombinasi)', set:3, rep:'3', ist:'2 mnt', kontak:9,
         cue:'Lompat jauh ke depan, mendarat, langsung sambung lompat setinggi mungkin.'},
        {id:'la_p4', n:'Approach jump 2 langkah (kanan & kiri)', set:3, rep:'3', ist:'90 dtk', kontak:9,
         cue:'Simulasi rebound. Ayunan tangan kenceng, langkah terakhir panjang dan rendah.'},
      ]},
      { n:'Kekuatan kecepatan', m:26, ex:[
        {id:'la_m1', n:'Hang power clean', set:5, rep:'3', ist:'2,5 mnt', int:'72-78% 1RM', log:true,
         cue:'Tarik dari atas lutut. Fokus ke kecepatan batang, bukan berat. Kalau tekniknya rusak, turunin beban.'},
        {id:'la_m2', n:'Jump squat barbell', set:4, rep:'3', ist:'2 mnt', int:'30% 1RM squat', log:true, kontak:12,
         cue:'Beban ringan, niatnya lompat setinggi mungkin. Mendarat lembut, reset tiap rep.'},
      ]},
      { n:'Aksesori', m:20, ex:[
        {id:'la_a1', n:'Bulgarian split squat', set:3, rep:'6 / kaki', ist:'90 dtk', log:true,
         cue:'Beda kekuatan kaki kanan-kiri itu penyebab umum lompatan mentok. Kaki lemah duluan.'},
        {id:'la_a2', n:'Nordic hamstring curl', set:3, rep:'5', ist:'2 mnt',
         cue:'Turun selambat mungkin. Ini asuransi buat hamstring lo.'},
        {id:'la_a3', n:'Standing calf raise satu kaki', set:3, rep:'10 / kaki', ist:'60 dtk', log:true,
         cue:'Rentang penuh — turun sampai mentok, naik sampai jinjit maksimal. Jangan setengah-setengah.'},
      ]},
      { n:'Pendinginan', m:7, ex:[
        {id:'la_c1', n:'Napas + peregangan hip flexor, hamstring, betis', set:1, rep:'45 dtk tiap pos', ist:'—',
         cue:'Napas pelan lewat hidung. Ini bagian dari latihan, bukan tempelan.'},
      ]},
    ]
  },

  lowerB: {
    n:'Leg A — Kuadrisep & Squat', jenis:'gym', menit:80, warna:'--c-lime', ikon:'🦵',
    fokus:'Hari paha depan. Squat dulu waktu masih seger, sisanya ngejar volume sampai bener-bener kerasa.',
    blok:[
      { n:'Pemanasan & aktivasi', m:12, ex:[
        {id:'lb_w1', n:'Sepeda statis / jalan cepat', set:1, rep:'5 menit', ist:'—', cue:'Bangun suhu badan dulu.'},
        {id:'lb_w2', n:'Mobilitas pinggul (90/90, world\'s greatest stretch)', set:1, rep:'5 tiap sisi', ist:'—',
         cue:'Buka pinggul biar squat bisa dalam tanpa punggung membulat.'},
        {id:'lb_w3', n:'Glute bridge + band walk', set:2, rep:'15 / 10 tiap arah', ist:'30 dtk', cue:'Nyalain pantat sebelum diberatin.'},
        {id:'lb_w4', n:'Squat kosong naik bertahap', set:3, rep:'5', ist:'60 dtk',
         cue:'Barbell kosong → 40% → 60%. Anggap ini bagian dari set kerja.'},
      ]},
      { n:'Angkatan utama', m:30, ex:[
        {id:'lb_m1', n:'Back squat', set:4, rep:'8', ist:'2,5 mnt', int:'70-75% 1RM', log:true, otot:['kuadrisep','glute'],
         cue:'Turun sampai paha sejajar atau lebih dalam. Buat ngegedein, yang ngitung itu rentang penuh dan sisa 1-2 rep di tangki — bukan beban terberat yang bisa lo angkat sekali.'},
        {id:'lb_m3', n:'Leg press', set:3, rep:'12', ist:'2 mnt', log:true, otot:'kuadrisep',
         cue:'Kaki agak rendah di papan biar paha depan yang kena. Lutut jangan dikunci di atas.'},
      ]},
      { n:'Aksesori', m:30, ex:[
        {id:'lb_a5', n:'Bulgarian split squat', set:3, rep:'10 / kaki', ist:'90 dtk', log:true, otot:['kuadrisep','glute'],
         cue:'Beda kekuatan kiri-kanan paling kelihatan di sini. Mulai dari kaki yang lebih lemah, dan samain jumlah repnya.'},
        {id:'lb_a4', n:'Leg extension', set:3, rep:'15', ist:'60 dtk', log:true, otot:'kuadrisep',
         cue:'Tahan 1 detik di atas. Ini satu-satunya gerakan yang ngisolasi paha depan — jangan diburu-buru.'},
        {id:'lb_a3', n:'Standing calf raise', set:5, rep:'12', ist:'60 dtk', log:true, otot:'betis',
         cue:'Tahan 1 detik di atas, turun pelan 2 detik. Betis butuh rentang penuh, bukan pantulan.'},
      ]},
      { n:'Pendinginan', m:8, ex:[
        {id:'lb_c1', n:'Peregangan quad, hamstring, betis, pinggul', set:1, rep:'45 dtk tiap pos', ist:'—',
         cue:'Habis sesi berat, ini yang nentuin besok lo bisa jalan normal apa nggak.'},
      ]},
    ]
  },

  kaki: {
    n:'Leg B — Hamstring, Glute & Betis', jenis:'gym', menit:78, warna:'--c-teal', ikon:'🔥',
    fokus:'Rantai belakang. Hamstring dan glute itu separuh ukuran kaki, dan paling sering ketinggalan karena squat doang nggak cukup ngelatih mereka.',
    blok:[
      { n:'Pemanasan & aktivasi', m:10, ex:[
        {id:'kk_w1', n:'Sepeda statis + leg swing', set:1, rep:'5 menit + 10 tiap arah', ist:'—',
         cue:'Hamstring dingin itu gampang ketarik. Jangan langsung RDL.'},
        {id:'kk_w2', n:'Glute bridge + good morning barbell kosong', set:2, rep:'15 / 10', ist:'30 dtk',
         cue:'Latih pola engsel pinggulnya dulu tanpa beban.'},
      ]},
      { n:'Angkatan utama', m:28, ex:[
        {id:'lb_m2', n:'Trap bar deadlift', set:3, rep:'8', ist:'2,5 mnt', int:'70% 1RM', log:true, otot:['hamstring','glute'],
         cue:'Badan tegak, dorong lantai. Berhenti satu rep sebelum punggung mulai membulat — nggak ada rep terakhir yang sepadan sama pinggang cedera.'},
        {id:'lb_a2', n:'Romanian deadlift', set:4, rep:'10', ist:'2 mnt', log:true, otot:['hamstring','glute'],
         cue:'Pinggul mundur, punggung netral, lutut cuma nekuk dikit. Berhenti pas hamstring kerasa ketarik penuh — itu batas bawahnya, bukan lantai.'},
      ]},
      { n:'Aksesori', m:32, ex:[
        {id:'lb_a1', n:'Barbell hip thrust', set:4, rep:'12', ist:'90 dtk', log:true, otot:'glute',
         cue:'Kunci di atas 1 detik, dagu nunduk, tulang rusuk turun. Yang kerasa harus pantat, bukan punggung bawah.'},
        {id:'kk_a1', n:'Lying leg curl', set:3, rep:'12', ist:'75 dtk', log:true, otot:'hamstring',
         cue:'Turunin pelan 3 detik. Bagian nurunin itu yang paling bikin hamstring gede.'},
        {id:'kk_a2', n:'Seated calf raise', set:5, rep:'15', ist:'60 dtk', log:true, otot:'betis',
         cue:'Duduk itu ngelatih otot betis yang beda dari yang berdiri. Dua-duanya perlu kalau mau betisnya nambah.'},
        {id:'kk_a3', n:'Hanging leg raise / cable crunch', set:4, rep:'15', ist:'60 dtk', otot:'perut',
         cue:'Panggul digulung ke atas, jangan cuma ayun kaki.'},
      ]},
      { n:'Pendinginan', m:8, ex:[
        {id:'kk_c1', n:'Peregangan hamstring, glute, betis', set:1, rep:'45 dtk tiap pos', ist:'—',
         cue:'Hamstring yang ketat bikin RDL minggu depan jadi pendek rentangnya.'},
      ]},
    ]
  },

  push: {
    n:'Push — Dada, Bahu, Trisep', jenis:'gym', menit:82, warna:'--c-info', ikon:'🔺',
    fokus:'Dada, bahu samping, trisep. Dorong berat dulu, lalu kejar volume sampai otot yang disasar bener-bener kehabisan — bukan badannya yang kehabisan.',
    blok:[
      { n:'Pemanasan', m:8, ex:[
        {id:'pu_w1', n:'Band pull-apart + shoulder dislocate', set:2, rep:'15 / 10', ist:'30 dtk', cue:'Buka bahu sebelum didorong.'},
        {id:'pu_w2', n:'Scap push-up + push-up ringan', set:2, rep:'10 / 10', ist:'30 dtk', cue:'Tulang belikat gerak dulu, baru sikunya.'},
      ]},
      { n:'Angkatan utama', m:30, ex:[
        {id:'pu_m1', n:'Bench press', set:4, rep:'8', ist:'2,5 mnt', int:'70-75% 1RM', log:true, otot:'dada',
         cue:'Tulang belikat ditarik ke belakang dan bawah, kaki nekan lantai.'},
        {id:'pu_m2', n:'Overhead press (barbell)', set:3, rep:'10', ist:'2 mnt', int:'65-70% 1RM', log:true, otot:'bahu',
         cue:'Pantat dan perut kenceng, jangan melengkung di punggung bawah.'},
      ]},
      { n:'Aksesori', m:37, ex:[
        {id:'pu_a1', n:'Incline dumbbell press', set:4, rep:'10', ist:'90 dtk', log:true, otot:'dada', cue:'Sudut 30 derajat, rentang penuh. Turun sampai dada kerasa ketarik — di situ pertumbuhannya.'},
        {id:'pu_a2', n:'Dip berbeban', set:3, rep:'10', ist:'90 dtk', log:true, otot:['dada','trisep'], cue:'Badan agak condong ke depan, turun sampai lengan atas sejajar lantai.'},
        {id:'pu_a3', n:'Lateral raise', set:4, rep:'15', ist:'60 dtk', log:true, otot:'bahu', cue:'Angkat sampai setinggi bahu aja, jangan pakai ayunan. Bahu samping itu yang bikin badan kelihatan lebar — beban ringan, rep banyak.'},
        {id:'pu_a4', n:'Triceps rope pushdown', set:4, rep:'12', ist:'60 dtk', log:true, otot:'trisep', cue:'Siku nempel badan, buka talinya di bawah.'},
        {id:'pu_a6', n:'Overhead triceps extension', set:3, rep:'12', ist:'60 dtk', log:true, otot:'trisep',
         cue:'Lengan di atas kepala biar kepala panjang trisep keregang penuh. Bagian itu nggak kena sama pushdown.'},
        {id:'pu_a5', n:'Pallof press', set:3, rep:'10 / sisi', ist:'45 dtk', otot:'perut', cue:'Anti-putar. Perut nahan biar badan nggak keputar.'},
      ]},
      { n:'Pendinginan', m:7, ex:[
        {id:'pu_c1', n:'Peregangan dada, bahu depan, trisep', set:1, rep:'45 dtk tiap pos', ist:'—', cue:'Dada yang ketat bikin bahu maju dan rentang bench jadi pendek.'},
      ]},
    ]
  },

  pull: {
    n:'Pull — Punggung & Bisep', jenis:'gym', menit:82, warna:'--c-violet', ikon:'🔻',
    fokus:'Punggung itu otot terbesar di badan atas dan paling tahan volume. Tarik dari atas dan dari depan — dua arah itu ngelatih bagian yang beda.',
    blok:[
      { n:'Pemanasan', m:8, ex:[
        {id:'pl_w1', n:'Dead hang di palang', set:2, rep:'20 detik', ist:'45 dtk', cue:'Bahu rileks lalu ditarik turun. Bagus buat sendi bahu.'},
        {id:'pl_w2', n:'Band pull-apart + cat-cow', set:2, rep:'15 / 8', ist:'30 dtk', cue:'Bangunin punggung atas.'},
      ]},
      { n:'Angkatan utama', m:30, ex:[
        {id:'pl_m1', n:'Pull-up berbeban', set:4, rep:'8', ist:'2,5 mnt', log:true, otot:'punggung',
         cue:'Rentang penuh — lengan lurus di bawah, dagu lewat palang. Tarik pakai siku, bukan tangan.'},
        {id:'pl_m2', n:'Barbell row', set:4, rep:'8', ist:'2 mnt', int:'70% 1RM', log:true, otot:'punggung',
         cue:'Badan condong 45 derajat dan dijaga. Tarik ke arah pusar.'},
      ]},
      { n:'Aksesori', m:37, ex:[
        {id:'pl_a1', n:'Chest-supported row', set:3, rep:'12', ist:'90 dtk', log:true, otot:'punggung', cue:'Dada nempel bantalan, nggak ada ayunan sama sekali.'},
        {id:'pl_a2', n:'Lat pulldown genggaman lebar', set:3, rep:'12', ist:'75 dtk', log:true, otot:'punggung', cue:'Dada dibusungin, tarik ke tulang selangka.'},
        {id:'pl_a3', n:'Face pull', set:3, rep:'15', ist:'60 dtk', log:true, otot:'bahu', cue:'Tarik ke arah dahi, putar keluar di akhir. Ini penyeimbang buat semua dorongan lo.'},
        {id:'pl_a4', n:'Barbell / dumbbell curl', set:4, rep:'12', ist:'60 dtk', log:true, otot:'bisep', cue:'Siku diem di tempat. Jangan pakai ayunan pinggang — bisep nggak peduli bebannya berat, dia peduli dia yang ngangkat.'},
        {id:'pl_a6', n:'Hammer curl', set:3, rep:'12', ist:'60 dtk', log:true, otot:'bisep',
         cue:'Genggaman netral. Ini ngenain brachialis, otot di bawah bisep yang bikin lengan kelihatan tebal dari samping.'},
        {id:'pl_a5', n:'Farmer carry', set:3, rep:'40 meter', ist:'75 dtk', log:true, cue:'Berdiri tegak, bahu turun. Bagus buat genggaman dan badan tengah.'},
      ]},
      { n:'Pendinginan', m:7, ex:[
        {id:'pl_c1', n:'Peregangan lat, punggung atas, bisep', set:1, rep:'45 dtk tiap pos', ist:'—', cue:'Gantung di palang sambil napas panjang juga boleh.'},
      ]},
    ]
  },

  upper: {
    n:'Upper — Putaran Kedua', jenis:'gym', menit:85, warna:'--c-teal', ikon:'💪',
    fokus:'Putaran kedua buat seluruh badan atas minggu ini. Sudutnya sengaja beda dari Push dan Pull — otot yang sama, rangsangan yang lain.',
    blok:[
      { n:'Pemanasan', m:8, ex:[
        {id:'up_w1', n:'Band pull-apart + shoulder circle', set:2, rep:'15 / 10', ist:'30 dtk', cue:'Bahu udah kepakai minggu ini, pelan-pelan.'},
        {id:'up_w2', n:'Push-up + scap pull-up', set:2, rep:'10 / 8', ist:'45 dtk', cue:'Sekadar nyalain otot.'},
      ]},
      { n:'Angkatan utama', m:24, ex:[
        {id:'up_m1', n:'Incline bench press', set:4, rep:'10', ist:'2 mnt', int:'65-70% 1RM', log:true, otot:'dada',
         cue:'Sisain 1-2 rep di tangki. Gagal angkat tiap set itu nambah capek lebih banyak daripada nambah otot.'},
        {id:'up_m2', n:'Chin-up berbeban', set:3, rep:'10', ist:'2 mnt', log:true, otot:'punggung', cue:'Genggaman menghadap badan, rentang penuh.'},
      ]},
      { n:'Aksesori', m:43, ex:[
        {id:'up_a1', n:'Dumbbell shoulder press', set:3, rep:'12', ist:'75 dtk', log:true, otot:'bahu', cue:'Duduk bersandar, gerakan terkontrol.'},
        {id:'up_a2', n:'Cable row', set:3, rep:'12', ist:'75 dtk', log:true, otot:'punggung', cue:'Tahan sebentar pas ketarik penuh.'},
        {id:'up_a3', n:'Lateral raise', set:3, rep:'15', ist:'45 dtk', log:true, otot:'bahu', cue:'Beban ringan, rep pelan.'},
        {id:'up_a4', n:'Face pull', set:3, rep:'15', ist:'45 dtk', log:true, otot:'bahu', cue:'Kesehatan bahu. Jangan dilewat.'},
        {id:'up_a5', n:'Hanging leg raise', set:3, rep:'12', ist:'60 dtk', otot:'perut', cue:'Panggul digulung ke atas, jangan cuma ayun kaki.'},
        {id:'up_a6', n:'Cable fly', set:3, rep:'12', ist:'60 dtk', log:true, otot:'dada',
         cue:'Rentangnya lebih panjang dari bench. Tahan sebentar pas dua tangan ketemu.'},
        {id:'up_a7', n:'EZ-bar curl', set:3, rep:'12', ist:'60 dtk', log:true, otot:'bisep',
         cue:'Batang EZ lebih enak di pergelangan daripada barbell lurus.'},
        {id:'up_a8', n:'Overhead rope extension', set:3, rep:'12', ist:'60 dtk', log:true, otot:'trisep',
         cue:'Siku tetap ngarah ke atas. Kalau sikunya melebar, bebannya kegedean.'},
      ]},
      { n:'Pendinginan & mobilitas', m:10, ex:[
        {id:'up_c1', n:'Mobilitas bahu, dada, punggung atas', set:1, rep:'60 dtk tiap pos', ist:'—',
         cue:'Besok Leg B. Badan atas boleh bener-bener lepas sekarang.'},
      ]},
    ]
  },

  basketA: {
    n:'Basket A — Shooting & Handling', jenis:'basket', menit:110, warna:'--c-clay', ikon:'🏀',
    fokus:'Sesi skill murni pas badan masih segar. Dikerjain sebelum angkat beban Push.',
    blok:[
      { n:'Pemanasan dinamis + bola', m:12, ex:[
        {id:'ba_w1', n:'Mobilitas dinamis (hip opener, arm swing, hamstring scoop)', set:1, rep:'2 menit', ist:'—', cue:'Gerak terus, jangan tahan peregangan.'},
        {id:'ba_w2', n:'Ladder / cone: quick feet, lateral shuffle, crossover step', set:1, rep:'2 menit', ist:'—', cue:'Kaki cepat, badan rendah.'},
        {id:'ba_w3', n:'Dribble jump stop → pivot → jab series', set:1, rep:'3 menit', ist:'—', cue:'Pijakan diperjelas. Sikap kaki yang rapi bikin semua gerakan lain gampang.'},
        {id:'ba_w4', n:'Form shooting 1 tangan dari 1 meter', set:1, rep:'20 masuk', ist:'—', cue:'Siku di bawah bola, pergelangan jatuh. Lihat lingkaran belakang ring.'},
      ]},
      { n:'Handling di bawah tekanan', m:28, ex:[
        {id:'ba_h1', n:'2 bola: pound, high-low, bergantian, crossover ritme', set:2, rep:'30 dtk tiap variasi', ist:'45 dtk',
         cue:'Mata ke depan terus. Dribble sekuat mungkin.'},
        {id:'ba_h2', n:'Zig-zag cone, 2 gerakan tiap cone', set:4, rep:'1 lintasan', ist:'45 dtk',
         cue:'Ganti arah dengan bahu rendah, ledak keluar dari gerakan — bukan cuma pindah bola.'},
        {id:'ba_h3', n:'Pound-push-pull series', set:3, rep:'45 detik', ist:'45 dtk', cue:'Latihan ngatur bola di ruang sempit.'},
        {id:'ba_h4', n:'Reaksi bola tenis / aba-aba suara', set:3, rep:'45 detik', ist:'45 dtk',
         cue:'Ini yang bedain handling latihan sama handling pertandingan: matanya nggak ke bola.'},
        {id:'ba_h5', n:'Tight window pick-up → gather → pull-up', set:1, rep:'8 rep', ist:'—', cue:'Ambil bola dari ruang sempit langsung naik.'},
      ]},
      { n:'Shooting utama', m:50, catatan:'Hitung yang MASUK, bukan yang dilempar. Kalau capek dan mekanik rusak, berhenti.', ex:[
        {id:'ba_s1', n:'Spot-up + relocate (sudut, wing, top)', set:1, rep:'5 masuk tiap spot', ist:'—',
         cue:'Habis nembak langsung pindah spot sambil sprint kecil, kayak di pertandingan.'},
        {id:'ba_s2', n:'Catch & shoot dari umpan sendiri', set:1, rep:'7 masuk × 5 spot', ist:'—',
         cue:'Kaki udah siap sebelum bola nyampe. Jangan nyetel kaki setelah nangkap.'},
        {id:'ba_s3', n:'1-dribble pull-up (wing & top)', set:1, rep:'5 masuk tiap sisi', ist:'—', cue:'Dribble kenceng, angkat lurus ke atas, mendarat di tempat yang sama.'},
        {id:'ba_s4', n:'Sprint into shot (transisi)', set:1, rep:'10 masuk', ist:'—', kontak:10,
         cue:'Lari dulu baru nembak — biar kebiasa nembak sambil napas berat.'},
        {id:'ba_s5', n:'Tantangan 3-2-1', set:3, rep:'3 catch&shoot, 2 off-dribble, 1 movement shot', ist:'60 dtk',
         cue:'Satu putaran harus tuntas berurutan. Kalau meleset, ulang nomor itu.'},
      ]},
      { n:'Free throw di bawah lelah', m:10, ex:[
        {id:'ba_f1', n:'5 free throw berturut masuk', set:1, rep:'sampai 5 berturut', ist:'—',
         cue:'Kalau meleset, sprint baseline sekali lalu ulang dari nol. Rutinitas sebelum nembak harus sama persis tiap kali.'},
      ]},
      { n:'Pendinginan', m:10, ex:[
        {id:'ba_c1', n:'Jalan santai + peregangan betis, hamstring, pinggul', set:1, rep:'45 dtk tiap pos', ist:'—',
         cue:'Habis ini lanjut Push di gym. Jangan duduk kelamaan.'},
      ]},
    ]
  },

  basketB: {
    n:'Basket B — Finishing & Kombinasi', jenis:'basket', menit:115, warna:'--c-clay', ikon:'🏀',
    fokus:'Selesaiin serangan di ring dan sambung gerakan jadi tembakan. Dikerjain sebelum Upper.',
    blok:[
      { n:'Pemanasan dinamis + bola', m:12, ex:[
        {id:'bb_w1', n:'Mobilitas dinamis + ladder quick feet', set:1, rep:'4 menit', ist:'—', cue:'Sama kayak Basket A.'},
        {id:'bb_w2', n:'Form shooting + close range 5 spot', set:1, rep:'5 masuk tiap spot', ist:'—', cue:'Bangun rasa dulu dari deket.'},
      ]},
      { n:'Handling singkat', m:12, ex:[
        {id:'bb_h1', n:'2 bola: 4 variasi', set:1, rep:'30 dtk tiap variasi', ist:'30 dtk', cue:'Sekadar jaga sentuhan.'},
        {id:'bb_h2', n:'Cone series, 2 gerakan tiap cone', set:3, rep:'1 lintasan', ist:'45 dtk', cue:'Kecepatan penuh.'},
      ]},
      { n:'Finishing di ring', m:35, ex:[
        {id:'bb_f1', n:'Mikan series (biasa, reverse, power)', set:2, rep:'10 tiap versi', ist:'45 dtk',
         cue:'Ritme kaki kanan-kiri, bola nggak turun ke bawah dada. Ini pemanasan wajib buat tangan lemah lo.'},
        {id:'bb_f2', n:'1 kaki vs 2 kaki: euro step, stride stop, inside-hand reverse', set:1, rep:'8 tiap sisi', ist:'—',
         cue:'Sadar lo lagi lepas landas dari kaki mana. Dua-duanya harus bisa.'},
        {id:'bb_f3', n:'Contact finishing (pakai pad / kursi)', set:1, rep:'10 tiap sisi', ist:'—',
         cue:'Nabrak dulu baru naik. Bola dilindungi pakai badan, bukan dijauhin.'},
        {id:'bb_f4', n:'Floater / runner', set:1, rep:'10 tiap sisi', ist:'—',
         cue:'Senjata buat lawan yang lebih tinggi. Lepas dari puncak lompatan, sentuhan lembut.'},
        {id:'bb_f5', n:'Timed finishing (30 detik, bolak-balik kreatif)', set:4, rep:'30 detik', ist:'60 dtk',
         cue:'Cepat, variatif, harus masuk. Kelelahan bikin lo nemu finishing yang paling efisien.'},
      ]},
      { n:'Kombinasi gerakan → tembakan', m:30, ex:[
        {id:'bb_k1', n:'Hesitation → pull-up', set:1, rep:'5 masuk tiap sisi', ist:'—', cue:'Jual pelan, ledak cepat.'},
        {id:'bb_k2', n:'Between-legs → step-back', set:1, rep:'5 masuk tiap sisi', ist:'—', cue:'Step-back-nya harus bikin ruang beneran, bukan cuma mundur.'},
        {id:'bb_k3', n:'Crossover → burst pull-up', set:1, rep:'5 masuk tiap sisi', ist:'—', cue:'Ganti arah dengan bahu, langsung naik.'},
        {id:'bb_k4', n:'2-dribble shot creator (baca ruang)', set:1, rep:'10 rep', ist:'—', cue:'Maksimal 2 dribble. Batasan bikin lo efisien.'},
        {id:'bb_k5', n:'Shot fake → re-attack → finish / pull-up', set:1, rep:'8 rep', ist:'—', cue:'Tipuan harus mirip tembakan aslinya.'},
      ]},
      { n:'Situasi & kondisi fisik', m:15, ex:[
        {id:'bb_g1', n:'Sprint penuh lapangan, maks 3 dribble → layup', set:1, rep:'6 rep', ist:'45 dtk', kontak:12,
         cue:'Kecepatan penuh. Layup-nya tetap harus masuk.'},
        {id:'bb_g2', n:'"Game winner" — 10 detik di jam', set:1, rep:'5 rep', ist:'—', cue:'Bikin sendiri situasinya, hitung mundur beneran.'},
      ]},
      { n:'Free throw + pendinginan', m:11, ex:[
        {id:'bb_c1', n:'5 free throw berturut masuk', set:1, rep:'sampai 5 berturut', ist:'—', cue:'Rutinitas yang sama tiap kali.'},
        {id:'bb_c2', n:'Peregangan betis, hamstring, pinggul, punggung bawah', set:1, rep:'45 dtk tiap pos', ist:'—', cue:'Lanjut Upper setelah ini.'},
      ]},
    ]
  },

  basketC: {
    n:'Basket C — Volume Shooting (opsional)', jenis:'basket', menit:80, warna:'--c-warn', ikon:'🎯', opsional:true,
    fokus:'Sesi ketiga yang opsional. Sengaja minim lompatan biar nggak numpuk beban di kaki menjelang libur.',
    blok:[
      { n:'Pemanasan', m:10, ex:[
        {id:'bc_w1', n:'Mobilitas dinamis + dribble ringan', set:1, rep:'4 menit', ist:'—', cue:'Santai aja.'},
        {id:'bc_w2', n:'Form shooting 1 tangan → 2 tangan', set:1, rep:'25 masuk', ist:'—', cue:'Pelan, rasain lepasnya bola.'},
      ]},
      { n:'Volume shooting', m:45, catatan:'Target 150 tembakan masuk. Catat persentasenya, itu angka yang bakal lo lihat naik.', ex:[
        {id:'bc_s1', n:'5 spot × 3 putaran — catch & shoot', set:3, rep:'10 masuk tiap spot', ist:'60 dtk',
         cue:'Sudut, wing kanan, top, wing kiri, sudut. Kaki siap sebelum bola datang.'},
        {id:'bc_s2', n:'1-dribble kanan & kiri dari tiap wing', set:2, rep:'8 masuk tiap sisi', ist:'60 dtk', cue:'Dua arah harus sama nyamannya.'},
        {id:'bc_s3', n:'Movement shot: curl, flare, relokasi', set:1, rep:'8 masuk tiap jenis', ist:'—', cue:'Lari dulu, baru nembak.'},
      ]},
      { n:'Free throw', m:15, ex:[
        {id:'bc_f1', n:'10 set × 5 free throw', set:10, rep:'5 tembakan', ist:'30 dtk',
         cue:'Catat berapa yang masuk dari 50. Target di atas 80%.'},
      ]},
      { n:'Pendinginan', m:10, ex:[
        {id:'bc_c1', n:'Peregangan menyeluruh + napas', set:1, rep:'60 dtk tiap pos', ist:'—', cue:'Besok libur total. Nikmatin.'},
      ]},
    ]
  },
};

/* jadwal mingguan — 0 Minggu … 6 Sabtu. Hari lower nggak pernah barengan basket. */
/* Bodybuilding 5 hari: PPL + Upper/Lower. Tiap otot kena 2x seminggu, dan itu
   yang paling konsisten kelihatan hasilnya dibanding sekali seminggu.
   Libur Kamis dan Minggu sengaja dipisah, bukan nempel — pulihnya kebagi rata.
   lowerA dan ketiga sesi basket nggak dihapus, cuma nggak dijadwalin. Balikin
   lewat Atur jadwal kalau nanti balik ngejar lompatan. */
const JADWAL_BAKU = {
  1: ['push'],
  2: ['pull'],
  3: ['lowerB'],
  4: [],
  5: ['upper'],
  6: ['kaki'],
  0: [],
};
const KONTAK_CAP = 200;   // batas kontak plyo per minggu, dipakai sesi lompat & basket

/* Rem buat program bodybuilding. Yang nentuin pertumbuhan dan juga risiko itu
   jumlah set kerja per kelompok otot per minggu, bukan kontak lompatan.
   Di bawah 10 rangsangannya kurang; di atas 20 tambahannya makin kecil
   sementara capek dan risiko sendinya terus naik.
   shortcut: set dihitung bulat dari program, bukan dari jumlah baris beban yang
   beneran diisi. Kalau nanti pencatatan set per set rajin diisi, ganti ke itu. */
const SET_MIN = 10, SET_MAX = 20;
const OTOT = [
  ['dada','Dada'], ['punggung','Punggung'], ['bahu','Bahu'],
  ['bisep','Bisep'], ['trisep','Trisep'], ['kuadrisep','Paha depan'],
  ['hamstring','Hamstring'], ['glute','Glute'], ['betis','Betis'], ['perut','Perut'],
];

/* ---------- helper ---------- */
/* Jadwal lama waktu masih ngejar vertical jump. Dipakai cuma buat NGENALIN, biar
   pengguna lama kepindah sendiri ke jadwal bodybuilding. */
const JADWAL_LOMPAT = {
  1: ['lowerA'], 2: ['basketA', 'push'], 3: ['pull'],
  4: ['lowerB'], 5: ['basketB', 'upper'], 6: ['basketC'], 0: [],
};

function LT(){
  if (!S.latihan) S.latihan = { jadwal: JSON.parse(JSON.stringify(JADWAL_BAKU)), sesi: [], jamIngat:'06:30', ingatLatihan:false };
  if (!S.latihan.jadwal) S.latihan.jadwal = JSON.parse(JSON.stringify(JADWAL_BAKU));
  /* Jadwal itu kesimpen di data pengguna, jadi ngubah JADWAL_BAKU doang nggak ngaruh
     ke yang udah kepasang. Pindahin otomatis — TAPI cuma kalau jadwalnya masih persis
     bawaan lama. Kalau pernah diatur sendiri, jangan disentuh: jadwal buatan sendiri
     itu keputusan, bukan sisa setelan pabrik. */
  try{
    if (JSON.stringify(S.latihan.jadwal) === JSON.stringify(JADWAL_LOMPAT))
      S.latihan.jadwal = JSON.parse(JSON.stringify(JADWAL_BAKU));
  }catch(e){}
  if (!S.latihan.sesi) S.latihan.sesi = [];
  if (!S.latihan.ganti) S.latihan.ganti = {};   // { idSlot: idGerakanPengganti }
  return S.latihan;
}

/* ---------- gerakan pengganti ----------
   PROGRAM itu katalog asli dan nggak pernah diubah. Yang berubah cuma pilihan
   pengganti di S.latihan.ganti, dan sesi() yang nyatuin keduanya.

   Log beban dikunci ke id gerakan, bukan ke slotnya. Jadi ganti gerakan =
   riwayat baru buat gerakan itu, dan riwayat yang lama tetap utuh di tempatnya.
   Kalau id slot dipakai ulang, kg dumbbell bakal nyampur sama kg barbell di
   grafik yang sama, dan angkanya jadi ngibul. */
const SLOT = (() => {
  const m = {};
  for (const sid in PROGRAM) PROGRAM[sid].blok.forEach(b => b.ex.forEach(e => { m[e.id] = { ex:e, sid }; }));
  return m;
})();

/* gerakan yang beneran dipakai di satu slot */
function gerakan(slotId){
  const asli = SLOT[slotId] && SLOT[slotId].ex;
  if (!asli) return null;
  const pilih = (LT().ganti || {})[slotId];
  if (!pilih || pilih === slotId) return asli;
  const alt = (typeof ALT !== 'undefined' ? (ALT[slotId] || []) : []).find(x => x.id === pilih);
  // otot diwarisin dari slotnya: alternatif wajib sepola sama bawaannya, jadi
  // kelompok ototnya pasti sama. Tanpa ini, gerakan yang diganti ilang dari
  // hitungan set per otot dan remnya ngelaporin angka yang kekecilan.
  return alt ? { otot: asli.otot, ...alt, slot: slotId } : asli;   // pilihan basi -> balik ke bawaan
}

/* semua pilihan buat satu slot, bawaan selalu yang pertama */
function pilihanGerakan(slotId){
  const asli = SLOT[slotId] && SLOT[slotId].ex;
  if (!asli) return [];
  return [asli, ...(typeof ALT !== 'undefined' ? (ALT[slotId] || []) : [])];
}

/* PROGRAM sesudah pilihan pengganti dipakai. Ini yang digambar DAN yang dihitung —
   kalau penghitung kontak masih baca PROGRAM mentah, rem cederanya ngelaporin
   angka gerakan yang nggak lo kerjain. */
function sesi(sid){
  const p = PROGRAM[sid];
  if (!p) return null;
  const g = LT().ganti || {};
  const adaGanti = p.blok.some(b => b.ex.some(e => g[e.id] && g[e.id] !== e.id));
  if (!adaGanti) return p;
  return { ...p, blok: p.blok.map(b => ({ ...b, ex: b.ex.map(e => gerakan(e.id)) })) };
}
const sesiHari = d => (LT().jadwal[fromD(d).getDay()] || []);
const logSesi  = (d, id) => LT().sesi.find(s => s.d === d && s.sid === id);
function bukaLog(d, id){
  let s = logSesi(d, id);
  if (!s){ s = { id:uid(), d, sid:id, mulai:'', selesai:'', ceklis:{}, set:{}, kurang:'', rasa:0 }; LT().sesi.push(s); }
  return s;
}
const sesiKelar = s => {
  if (!s) return 0;
  const p = sesi(s.sid); if (!p) return 0;
  const total = p.blok.reduce((t,b)=>t+b.ex.length, 0);
  return total ? Object.values(s.ceklis||{}).filter(Boolean).length / total : 0;
};
function kontakSesi(sid){
  const p = sesi(sid); if (!p) return 0;
  return p.blok.reduce((t,b)=> t + b.ex.reduce((u,e)=>u + (e.kontak||0), 0), 0);
}
function mingguIni(){
  const d = fromD(today()), off = (d.getDay() + 6) % 7;   // Senin = awal minggu
  const sen = addDays(today(), -off);
  return [...Array(7)].map((_,i)=>addDays(sen, i));
}
/* Dihitung dari sesi yang BENERAN dicatat minggu ini, bukan dari jadwal.
   Kalau Lower A digeser ke hari lain, kontaknya tetap masuk hitungan — ini
   penghitung pengaman cedera, jadi dia harus ngikutin kenyataan. */
function kontakMinggu(){
  const hari = mingguIni();
  return sum(LT().sesi.filter(s => hari.includes(s.d)), s => kontakSesi(s.sid) * sesiKelar(s));
}
/* Jumlah sesi yang kelar minggu ini, juga dari catatan bukan jadwal. */
function sesiKelarMinggu(){
  const hari = mingguIni();
  return LT().sesi.filter(s => hari.includes(s.d) && sesiKelar(s) >= .8).length;
}
/* Set kerja per kelompok otot minggu ini. Dihitung dari gerakan yang BENERAN
   dicentang, bukan dari jadwal — sama alasannya kayak penghitung kontak. */
function setPerOtot(){
  const hari = mingguIni(), out = {};
  LT().sesi.filter(s => hari.includes(s.d)).forEach(s => {
    const p = sesi(s.sid); if (!p) return;
    p.blok.forEach(b => b.ex.forEach(e => {
      if (!e.otot || !(s.ceklis || {})[e.id]) return;
      // Gerakan majemuk ngelatih lebih dari satu kelompok. Squat itu paha depan
      // DAN glute — kalau cuma dihitung satu, glute kelihatan nggak kelatih
      // padahal tiap minggu kena, dan remnya bakal ngomel tanpa alasan.
      [].concat(e.otot).forEach(k => { out[k] = (out[k] || 0) + (+e.set || 0); });
    }));
  });
  return out;
}

function volumeAngkat(d){
  const s = LT().sesi.filter(x=>x.d===d);
  return sum(s, x => sum(Object.values(x.set||{}), arr => sum(arr, st => (+st.kg||0) * (+st.rep||0))));
}
function volumeMinggu(){ return sum(mingguIni(), volumeAngkat); }
/* Perkiraan 1RM (Epley). Dipakai, bukan "kg terberat", karena rep ikut berubah:
   60kg x 8 itu lebih berat dari 70kg x 3, dan grafik yang cuma baca kg bakal
   bilang naik padahal turun. Rumusnya kasar di atas ~10 rep — di situ yang
   kelatih daya tahan, bukan kekuatan maksimal.
   shortcut: set di atas 12 rep dibuang dari grafik, bukan dikoreksi. Kalau nanti
   ada blok rep tinggi yang serius, ganti ke rumus yang lebih cocok (Brzycki). */
const epley = (kg, rep) => kg * (1 + rep / 30);

/* Satu titik per sesi per gerakan: set terbaik hari itu. */
function progresiGerakan(exId){
  const titik = [];
  LT().sesi.forEach(s => {
    let best = null;
    (s.set?.[exId] || []).forEach(v => {
      const kg = +v.kg || 0, rep = +v.rep || 0;
      if (!kg || !rep || rep > 12) return;
      const e = epley(kg, rep);
      if (!best || e > best.e) best = { e, kg, rep };
    });
    if (best) titik.push({ d: s.d, ...best });
  });
  return titik.sort((a, b) => a.d < b.d ? -1 : 1);
}

/* Gerakan yang punya cukup data buat digambar, yang paling sering duluan. */
function gerakanBerprogres(minTitik = 2){
  const id = new Set();
  LT().sesi.forEach(s => Object.keys(s.set || {}).forEach(k => id.add(k)));
  return [...id]
    .map(exId => {
      const t = progresiGerakan(exId);
      const nama = SLOT[exId] ? SLOT[exId].ex.n
        : (Object.values(ALT).flat().find(g => g.id === exId) || {}).n || exId;
      return { exId, nama, titik: t };
    })
    .filter(x => x.titik.length >= minTitik)
    .sort((a, b) => b.titik.length - a.titik.length);
}

/* Set dari sesi TERAKHIR gerakan ini kecatat. Ini kolom yang ada di tiap
   aplikasi angkat beban serius, dan alasannya sederhana: pas lo berdiri di
   depan barbell, yang lo butuh itu angka minggu lalu — bukan grafik. */
function setTerakhir(exId, kecualiTgl){
  const s = LT().sesi
    .filter(x => x.d !== kecualiTgl && (x.set?.[exId] || []).some(v => v && +v.kg && +v.rep))
    .sort((a, b) => a.d < b.d ? 1 : -1)[0];
  return s ? { d: s.d, set: s.set[exId] } : null;
}

/* Perkiraan 1RM terbaik dari sesi sebelum hari ini — pembanding buat rekor baru. */
function rekorGerakan(exId, kecualiTgl){
  let best = 0;
  LT().sesi.forEach(s => {
    if (s.d === kecualiTgl) return;
    (s.set?.[exId] || []).forEach(v => {
      const kg = +v.kg || 0, rep = +v.rep || 0;
      if (!kg || !rep || rep > 12) return;
      best = Math.max(best, epley(kg, rep));
    });
  });
  return best;
}

function sesiTerakhir(n=5){
  return [...LT().sesi].filter(s=>sesiKelar(s)>0).sort((a,b)=>a.d<b.d?1:-1).slice(0,n);
}

/* ---------- layar Latihan ---------- */
function renderLatihan(){
  $('#progSub').textContent = 'skripsi · kerja · badan · latihan';
  const L = LT(), d = today(), hariIni = sesiHari(d);
  const mgg = mingguIni();
  const totalSesi = sum(mgg, x => sesiHari(x).length);
  const doneSesi  = sesiKelarMinggu();
  const kk = kontakMinggu(), vol = volumeMinggu();
  const so = setPerOtot(), soTotal = sum(Object.values(so));
  const soKurang = OTOT.filter(([k]) => (so[k] || 0) > 0 && so[k] < SET_MIN).map(([, n]) => n);
  const soLebih  = OTOT.filter(([k]) => (so[k] || 0) > SET_MAX).map(([, n]) => n);

  $('#progBody').innerHTML = `
  <div class="card">
    <div class="row between" style="margin-bottom:12px">
      <div><div class="lbl">Minggu ini</div>
        <div class="mid tnum">${doneSesi}<span class="dim" style="font-size:14px">/${totalSesi} sesi</span></div></div>
      <button class="chip" data-sheet="jadwalLatihan">Atur jadwal</button>
    </div>
    <div class="bar" style="margin-bottom:14px"><i style="width:${totalSesi?(doneSesi/totalSesi*100).toFixed(0):0}%;background:var(--c-lime)"></i></div>
    <div class="grid2">
      <div style="background:var(--surface-2);border-radius:var(--r-md);padding:11px 12px">
        <div class="lbl">Volume angkat</div>
        <div class="mid tnum" style="margin-top:3px">${vol>=1000?(vol/1000).toFixed(1).replace('.',',')+' ton':Math.round(vol)+' kg'}</div>
      </div>
      <div style="background:var(--surface-2);border-radius:var(--r-md);padding:11px 12px">
        <div class="lbl">Set kerja</div>
        <div class="mid tnum" style="margin-top:3px">${soTotal}<span class="dim" style="font-size:13px"> set</span></div>
      </div>
    </div>
    ${soTotal ? `<div style="margin-top:13px">
      ${OTOT.filter(([k])=>so[k]).map(([k,nama])=>{
        const v = so[k];
        const w = v > SET_MAX ? '--c-warn' : v >= SET_MIN ? '--c-ok' : '--text-3';
        return `<div class="row between" style="gap:9px;margin-bottom:6px">
          <span class="xs dim" style="width:74px;flex:none">${nama}</span>
          <span class="bar grow" style="height:6px"><i style="width:${clamp(v/SET_MAX*100,4,100).toFixed(0)}%;background:${cssv(w)}"></i></span>
          <span class="xs tnum" style="width:30px;flex:none;text-align:right;font-weight:700;color:var(${w})">${v}</span>
        </div>`;
      }).join('')}
    </div>` : ''}
    ${soLebih.length ? `<div class="xs" style="margin-top:8px;color:var(--c-warn)">
      ${soLebih.join(', ')} udah lewat ${SET_MAX} set minggu ini. Tambahannya makin kecil, capeknya nggak — sisanya mending buat otot lain.</div>`
      : soKurang.length ? `<div class="xs dim" style="margin-top:8px">
      ${soKurang.join(', ')} masih di bawah ${SET_MIN} set. Kalau minggunya belum habis, itu wajar.</div>`
      : `<div class="xs dim" style="margin-top:8px">Sasaran ${SET_MIN}–${SET_MAX} set per otot per minggu. Di bawah itu rangsangannya kurang, di atas itu cuma nambah capek.</div>`}
    ${kk > KONTAK_CAP ? `<div class="xs" style="margin-top:8px;color:var(--c-bad)">Kontak lompatan ${Math.round(kk)}/${KONTAK_CAP} — lewat batas aman.</div>` : ''}
  </div>

  ${hariIni.length ? `<div class="sect"><h2>Hari ini</h2></div>
  <div class="stack">${hariIni.map(sid=>{
    const p = sesi(sid), s = logSesi(d, sid), pc = sesiKelar(s);
    return `<button class="card press" data-mulai="${sid}" style="width:100%;text-align:left;border-left:3px solid var(${p.warna})">
      <div class="row between" style="margin-bottom:8px">
        <span class="row" style="gap:8px"><span style="font-size:17px">${p.ikon}</span>
          <span style="font-weight:750;font-size:15px;letter-spacing:-.025em">${esc(p.n)}</span></span>
        <span class="badge">${p.menit} mnt</span>
      </div>
      <div class="xs dim" style="line-height:1.5;margin-bottom:9px">${esc(p.fokus)}</div>
      <div class="bar" style="height:5px"><i style="width:${(pc*100).toFixed(0)}%;background:var(${p.warna})"></i></div>
      <div class="row between xs" style="margin-top:7px">
        <span class="dim">${pc>=1?'Selesai':pc>0?Math.round(pc*100)+'% jalan':'Belum mulai'}</span>
        <span style="font-weight:700;color:var(${p.warna})">${pc>0&&pc<1?'Lanjutkan →':pc>=1?'Lihat →':'Mulai →'}</span>
      </div>
    </button>`;
  }).join('')}</div>`
  : `<div class="sect"><h2>Hari ini</h2></div>
     <div class="card"><div class="empty"><b>Hari libur</b>Nggak ada sesi terjadwal. Istirahat itu bagian dari programnya — otot tumbuh pas lo nggak latihan.</div></div>`}

  <div class="sect"><h2>Jadwal mingguan</h2></div>
  <div class="card tight">
    ${mgg.map(x=>{
      const list = sesiHari(x), ini = x === d;
      const done = list.length && list.every(sid => sesiKelar(logSesi(x, sid)) >= .8);
      return `<div class="item" style="${ini?'background:var(--surface-2);margin:0 -13px;padding:12px 13px;border-radius:12px':''}">
        <div style="width:36px;flex:none">
          <div class="lbl" style="letter-spacing:.02em">${HARI3[fromD(x).getDay()]}</div>
          <div class="tnum" style="font-size:15px;font-weight:${ini?800:600};margin-top:1px">${fromD(x).getDate()}</div>
        </div>
        <div class="grow">
          ${list.length ? list.map(sid=>{
            const p = sesi(sid);
            return `<div class="row" style="gap:7px;margin-bottom:3px">
              <span class="dot" style="background:var(${p.warna})"></span>
              <span class="sm" style="font-weight:600">${esc(p.n.split(' — ')[0])}</span>
              <span class="xs dim">${p.menit}m</span>
            </div>`;
          }).join('') : `<span class="sm dim">Libur</span>`}
        </div>
        ${done?`<span style="color:var(--c-ok);font-weight:800">✓</span>`:''}
      </div>`;
    }).join('')}
  </div>

  <div class="sect"><h2>Semua sesi</h2></div>
  <div class="stack">${Object.entries(PROGRAM).map(([sid,p])=>`
    <button class="card tight press" data-lihat="${sid}" style="width:100%;text-align:left">
      <div class="row between">
        <span class="row" style="gap:9px"><span style="font-size:16px">${p.ikon}</span>
          <span><span style="font-weight:700;font-size:14px;display:block">${esc(p.n)}</span>
          <span class="xs dim">${p.blok.reduce((t,b)=>t+b.ex.length,0)} gerakan · ${p.menit} menit${p.opsional?' · opsional':''}</span></span></span>
        <span class="dim" style="font-size:18px">›</span>
      </div>
    </button>`).join('')}</div>

  ${(()=>{
    const prog = gerakanBerprogres();
    if (!prog.length) return `<div class="sect"><h2>Progres beban</h2></div>
      <div class="card"><div class="empty"><b>Belum cukup data</b>Catat kg &times; rep di dua sesi buat gerakan yang sama, grafiknya muncul sendiri.</div></div>`;
    return `<div class="sect"><h2>Progres beban</h2><span class="link dim">${prog.length} gerakan</span></div>
    ${prog.slice(0, 8).map(g=>{
      const awal = g.titik[0], akhir = g.titik.at(-1);
      const naik = akhir.e - awal.e;
      const persen = awal.e ? naik / awal.e * 100 : 0;
      const warna = naik > 0.5 ? '--c-ok' : naik < -0.5 ? '--c-bad' : '--text-2';
      return `<div class="card" style="margin-bottom:11px">
        <div class="row between" style="align-items:flex-start;margin-bottom:4px">
          <div class="grow"><div class="sm" style="font-weight:700">${esc(g.nama)}</div>
            <div class="xs dim">${g.titik.length} sesi &middot; terakhir ${akhir.kg}kg &times; ${akhir.rep}</div></div>
          <div style="text-align:right">
            <div class="mid tnum" style="color:var(${warna})">${naik>=0?'+':'&minus;'}${Math.abs(naik).toFixed(1)}<span style="font-size:12px"> kg</span></div>
            <div class="xs dim tnum">${persen>=0?'+':'&minus;'}${Math.abs(persen).toFixed(0)}%</div>
          </div>
        </div>
        ${areaChart(g.titik.map(t=>({ l: tgl(t.d), v: +t.e.toFixed(1) })), { h:92, color:warna, fmtY:v=>Math.round(v)+'kg' })}
      </div>`;
    }).join('')}
    <div class="xs dim" style="margin:-2px 0 4px">Angkanya perkiraan 1RM dari set terbaik tiap sesi, jadi naik-turun rep ikut kehitung. Set di atas 12 rep nggak dipakai.</div>`;
  })()}

  <div class="sect"><h2>Riwayat & saran</h2></div>
  <button class="btn ghost block sm" id="saranLatihan" style="margin-bottom:12px">✦ Minta saran dari asisten</button>
  ${sesiTerakhir().length ? `<div class="card tight">${sesiTerakhir().map(s=>{
    const p = sesi(s.sid); if (!p) return '';
    const pc = sesiKelar(s);
    return `<button class="item press" data-riwayat="${s.id}" style="width:100%;text-align:left;background:none">
      <span class="ico" style="background:var(--surface-2)">${p.ikon}</span>
      <span class="grow"><span class="t" style="display:block">${esc(p.n.split(' — ')[0])}</span>
      <span class="s">${tgl(s.d)}${s.kurang?' · ada catatan':''}</span></span>
      <span class="amt tnum" style="color:var(${pc>=1?'--c-ok':'--text-2'})">${Math.round(pc*100)}%</span>
    </button>`;
  }).join('')}</div>` : `<div class="card"><div class="empty"><b>Belum ada sesi tercatat</b>Mulai sesi hari ini, nanti riwayat sama sarannya muncul di sini.</div></div>`}
  `;

  const sb = $('#saranLatihan');
  if (sb) sb.onclick = ()=>{
    if (!AI.siap()){ openAI(); return; }
    openAI();
    setTimeout(()=> aiSend('Lihat program latihan sama 5 sesi terakhir gua, terutama catatan kekurangannya. Kasih 3 saran konkret buat sesi berikutnya — sebutin gerakan dan angkanya, jangan umum.'), 400);
  };
}

/* ---------- panel sesi (layar penuh) ---------- */
let sesiAktif = null, timerIst = null;

const prSudah = new Set();   // gerakan yang rekornya udah diumumin di sesi ini
function bukaSesi(sid, tglSesi){
  prSudah.clear();
  const p = sesi(sid); if (!p) return;
  sesiAktif = { sid, d: tglSesi || today() };
  const s = bukaLog(sesiAktif.d, sid);
  if (!s.mulai) s.mulai = new Date().toTimeString().slice(0,5);
  commit(false);
  $('#ses').classList.add('on');
  document.body.style.overflow = 'hidden';
  gambarSesi();
  pulihkanIstirahat();
}
function tutupSesi(){
  $('#ses').classList.remove('on');
  document.body.style.overflow = '';
  stopIstirahat();
  sesiAktif = null; render();
}
function stopIstirahat(){
  clearInterval(timerIst);
  LS.del('rutin.ist');
  Notif.batalIstirahat();
  $('#istBar').classList.remove('on');
  $('#ses').classList.remove('istaktif');
}

/* ubah satu ceklis tanpa gambar ulang seluruh layar —
   biar posisi scroll dan petunjuk yang lagi kebuka nggak ilang */
function toggleCeklis(exId){
  const { sid, d } = sesiAktif;
  const s = bukaLog(d, sid); s.ceklis = s.ceklis || {};
  s.ceklis[exId] = !s.ceklis[exId];
  const on = s.ceklis[exId];
  const btn = $(`[data-exceklis="${exId}"]`);
  if (btn){ btn.classList.toggle('on', on); btn.closest('.ex').classList.toggle('done', on); }
  buzz(on ? 14 : 6);
  commit(false);
  perbaruiKepala();
}
function perbaruiKepala(){
  if (!sesiAktif) return;
  const { sid, d } = sesiAktif, p = sesi(sid), pc = sesiKelar(bukaLog(d, sid));
  $('#sesSub').textContent = `${tglFull(d).split(',')[0]} · ${p.menit} menit · ${Math.round(pc*100)}%`;
  $('#sesRing').style.width = (pc*100).toFixed(0) + '%';
  const btn = $('#sesSelesai'); if (btn) btn.textContent = pc >= 1 ? 'Tutup' : 'Selesaikan sesi';
}

function gambarSesi(){
  if (!sesiAktif) return;
  const { sid, d } = sesiAktif, p = sesi(sid), s = bukaLog(d, sid);
  const pc = sesiKelar(s);
  const scrollLama = $('#sesLog').scrollTop;
  const cueKebuka = $$('#sesLog .excue.on').map(e=>e.id);
  $('#sesJudul').textContent = p.n;
  $('#sesSub').textContent = `${tglFull(d).split(',')[0]} · ${p.menit} menit · ${Math.round(pc*100)}%`;
  $('#sesRing').style.width = (pc*100).toFixed(0) + '%';

  $('#sesLog').innerHTML = `
    <div class="card tight" style="margin-bottom:14px;background:var(--surface-2)">
      <div class="xs" style="line-height:1.55">${esc(p.fokus)}</div>
    </div>
    ${p.blok.map((b,bi)=>`
      <div class="blok">
        <div class="blokhead">
          <span class="lbl">${esc(b.n)}</span>
          <span class="badge">${b.m} mnt</span>
        </div>
        ${b.catatan?`<div class="xs dim" style="margin:0 0 10px;line-height:1.5">${esc(b.catatan)}</div>`:''}
        ${b.ex.map(e=>{
          const on = !!(s.ceklis||{})[e.id];
          const set = (s.set||{})[e.id] || [];
          return `<div class="ex ${on?'done':''}">
            <div class="exhead">
              <button class="check ${on?'on':''}" data-exceklis="${e.id}">
                <svg viewBox="0 0 24 24" fill="none"><polyline points="4 12.5 9.5 18 20 6.5"/></svg></button>
              <button class="grow press" data-excue="${e.id}" style="text-align:left;background:none">
                <div class="exn">${esc(e.n)}</div>
                <div class="exs">${e.set>1?e.set+' set × ':''}${esc(e.rep)}${e.int?' · '+esc(e.int):''}${e.ist&&e.ist!=='—'?' · ist '+esc(e.ist):''}${e.kontak?' · '+e.kontak+' kontak':''}</div>
              </button>
              ${(typeof ALT !== 'undefined' && ALT[e.slot || e.id]) ?
                `<button class="isttombol" data-ganti="${esc(e.slot || e.id)}" title="Ganti gerakan">⇄</button>` : ''}
              ${e.ist&&e.ist!=='—'?`<button class="isttombol" data-ist="${esc(e.ist)}">⏱</button>`:''}
            </div>
            <div class="excue" id="cue_${e.id}">${esc(e.cue||'')}</div>
            ${e.log?`<div class="exsets">
              ${(()=>{ const l = setTerakhir(e.id, d);
                return l ? `<div class="xs dim" style="margin:-2px 0 2px">Terakhir ${tgl(l.d)} · ketuk angkanya buat nyalin</div>` : ''; })()}
              ${[...Array(e.set)].map((_,i)=>{
                const v = set[i] || {};
                const lalu = (setTerakhir(e.id, d) || {set:[]}).set[i] || {};
                const adaLalu = +lalu.kg && +lalu.rep;
                return `<div class="setrow">
                  <span class="setno tnum">${i+1}</span>
                  ${adaLalu
                    ? `<button class="setlalu tnum press" data-isi="${e.id}|${i}|${lalu.kg}|${lalu.rep}">${lalu.kg}×${lalu.rep}</button>`
                    : `<span class="setlalu kosong">–</span>`}
                  <input class="setinp tnum" inputmode="decimal" placeholder="kg" value="${v.kg??''}" data-setkg="${e.id}" data-i="${i}">
                  <span class="setx">×</span>
                  <input class="setinp tnum" inputmode="numeric" placeholder="rep" value="${v.rep??''}" data-setrep="${e.id}" data-i="${i}">
                </div>`;
              }).join('')}
              ${set.length && set.some(x=>x&&x.kg&&x.rep) ? `<div class="setvol xs dim">Volume ${Math.round(sum(set, x=>(+x.kg||0)*(+x.rep||0))).toLocaleString('id-ID')} kg</div>`:''}
            </div>`:''}
          </div>`;
        }).join('')}
      </div>`).join('')}

    <div class="sect"><h2>Catatan kekurangan</h2></div>
    <div class="card">
      <div class="xs dim" style="margin-bottom:9px;line-height:1.5">Apa yang kerasa kurang hari ini? Gerakan yang berat, sakit di mana, teknik yang goyang, tembakan yang meleset terus. Ini yang dibaca asisten pas ngasih saran.</div>
      <textarea class="inp" id="sesKurang" placeholder="Depth jump kerasa lambat mantulnya. Lutut kiri agak nyeri pas mendarat. Free throw cuma 6/10.">${esc(s.kurang||'')}</textarea>
      <div class="lbl" style="margin:14px 0 8px">Rasanya gimana</div>
      <div class="row" style="gap:8px">
        ${['Berat banget','Berat','Pas','Enteng','Kurang nampol'].map((l,i)=>
          `<button class="chip ${s.rasa===i+1?'on':''}" data-rasa="${i+1}" style="flex:1;padding:8px 4px;font-size:11px;text-align:center">${l}</button>`).join('')}
      </div>
    </div>

    <div class="row" style="gap:9px;margin:16px 0 6px">
      <button class="btn ghost block" id="sesSaran">✦ Saran</button>
      <button class="btn block" id="sesSelesai">${pc>=1?'Tutup':'Selesaikan sesi'}</button>
    </div>`;

  cueKebuka.forEach(id => { const el = document.getElementById(id); el && el.classList.add('on'); });
  $('#sesLog').scrollTop = scrollLama;

  const ta = $('#sesKurang');
  ta.oninput = ()=>{ bukaLog(d,sid).kurang = ta.value; S.updatedAt=Date.now(); LS.set('rutin.state',S); Store.save(); };
  $('#sesSelesai').onclick = ()=>{
    const lg = bukaLog(d, sid);
    lg.selesai = new Date().toTimeString().slice(0,5);
    const pj = sesi(sid);
    // masukin ke linimasa harian sebagai blok waktu + catat latihan
    if (sesiKelar(lg) >= .5 && !lg.dicatat){
      lg.dicatat = true;
      const dd = day(d);
      dd.blocks.push({ id:uid(), s:lg.mulai||'16:00', e:lg.selesai, c:'olahraga', t:pj.n });
      S.badan.latihan.push({ id:uid(), d, jenis:pj.n.split(' — ')[0], menit:pj.menit, note:lg.kurang.slice(0,80) });
    }
    commit(); tutupSesi(); toast('Sesi tercatat. Mantap.'); buzz(20);
  };
  $('#sesSaran').onclick = ()=>{
    if (!AI.siap()){ tutupSesi(); openAI(); return; }
    const lg = bukaLog(d, sid);
    tutupSesi(); openAI();
    setTimeout(()=> aiSend(`Gua baru selesai sesi "${p.n}". Catatan gua: ${lg.kurang || '(belum diisi)'}. Kasih saran buat sesi ini minggu depan — apa yang mesti diubah, gerakan pengganti kalau ada yang bermasalah, dan beban/rep yang disaranin.`), 400);
  };
}

/* Timer istirahat.
   Yang dihitung waktu selesainya, BUKAN jumlah tik — soalnya di gym HP itu ditaruh
   dan layarnya mati, dan browser/WebView bakal ngerem setInterval sampai berhenti.
   Sisa waktu selalu diitung ulang dari selisih jam, plus notifikasi buat jaga-jaga
   kalau prosesnya keburu dibunuh. */
function detikIstirahat(teks){
  const m = String(teks).match(/([\d,\.]+)\s*(mnt|menit|dtk|detik)/i);
  if (!m) return 90;
  const n = parseFloat(m[1].replace(',','.'));
  return Math.round(/dtk|detik/i.test(m[2]) ? n : n*60);
}
function mulaiIstirahat(teks){
  const det = detikIstirahat(teks);
  const akhir = Date.now() + det*1000;
  LS.set('rutin.ist', { akhir, det });      // selamat walau app-nya dibunuh
  Notif.alarmIstirahat(akhir);
  jalanIstirahat(akhir, det);
}
function jalanIstirahat(akhir, det){
  clearInterval(timerIst);
  $('#istBar').classList.add('on');
  $('#ses').classList.add('istaktif');
  const gambar = ()=>{
    const sisa = Math.max(0, Math.round((akhir - Date.now())/1000));
    $('#istWaktu').textContent = `${Math.floor(sisa/60)}:${pad(sisa%60)}`;
    $('#istIsi').style.width = (100 - sisa/det*100).toFixed(1) + '%';
    if (sisa <= 0){ stopIstirahat(); buzz([90,60,90]); toast('Istirahat habis — lanjut'); }
  };
  gambar();
  timerIst = setInterval(gambar, 250);      // 250ms biar angkanya langsung bener pas balik dari layar mati
}
/* dipanggil pas sesi dibuka lagi — istirahat yang belum abis dilanjutin, bukan direset */
function pulihkanIstirahat(){
  const r = LS.get('rutin.ist', null);
  if (r && r.akhir > Date.now()) jalanIstirahat(r.akhir, r.det || 90);
  else if (r) LS.del('rutin.ist');
}
document.addEventListener('click', ev=>{ if (ev.target.closest('#istLewati')) stopIstirahat(); });

/* ---------- sheet: ganti gerakan ---------- */
function sheetGantiGerakan(slotId){
  const pilihan = pilihanGerakan(slotId);
  if (!pilihan.length) return;
  const sekarang = gerakan(slotId);
  const asli = pilihan[0];
  sheetSaveFn = null; sheetDelFn = null;
  openSheet(`<h3>Ganti gerakan</h3>
    <div class="sheetsub">Pola gerakannya sama, jadi peran slot ini di program nggak berubah</div>
    ${pilihan.map((g,i)=>{
      const aktif = g.id === sekarang.id;
      const riwayat = riwayatGerakan(g.id);
      return `<button class="item press" data-pilihgerak="${esc(slotId)}|${esc(g.id)}"
        style="width:100%;text-align:left;background:none">
        <span class="check ${aktif?'on':''}" style="flex:none">
          <svg viewBox="0 0 24 24" fill="none"><polyline points="4 12.5 9.5 18 20 6.5"/></svg></span>
        <span class="grow">
          <span class="t" style="display:block">${esc(g.n)}${i===0?' <span class="badge">bawaan</span>':''}</span>
          <span class="s">${g.set>1?g.set+' set × ':''}${esc(g.rep)}${g.int?' · '+esc(g.int):''}${g.kontak?' · '+g.kontak+' kontak':''}</span>
          ${riwayat?`<span class="xs dim" style="display:block;margin-top:3px">${riwayat}</span>`:''}
        </span>
      </button>`;
    }).join('')}
    <div class="note" style="margin-top:12px">Beban dicatat per gerakan, bukan per slot. Ganti gerakan berarti riwayat baru — yang lama tetap utuh dan balik lagi kalau lo ganti balik.</div>`);
}

/* ringkasan singkat riwayat satu gerakan, biar kelihatan mana yang pernah dipakai */
function riwayatGerakan(exId){
  const pakai = LT().sesi.filter(s => (s.ceklis||{})[exId]);
  if (!pakai.length) return '';
  const terakhir = pakai.map(s=>s.d).sort().at(-1);
  let berat = 0;
  pakai.forEach(s => (s.set?.[exId]||[]).forEach(v => { const kg = +v.kg||0; if (kg > berat) berat = kg; }));
  return `${pakai.length}× dipakai · terakhir ${tgl(terakhir)}` + (berat ? ` · terberat ${String(berat).replace('.',',')} kg` : '');
}

/* ---------- sheet: atur jadwal ---------- */
function sheetJadwalLatihan(){
  const L = LT();
  const opsi = Object.entries(PROGRAM).map(([k,p])=>({ id:k, n:p.n.split(' — ')[0] }));
  sheetSaveFn = null; sheetDelFn = null;
  openSheet(`<h3>Atur jadwal latihan</h3>
    <div class="sheetsub">Ketuk buat nyalain atau matiin sesi di hari itu</div>
    ${[1,2,3,4,5,6,0].map(w=>`
      <div style="margin-bottom:14px">
        <div class="lbl" style="margin-bottom:7px">${HARI[w]}</div>
        <div class="row" style="gap:6px;flex-wrap:wrap">
          ${opsi.map(o=>`<button class="chip ${(L.jadwal[w]||[]).includes(o.id)?'on':''}"
            data-jw="${w}" data-js="${o.id}" style="font-size:12px;padding:6px 11px">${esc(o.n)}</button>`).join('')}
        </div>
      </div>`).join('')}
    <div class="hr"></div>
    <div class="row between" style="margin-bottom:12px">
      <div class="grow"><div class="sm" style="font-weight:650">Ingetin di hari latihan</div>
        <div class="xs dim">Notifikasi berisi sesi apa hari itu</div></div>
      <button class="chip ${L.ingatLatihan?'on':''}" id="jlNotif">${L.ingatLatihan?'Nyala':'Mati'}</button>
    </div>
    ${F.time('jlJam','Jam pengingat', L.jamIngat||'06:30')}
    <div class="row" style="gap:9px;margin-top:16px">
      <button class="btn ghost" id="jlReset" style="flex:none;padding:12px 16px">Kembalikan</button>
      <button class="btn block" id="jlSimpan">Simpan</button>
    </div>`);

  $$('[data-jw]').forEach(b => b.onclick = ()=>{
    const w = b.dataset.jw, sid = b.dataset.js;
    L.jadwal[w] = L.jadwal[w] || [];
    const i = L.jadwal[w].indexOf(sid);
    if (i >= 0) L.jadwal[w].splice(i,1); else L.jadwal[w].push(sid);
    b.classList.toggle('on'); buzz(6); commit(false);
  });
  $('#jlNotif').onclick = async ()=>{
    if (!L.ingatLatihan){ const ok = await Notif.izin(); if (!ok){ toast('Izin notifikasi ditolak'); return; } }
    L.ingatLatihan = !L.ingatLatihan;
    $('#jlNotif').classList.toggle('on', L.ingatLatihan);
    $('#jlNotif').textContent = L.ingatLatihan ? 'Nyala' : 'Mati';
    commit(false);
  };
  $('#jlReset').onclick = ()=>{ L.jadwal = JSON.parse(JSON.stringify(JADWAL_BAKU)); commit(); closeSheet(); toast('Jadwal dikembalikan ke bawaan'); };
  $('#jlSimpan').onclick = ()=>{ L.jamIngat = val('jlJam') || '06:30'; commit(); Notif.apply(); closeSheet(); toast('Jadwal disimpan'); };
}

/* ---------- delegasi khusus latihan ---------- */
document.addEventListener('click', ev=>{
  const t = ev.target.closest('[data-mulai],[data-lihat],[data-riwayat],[data-exceklis],[data-excue],[data-ist],[data-rasa],[data-ganti],[data-pilihgerak],[data-isi],#sesTutup');
  if (!t) return;
  const dd = t.dataset;
  if (t.id === 'sesTutup'){ tutupSesi(); return; }
  if (dd.mulai){ bukaSesi(dd.mulai); return; }
  if (dd.lihat){ bukaSesi(dd.lihat); return; }
  if (dd.riwayat){ const s = LT().sesi.find(x=>x.id===dd.riwayat); if (s) bukaSesi(s.sid, s.d); return; }
  if (dd.exceklis && sesiAktif){ toggleCeklis(dd.exceklis); return; }
  if (dd.excue){ const c = $('#cue_'+dd.excue); c && c.classList.toggle('on'); return; }
  if (dd.ist){ mulaiIstirahat(dd.ist); buzz(8); return; }
  if (dd.ganti){ sheetGantiGerakan(dd.ganti); return; }
  if (dd.pilihgerak){
    const [slotId, pilih] = dd.pilihgerak.split('|');
    const L = LT();
    // bawaan disimpen sebagai "nggak ada pilihan", bukan sebagai id — biar kalau
    // programnya nanti diubah, slot itu ngikut yang baru, bukan nyangkut di yang lama
    if (pilih === slotId) delete L.ganti[slotId]; else L.ganti[slotId] = pilih;
    commit(false); closeSheet();
    if (sesiAktif) gambarSesi(); else render();
    toast('Diganti jadi ' + gerakan(slotId).n, 2600);
    return;
  }
  if (dd.isi && sesiAktif){
    const [exId, i, kg, rep] = dd.isi.split('|');
    const ikg = $(`[data-setkg="${exId}"][data-i="${i}"]`), irep = $(`[data-setrep="${exId}"][data-i="${i}"]`);
    if (ikg && irep){
      ikg.value = kg; irep.value = rep;
      ikg.dispatchEvent(new Event('input', {bubbles:true}));
      irep.dispatchEvent(new Event('input', {bubbles:true}));
      buzz(10);
    }
    return;
  }
  if (dd.rasa && sesiAktif){
    const s = bukaLog(sesiAktif.d, sesiAktif.sid);
    s.rasa = s.rasa === +dd.rasa ? 0 : +dd.rasa;
    $$('[data-rasa]').forEach(b => b.classList.toggle('on', +b.dataset.rasa === s.rasa));
    buzz(); commit(false); return;
  }
});
document.addEventListener('input', ev=>{
  const el = ev.target;
  if (!sesiAktif || (!el.dataset.setkg && !el.dataset.setrep)) return;
  const exId = el.dataset.setkg || el.dataset.setrep, i = +el.dataset.i;
  const s = bukaLog(sesiAktif.d, sesiAktif.sid);
  s.set = s.set || {}; s.set[exId] = s.set[exId] || [];
  while (s.set[exId].length <= i) s.set[exId].push({});
  s.set[exId][i][el.dataset.setkg ? 'kg' : 'rep'] = el.value;
  S.updatedAt = Date.now(); LS.set('rutin.state', S); Store.save();

  // Rekor baru. Diumumin sekali per gerakan per sesi — tiap ketikan manggil
  // handler ini, dan toast yang nongol tiap huruf itu bukan kabar baik lagi.
  const b = s.set[exId][i], kg = +b.kg || 0, rep = +b.rep || 0;
  if (!kg || !rep || rep > 12 || prSudah.has(exId)) return;
  const lama = rekorGerakan(exId, sesiAktif.d);
  if (!lama || epley(kg, rep) <= lama) return;
  prSudah.add(exId);
  const nama = (SLOT[exId] ? SLOT[exId].ex.n
    : (Object.values(typeof ALT !== 'undefined' ? ALT : {}).flat().find(x => x.id === exId) || {}).n) || 'Gerakan ini';
  toast(`🏆 Rekor baru ${nama} — ${kg}kg × ${rep}`, 3200);
  buzz(24);
});
</script>
