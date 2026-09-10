<script>
/* ============================================================
   RUTIN — katalog gerakan pengganti

   PROGRAM itu tetap: struktur blok, menit, dan peran tiap slot nggak berubah.
   File ini cuma nyediain PILIHAN buat ngisi slot yang sama.

   Aturan yang dipegang tiap alternatif:
   - Pola gerakannya sama. Slot dorong horizontal tetap dorong horizontal —
     kalau nggak, blok "Angkatan utama" kehilangan gunanya.
   - Punya id sendiri. Log beban dikunci ke id, jadi riwayat tiap gerakan
     kepisah. Kalau id-nya dipakai ulang, kg dumbbell nyampur sama kg barbell
     di grafik yang sama.
   - Punya cue. Ini dijaga tes: gerakan tanpa petunjuk teknik bikin build gagal.
   - Kontak lompatannya realistis. Angka itu masuk ke pengaman cedera 200/minggu,
     jadi ngarang di sini artinya ngerusak remnya.

   Bentuknya: { idSlot: [ ...gerakan pengganti ] }. Bawaan program nggak ditulis
   di sini — dia otomatis jadi pilihan pertama.
   ============================================================ */

const ALT = {

  /* ---------------- LOWER A — reaktif & kecepatan ---------------- */

  la_p1: [
    { id:'la_p1_drop', n:'Drop jump ke box', set:4, rep:'3', ist:'2,5 mnt', kontak:12,
      cue:'Turun dari box 30 cm, mendarat sebentar, langsung lompat ke box lain. Lebih aman dari depth jump biasa karena mendaratnya di ketinggian.' },
    { id:'la_p1_dj_broad', n:'Depth jump → broad jump', set:3, rep:'4', ist:'2,5 mnt', kontak:12,
      cue:'Turun dari box, mantul ke depan sejauh mungkin. Melatih arah tenaga horizontal buat langkah terakhir approach.' },
    { id:'la_p1_altitude', n:'Altitude landing (mendarat & tahan)', set:4, rep:'3', ist:'2 mnt', kontak:12,
      cue:'Turun dari box, mendarat, kunci posisi 2 detik. Nggak ada mantulnya — ini buat ngajarin badan nyerap beban sebelum dikasih beban mantul. Pakai ini kalau lutut lagi kerasa.' },
  ],
  la_p2: [
    { id:'la_p2_line', n:'Line hop cepat (bolak-balik garis)', set:3, rep:'15 detik', ist:'90 dtk', kontak:15,
      cue:'Dua kaki, lompat kecil bolak-balik lewat garis secepat mungkin. Kontaknya sependek mungkin, tinggi nggak penting.' },
    { id:'la_p2_lateral', n:'Lateral hurdle hop (5 gawang)', set:3, rep:'5 gawang', ist:'2 mnt', kontak:15,
      cue:'Menyamping. Basket banyak gerak lateral, dan arah ini sering kelewat dilatih.' },
    { id:'la_p2_sl', n:'Single-leg hurdle hop (3 gawang)', set:3, rep:'3 / kaki', ist:'2 mnt', kontak:18,
      cue:'Satu kaki, gawang direndahin. Ini yang paling mirip take-off satu kaki pas lay-up. Berat — jangan dipaksa kalau mendaratnya goyang.' },
  ],
  la_p3: [
    { id:'la_p3_triple', n:'Triple broad jump berturut', set:3, rep:'3 lompatan', ist:'2 mnt', kontak:9,
      cue:'Tiga lompat jauh nyambung tanpa berhenti. Ukur jarak totalnya, catat biar kelihatan majunya.' },
    { id:'la_p3_bound', n:'Bounding (lompat kijang)', set:3, rep:'6 langkah', ist:'2 mnt', kontak:18,
      cue:'Lompat dari kaki ke kaki, ngejar jarak per langkah bukan kecepatan. Ayunan tangan berlawanan.' },
    { id:'la_p3_sl_broad', n:'Single-leg broad jump', set:3, rep:'3 / kaki', ist:'2 mnt', kontak:12,
      cue:'Satu kaki, mendarat dua kaki. Bandingin jarak kanan-kiri — bedanya nunjukin kaki mana yang ketinggalan.' },
  ],
  la_p4: [
    { id:'la_p4_3step', n:'Approach jump 3 langkah', set:3, rep:'3', ist:'90 dtk', kontak:9,
      cue:'Ancang-ancang lebih panjang, lebih mirip transisi lari-ke-lompat pas fast break.' },
    { id:'la_p4_target', n:'Run-up vertical + sentuh target', set:3, rep:'4', ist:'90 dtk', kontak:12,
      cue:'Pasang target di ring atau tembok. Ngejar sasaran yang kelihatan bikin usahanya konsisten tiap rep.' },
    { id:'la_p4_lateral', n:'Lateral approach jump', set:3, rep:'3 / sisi', ist:'90 dtk', kontak:9,
      cue:'Ancang-ancang menyamping, lompat ke atas. Ini yang kepakai pas rebound dari posisi box out.' },
  ],
  la_m1: [
    { id:'la_m1_floor', n:'Power clean dari lantai', set:5, rep:'3', ist:'2,5 mnt', int:'70-75% 1RM', log:true,
      cue:'Rentang geraknya lebih panjang, tekniknya lebih rewel. Pakai ini kalau hang clean udah kerasa gampang.' },
    { id:'la_m1_snatch', n:'Hang power snatch', set:5, rep:'3', ist:'2,5 mnt', int:'60-65% 1RM', log:true,
      cue:'Beban lebih ringan, batang gerak lebih cepat. Bagus buat hari yang kaki lagi capek.' },
    { id:'la_m1_kb', n:'Kettlebell swing berat', set:5, rep:'8', ist:'2 mnt', log:true,
      cue:'Kalau nggak ada barbell atau teknik clean lagi berantakan. Tenaganya dari pinggul, tangan cuma gantungan.' },
  ],
  la_m2: [
    { id:'la_m2_trap', n:'Trap bar jump', set:4, rep:'3', ist:'2 mnt', int:'20-30% 1RM deadlift', kontak:12, log:true,
      cue:'Lebih aman buat punggung dari jump squat barbell, dan bebannya bisa lebih berat.' },
    { id:'la_m2_db', n:'Dumbbell jump squat', set:4, rep:'5', ist:'90 dtk', kontak:20, log:true,
      cue:'Dumbbell di samping badan. Kontaknya lebih banyak karena repnya lebih banyak — ingat jatah mingguan.' },
    { id:'la_m2_band', n:'Banded jump squat', set:4, rep:'3', ist:'2 mnt', kontak:12,
      cue:'Karet dari lantai ke bahu. Tahanannya makin berat di atas, jadi maksa lo ngedorong sampai habis.' },
  ],
  la_a1: [
    { id:'la_a1_reverse', n:'Reverse lunge dumbbell', set:3, rep:'8 / kaki', ist:'90 dtk', log:true,
      cue:'Lutut depan lebih adem dibanding split squat. Langkah mundur, dada tegak.' },
    { id:'la_a1_stepup', n:'Step-up tinggi lutut', set:3, rep:'8 / kaki', ist:'90 dtk', log:true,
      cue:'Box setinggi lutut. Dorong lewat tumit kaki atas, jangan nolak pakai kaki bawah.' },
    { id:'la_a1_walk', n:'Walking lunge berbeban', set:3, rep:'10 / kaki', ist:'90 dtk', log:true,
      cue:'Terus jalan, jangan berhenti tiap rep. Lebih capek napas, bagus buat akhir sesi.' },
  ],
  la_a2: [
    { id:'la_a2_ghr', n:'Glute-ham raise', set:3, rep:'6', ist:'2 mnt',
      cue:'Kalau ada alatnya, ini versi paling lengkap dari nordic. Pinggul tetap lurus.' },
    { id:'la_a2_razor', n:'Razor curl', set:3, rep:'6', ist:'2 mnt',
      cue:'Pinggul ditekuk dikit, jadi hamstringnya kerja di rentang yang beda dari nordic.' },
    { id:'la_a2_slider', n:'Slider / towel leg curl', set:3, rep:'8', ist:'90 dtk',
      cue:'Tidur telentang, tumit di kain licin, pinggul diangkat, tarik tumit. Nggak butuh alat sama sekali.' },
  ],
  la_a3: [
    { id:'la_a3_seated', n:'Seated calf raise', set:3, rep:'15', ist:'60 dtk', log:true,
      cue:'Lutut ditekuk, jadi yang kerja soleus — otot yang paling nentuin pas take-off lambat.' },
    { id:'la_a3_tib', n:'Tibialis raise', set:3, rep:'15', ist:'60 dtk',
      cue:'Sandar tembok, angkat ujung kaki. Ngejaga tulang kering dari nyeri gara-gara volume lompatan.' },
    { id:'la_a3_pogo', n:'Pogo calf jump', set:3, rep:'20', ist:'60 dtk', kontak:12,
      cue:'Lutut hampir lurus, mantul dari pergelangan. Kekuatan sekaligus kekakuan pegas.' },
  ],

  /* ---------------- LOWER B — kekuatan & tenaga ---------------- */

  lb_p1: [
    { id:'lb_p1_seated', n:'Seated box jump', set:4, rep:'3', ist:'2 mnt', kontak:12,
      cue:'Mulai dari duduk, jadi nggak bisa nyuri tenaga dari mantulan. Murni tenaga dari diam.' },
    { id:'lb_p1_single', n:'Single-leg box jump', set:3, rep:'4 / kaki', ist:'2 mnt', kontak:12,
      cue:'Box direndahin. Turunnya melangkah, jangan lompat.' },
    { id:'lb_p1_depth_box', n:'Depth jump ke box', set:4, rep:'3', ist:'2,5 mnt', kontak:12,
      cue:'Turun dari box rendah, mantul ke box lain. Mendarat di ketinggian bikin sendi lebih adem.' },
  ],
  lb_p2: [
    { id:'lb_p2_sl', n:'Single-leg broad jump', set:3, rep:'3 / kaki', ist:'2 mnt', kontak:12,
      cue:'Catat jarak kanan-kiri. Selisih lebih dari 10% artinya ada yang perlu dibenerin.' },
    { id:'lb_p2_lateral', n:'Lateral bound (skater)', set:3, rep:'5 / sisi', ist:'2 mnt', kontak:15,
      cue:'Lompat menyamping, mendarat satu kaki, tahan sebentar sebelum balik. Ini yang ngejaga lutut pas ganti arah.' },
    { id:'lb_p2_vertical', n:'Countermovement jump (max)', set:4, rep:'3', ist:'2 mnt', kontak:12,
      cue:'Lompat setinggi mungkin dari berdiri. Simpel, dan gampang diukur majunya.' },
  ],
  lb_m1: [
    { id:'lb_m1_front', n:'Front squat', set:5, rep:'3', ist:'3 mnt', int:'80-85% 1RM', log:true,
      cue:'Badan lebih tegak, quad lebih kena, punggung bawah lebih adem. Siku tinggi terus.' },
    { id:'lb_m1_safety', n:'Safety bar squat', set:5, rep:'4', ist:'3 mnt', int:'80% 1RM', log:true,
      cue:'Kalau bahu lagi nggak enak buat nahan barbell. Bebannya condong ke depan, jadi punggung atas harus kenceng.' },
    { id:'lb_m1_pause', n:'Pause squat (tahan 2 detik)', set:5, rep:'3', ist:'3 mnt', int:'75-80% 1RM', log:true,
      cue:'Berhenti 2 detik di bawah, terus meledak ke atas. Ngilangin mantulan, jadi yang kelatih tenaga dari posisi mati.' },
  ],
  lb_m2: [
    { id:'lb_m2_conv', n:'Conventional deadlift', set:4, rep:'4', ist:'2,5 mnt', int:'80% 1RM', log:true,
      cue:'Batang nempel tulang kering. Punggung netral dari awal sampai akhir.' },
    { id:'lb_m2_deficit', n:'Deficit deadlift (berdiri di plate)', set:4, rep:'4', ist:'2,5 mnt', int:'70-75% 1RM', log:true,
      cue:'Rentang lebih panjang, tarikan awal lebih berat. Bagus kalau start lo yang lemah.' },
    { id:'lb_m2_rack', n:'Rack pull (dari bawah lutut)', set:4, rep:'5', ist:'2,5 mnt', int:'85-90% 1RM', log:true,
      cue:'Rentang lebih pendek, beban lebih berat. Buat ngelatih kuncian pinggul.' },
  ],
  lb_a1: [
    { id:'lb_a1_single', n:'Single-leg hip thrust', set:3, rep:'10 / kaki', ist:'90 dtk', log:true,
      cue:'Tanpa beban pun berat. Bagus buat nutup selisih kanan-kiri.' },
    { id:'lb_a1_bridge', n:'Barbell glute bridge', set:3, rep:'10', ist:'90 dtk', log:true,
      cue:'Di lantai, rentangnya lebih pendek dari hip thrust. Cocok kalau nggak ada bangku.' },
    { id:'lb_a1_back_ext', n:'Back extension berbeban', set:3, rep:'12', ist:'90 dtk', log:true,
      cue:'Pantat dan hamstring yang ngangkat, bukan punggung bawah yang melengkung.' },
  ],
  lb_a2: [
    { id:'lb_a2_sl_rdl', n:'Single-leg RDL', set:3, rep:'8 / kaki', ist:'90 dtk', log:true,
      cue:'Keseimbangan ikut kelatih. Pinggul tetap sejajar, jangan kebuka ke samping.' },
    { id:'lb_a2_gm', n:'Good morning', set:3, rep:'10', ist:'90 dtk', log:true,
      cue:'Beban jauh lebih ringan dari RDL. Pinggul mundur, lutut lembut.' },
    { id:'lb_a2_hyper', n:'45° hyperextension', set:3, rep:'12', ist:'90 dtk', log:true,
      cue:'Nggak butuh genggaman, jadi hamstringnya bisa dipush tanpa dibatasi tangan.' },
  ],
  lb_a3: [
    { id:'lb_a3_donkey', n:'Donkey calf raise', set:4, rep:'12', ist:'60 dtk', log:true,
      cue:'Pinggul tertekuk, betisnya keregang lebih dalam.' },
    { id:'lb_a3_sl', n:'Standing calf raise satu kaki', set:3, rep:'12 / kaki', ist:'60 dtk', log:true,
      cue:'Satu kaki bikin selisih kanan-kiri ketahuan.' },
    { id:'lb_a3_jump_rope', n:'Lompat tali kaku (stiff ankle)', set:4, rep:'40 lompatan', ist:'60 dtk', kontak:16,
      cue:'Lutut hampir nggak nekuk. Melatih pegas pergelangan sekaligus daya tahan betis.' },
  ],

  /* ---------------- PUSH ---------------- */

  pu_m1: [
    { id:'pu_m1_db', n:'Dumbbell bench press', set:4, rep:'6', ist:'2,5 mnt', log:true,
      cue:'Rentang lebih dalam, bahu lebih bebas. Bagus kalau bench barbell bikin bahu nyeri.' },
    { id:'pu_m1_incline_bb', n:'Incline barbell press', set:4, rep:'5', ist:'3 mnt', int:'75-80% 1RM', log:true,
      cue:'Sudut 30 derajat. Lebih kena dada atas dan bahu depan — kepakai buat tembakan jauh.' },
    { id:'pu_m1_floor', n:'Floor press', set:4, rep:'5', ist:'2,5 mnt', log:true,
      cue:'Siku nyentuh lantai, rentangnya dibatasi. Aman buat bahu, fokus ke kuncian trisep.' },
  ],
  pu_m2: [
    { id:'pu_m2_push_press', n:'Push press', set:4, rep:'5', ist:'2,5 mnt', int:'80% 1RM press', log:true,
      cue:'Dorongan awal dari kaki. Bebannya bisa lebih berat dari strict press.' },
    { id:'pu_m2_db_ohp', n:'Dumbbell overhead press', set:4, rep:'8', ist:'2 mnt', log:true,
      cue:'Tiap tangan kerja sendiri. Lebih ramah buat bahu yang mobilitasnya terbatas.' },
    { id:'pu_m2_landmine', n:'Landmine press', set:4, rep:'8 / tangan', ist:'2 mnt', log:true,
      cue:'Sudutnya miring, jadi bahu nggak perlu buka penuh. Pilihan aman kalau bahu lagi bermasalah.' },
  ],
  pu_a1: [
    { id:'pu_a1_incline_bb', n:'Incline barbell press', set:3, rep:'8', ist:'90 dtk', log:true,
      cue:'Sudut 30 derajat, batang turun ke tulang selangka. Beban lebih berat dari versi dumbbell.' },
    { id:'pu_a1_machine', n:'Incline chest press mesin', set:3, rep:'10', ist:'90 dtk', log:true,
      cue:'Nggak butuh penjaga, aman buat dipush sampai mentok.' },
    { id:'pu_a1_deficit_pu', n:'Deficit push-up', set:3, rep:'12', ist:'75 dtk',
      cue:'Tangan di atas dua buku atau paralel bar biar dada turun lebih dalam. Tanpa alat.' },
  ],
  pu_a2: [
    { id:'pu_a2_cgbp', n:'Close-grip bench press', set:3, rep:'8', ist:'90 dtk', log:true,
      cue:'Genggaman selebar bahu, siku dirapetin. Trisep yang kerja, bahu lebih adem dari dip.' },
    { id:'pu_a2_jm', n:'JM press', set:3, rep:'10', ist:'90 dtk', log:true,
      cue:'Campuran bench sama skull crusher. Berat di kuncian, persis yang dibutuhin buat dorong.' },
    { id:'pu_a2_dip_asisten', n:'Dip dengan bantuan karet', set:3, rep:'10', ist:'90 dtk',
      cue:'Kalau dip berbeban masih terlalu berat. Turun sampai lengan atas sejajar lantai, jangan lebih.' },
  ],
  pu_a3: [
    { id:'pu_a3_cable', n:'Cable lateral raise', set:3, rep:'15', ist:'60 dtk', log:true,
      cue:'Tahanannya rata dari bawah sampai atas, beda dari dumbbell yang enteng di bawah.' },
    { id:'pu_a3_upright', n:'Upright row tali', set:3, rep:'12', ist:'60 dtk', log:true,
      cue:'Pakai tali, siku nggak lebih tinggi dari bahu. Kalau kerasa nyeri, ganti.' },
    { id:'pu_a3_lean', n:'Leaning lateral raise', set:3, rep:'12 / tangan', ist:'60 dtk', log:true,
      cue:'Pegangan tiang, badan miring. Bahu samping kena dari rentang paling bawah.' },
  ],
  pu_a4: [
    { id:'pu_a4_skull', n:'Skull crusher EZ bar', set:3, rep:'10', ist:'75 dtk', log:true,
      cue:'Siku diam di tempat, cuma lengan bawah yang gerak. Turun ke atas dahi.' },
    { id:'pu_a4_overhead', n:'Overhead triceps extension', set:3, rep:'12', ist:'75 dtk', log:true,
      cue:'Kepala panjang trisep cuma kena kalau lengan di atas kepala. Rentang penuh.' },
    { id:'pu_a4_dbdip', n:'Bench dip', set:3, rep:'15', ist:'60 dtk',
      cue:'Tanpa alat. Kalau kegampangan, taruh beban di paha.' },
  ],
  pu_a5: [
    { id:'pu_a5_deadbug', n:'Dead bug', set:3, rep:'10 / sisi', ist:'45 dtk',
      cue:'Punggung bawah nempel lantai terus. Kalau melengkung, rentangnya dikurangin.' },
    { id:'pu_a5_plank', n:'Plank tangan-lutut (bird dog)', set:3, rep:'10 / sisi', ist:'45 dtk',
      cue:'Pinggul jangan miring. Ini latihan anti-puntir, bukan latihan panjang-panjangan waktu.' },
    { id:'pu_a5_suitcase', n:'Suitcase carry', set:3, rep:'30 meter / sisi', ist:'60 dtk', log:true,
      cue:'Beban satu tangan, badan tetap tegak lurus. Perut samping yang nahan.' },
  ],

  /* ---------------- PULL ---------------- */

  pl_m1: [
    { id:'pl_m1_neutral', n:'Pull-up genggaman netral berbeban', set:4, rep:'6', ist:'2,5 mnt', log:true,
      cue:'Telapak saling hadap. Siku lebih adem dari genggaman lurus.' },
    { id:'pl_m1_lat_heavy', n:'Lat pulldown berat', set:4, rep:'6', ist:'2,5 mnt', log:true,
      cue:'Kalau pull-up berbeban belum kuat. Bebannya bisa diatur persis.' },
    { id:'pl_m1_negative', n:'Pull-up negatif (turun 5 detik)', set:4, rep:'5', ist:'2,5 mnt',
      cue:'Lompat ke atas, turun selambat mungkin. Ini cara paling cepat nambah pull-up.' },
  ],
  pl_m2: [
    { id:'pl_m2_pendlay', n:'Pendlay row', set:4, rep:'5', ist:'2,5 mnt', log:true,
      cue:'Batang berhenti di lantai tiap rep. Nggak ada mantulan, punggung atas yang kerja.' },
    { id:'pl_m2_tbar', n:'T-bar row', set:4, rep:'8', ist:'2 mnt', log:true,
      cue:'Punggung lebih ketopang. Cocok kalau punggung bawah masih capek dari hari lower.' },
    { id:'pl_m2_db_row', n:'Single-arm dumbbell row', set:4, rep:'8 / tangan', ist:'2 mnt', log:true,
      cue:'Rentang paling panjang di antara semua row. Tarik ke pinggul, jangan ke dada.' },
  ],
  pl_a1: [
    { id:'pl_a1_seal', n:'Seal row', set:3, rep:'10', ist:'90 dtk', log:true,
      cue:'Tengkurap di bangku, badan nggak bisa nyuri tenaga sama sekali.' },
    { id:'pl_a1_inverted', n:'Inverted row', set:3, rep:'12', ist:'75 dtk',
      cue:'Badan lurus kayak papan. Makin datar makin berat. Tanpa beban.' },
    { id:'pl_a1_meadows', n:'Meadows row', set:3, rep:'10 / tangan', ist:'90 dtk', log:true,
      cue:'Landmine, berdiri menyamping. Kena lat bagian bawah yang biasanya kelewat.' },
  ],
  pl_a2: [
    { id:'pl_a2_close', n:'Lat pulldown genggaman sempit', set:3, rep:'12', ist:'75 dtk', log:true,
      cue:'Rentangnya lebih panjang dari genggaman lebar, bisep ikut lebih banyak.' },
    { id:'pl_a2_straight', n:'Straight-arm pulldown', set:3, rep:'15', ist:'60 dtk', log:true,
      cue:'Siku dikunci lurus. Murni lat, bisep nggak ikut sama sekali.' },
    { id:'pl_a2_pullover', n:'Dumbbell pullover', set:3, rep:'12', ist:'75 dtk', log:true,
      cue:'Ngeregang lat sampai penuh di atas kepala. Tulang rusuk jangan naik.' },
  ],
  pl_a3: [
    { id:'pl_a3_reverse', n:'Reverse fly', set:3, rep:'15', ist:'60 dtk', log:true,
      cue:'Bahu belakang. Siku sedikit nekuk dan diam, tulang belikat yang gerak.' },
    { id:'pl_a3_band', n:'Band pull-apart pelan', set:3, rep:'20', ist:'45 dtk',
      cue:'Tahan 1 detik pas paling terbuka. Murah dan efektif buat postur.' },
    { id:'pl_a3_ytw', n:'Y-T-W di bangku miring', set:3, rep:'8 tiap huruf', ist:'60 dtk',
      cue:'Beban ringan banget. Ini buat otot penstabil belikat, bukan buat diberatin.' },
  ],
  pl_a4: [
    { id:'pl_a4_hammer', n:'Hammer curl', set:3, rep:'12', ist:'60 dtk', log:true,
      cue:'Telapak saling hadap. Kena brachialis, bikin lengan lebih tebal.' },
    { id:'pl_a4_incline', n:'Incline dumbbell curl', set:3, rep:'10', ist:'75 dtk', log:true,
      cue:'Bangku miring, lengan di belakang badan. Bisep keregang penuh sebelum ditarik.' },
    { id:'pl_a4_chin', n:'Chin-up genggaman sempit', set:3, rep:'8', ist:'90 dtk',
      cue:'Kalau mau bisep sekaligus punggung. Tanpa alat tambahan.' },
  ],
  pl_a5: [
    { id:'pl_a5_deadhang', n:'Dead hang berbeban', set:3, rep:'30 detik', ist:'75 dtk', log:true,
      cue:'Genggaman sekaligus regangan bahu. Bahu jangan dibiarin naik ke telinga.' },
    { id:'pl_a5_plate', n:'Plate pinch carry', set:3, rep:'30 meter', ist:'60 dtk', log:true,
      cue:'Jepit dua plate pakai jari. Kekuatan jepit ini kepakai buat nahan bola satu tangan.' },
    { id:'pl_a5_trap', n:'Trap bar carry', set:3, rep:'50 meter', ist:'90 dtk', log:true,
      cue:'Lebih berat dari farmer carry biasa. Langkah pendek dan cepat.' },
  ],

  /* ---------------- UPPER ---------------- */

  up_m1: [
    { id:'up_m1_flat', n:'Flat bench press', set:4, rep:'6', ist:'2,5 mnt', log:true,
      cue:'Kalau mau tekanan lebih ke dada tengah. Tulang belikat ditarik ke belakang.' },
    { id:'up_m1_db_incline', n:'Incline dumbbell press', set:4, rep:'8', ist:'2 mnt', log:true,
      cue:'Rentang lebih dalam, dan tiap tangan kerja sendiri.' },
    { id:'up_m1_weighted_pu', n:'Push-up berbeban (plate di punggung)', set:4, rep:'10', ist:'2 mnt',
      cue:'Kalau nggak ada bangku. Badan lurus dari kepala sampai tumit.' },
  ],
  up_m2: [
    { id:'up_m2_pullup', n:'Pull-up berbeban', set:4, rep:'6', ist:'2,5 mnt', log:true,
      cue:'Genggaman lurus, lebih kena punggung atas dibanding chin-up.' },
    { id:'up_m2_row_heavy', n:'Barbell row berat', set:4, rep:'6', ist:'2,5 mnt', log:true,
      cue:'Tarikan horizontal, buat nyeimbangin dorongan di sesi ini.' },
    { id:'up_m2_lat', n:'Lat pulldown berat', set:4, rep:'8', ist:'2 mnt', log:true,
      cue:'Kalau palang lagi kepakai atau bahu lagi capek.' },
  ],
  up_a1: [
    { id:'up_a1_arnold', n:'Arnold press', set:3, rep:'10', ist:'75 dtk', log:true,
      cue:'Muter dari telapak hadap badan ke hadap depan. Bahu depan sama samping kena sekaligus.' },
    { id:'up_a1_machine', n:'Shoulder press mesin', set:3, rep:'12', ist:'75 dtk', log:true,
      cue:'Nggak perlu jaga keseimbangan, jadi bisa dipush lebih dalam.' },
    { id:'up_a1_pike', n:'Pike push-up', set:3, rep:'12', ist:'75 dtk',
      cue:'Pinggul tinggi, kepala turun ke antara tangan. Versi tanpa alat.' },
  ],
  up_a2: [
    { id:'up_a2_chest_row', n:'Chest-supported row', set:3, rep:'12', ist:'75 dtk', log:true,
      cue:'Dada nempel bantalan. Punggung bawah bener-bener istirahat.' },
    { id:'up_a2_seal', n:'Seal row', set:3, rep:'12', ist:'75 dtk', log:true,
      cue:'Tengkurap di bangku tinggi. Nggak ada cara buat curang.' },
    { id:'up_a2_inverted', n:'Inverted row kaki tinggi', set:3, rep:'12', ist:'75 dtk',
      cue:'Kaki di box biar lebih berat. Tanpa beban tambahan.' },
  ],
  up_a3: [
    { id:'up_a3_cable', n:'Cable lateral raise', set:3, rep:'15', ist:'60 dtk', log:true,
      cue:'Tahanan rata sepanjang gerakan.' },
    { id:'up_a3_partial', n:'Lateral raise parsial (di atas bahu)', set:3, rep:'20', ist:'60 dtk', log:true,
      cue:'Cuma separuh rentang atas, repnya banyak. Bakar terakhir di akhir sesi.' },
    { id:'up_a3_plate', n:'Plate front raise', set:3, rep:'12', ist:'60 dtk', log:true,
      cue:'Bahu depan. Jangan pakai ayunan badan.' },
  ],
  up_a4: [
    { id:'up_a4_reverse', n:'Reverse pec deck', set:3, rep:'15', ist:'60 dtk', log:true,
      cue:'Bahu belakang terisolasi penuh. Bagus buat nyeimbangin volume dorong.' },
    { id:'up_a4_band', n:'Band pull-apart', set:3, rep:'20', ist:'45 dtk',
      cue:'Bisa dikerjain di antara set lain kalau waktunya mepet.' },
    { id:'up_a4_prone', n:'Prone Y raise', set:3, rep:'12', ist:'60 dtk',
      cue:'Tengkurap, angkat tangan bentuk Y. Trapezius bawah, bagian yang paling sering ketinggalan.' },
  ],
  up_a5: [
    { id:'up_a5_knee', n:'Hanging knee raise', set:3, rep:'15', ist:'60 dtk',
      cue:'Versi lebih ringan dari leg raise. Jangan pakai ayunan.' },
    { id:'up_a5_ab_wheel', n:'Ab wheel rollout', set:3, rep:'10', ist:'75 dtk',
      cue:'Punggung bawah jangan melengkung. Berhenti sebelum bentuknya rusak.' },
    { id:'up_a5_cable', n:'Cable crunch', set:3, rep:'15', ist:'60 dtk', log:true,
      cue:'Bisa diberatin bertahap, beda dari latihan perut tanpa beban.' },
  ],

  /* ---------------- BASKET A — handling & shooting ---------------- */

  ba_h1: [
    { id:'ba_h1_stationary', n:'2 bola: stationary combo (6 variasi)', set:2, rep:'30 dtk tiap variasi', ist:'45 dtk',
      cue:'Pound, high-low, crossover, in-out, behind, between. Mata ke depan terus.' },
    { id:'ba_h1_walking', n:'2 bola sambil jalan maju-mundur', set:3, rep:'1 lintasan', ist:'45 dtk',
      cue:'Susah karena badan gerak sambil tangan kerja beda-beda. Bola jangan sampai lepas.' },
  ],
  ba_h2: [
    { id:'ba_h2_full', n:'Full-court zig-zag, 1 gerakan tiap cone', set:3, rep:'1 lintasan', ist:'60 dtk',
      cue:'Lebih jauh, jadi kelelahannya ikut kelatih. Badan tetap rendah di tiap cone.' },
    { id:'ba_h2_chair', n:'Chair series: crossover, between, behind', set:4, rep:'3 putaran', ist:'45 dtk',
      cue:'Kursi jadi patokan bek. Ganti kecepatan sebelum dan sesudah gerakan.' },
  ],
  ba_h3: [
    { id:'ba_h3_low', n:'Low dribble di bawah lutut', set:3, rep:'45 detik', ist:'45 dtk',
      cue:'Makin rendah makin susah direbut. Pergelangan yang kerja, bukan lengan.' },
    { id:'ba_h3_wall', n:'Wall dribble (mantul ke tembok)', set:3, rep:'45 detik', ist:'45 dtk',
      cue:'Melatih jari dan pergelangan. Nggak butuh lapangan.' },
  ],
  ba_h4: [
    { id:'ba_h4_partner', n:'Reaksi tunjuk arah dari teman', set:3, rep:'45 detik', ist:'45 dtk',
      cue:'Kepala harus ngangkat. Kalau nggak ada teman, pakai video di HP.' },
    { id:'ba_h4_numbers', n:'Dribble + baca angka di dinding', set:3, rep:'45 detik', ist:'45 dtk',
      cue:'Tulis angka acak di kertas, baca sambil dribble. Maksa mata lepas dari bola.' },
  ],
  ba_h5: [
    { id:'ba_h5_stepback', n:'Tight window pick-up → step-back', set:1, rep:'8 rep', ist:'—',
      cue:'Ambil bola dari ruang sempit, mundur, tembak. Kaki mendarat rapi dulu sebelum lepas bola.' },
    { id:'ba_h5_snatch', n:'Snatch-back → burst', set:1, rep:'10 rep', ist:'—',
      cue:'Tarik bola mundur keras, langsung serang lagi. Ganti kecepatannya harus ekstrem.' },
  ],
  ba_s1: [
    { id:'ba_s1_corner', n:'Corner-to-corner spot up', set:1, rep:'5 masuk tiap sudut', ist:'—',
      cue:'Lari dari sudut ke sudut lewat baseline. Kaki siap sebelum bola datang.' },
    { id:'ba_s1_five', n:'5 spot × 2 putaran', set:1, rep:'5 masuk tiap spot', ist:'—',
      cue:'Sudut, wing, top, wing, sudut. Rutin yang konsisten bikin angkanya bisa dibandingin antar minggu.' },
  ],
  ba_s2: [
    { id:'ba_s2_partner', n:'Catch & shoot dari umpan teman', set:1, rep:'7 masuk × 5 spot', ist:'—',
      cue:'Umpan dari orang lain waktunya beda dari umpan sendiri. Lebih mirip pertandingan.' },
    { id:'ba_s2_relocate', n:'Catch & shoot + relokasi setelah tembak', set:1, rep:'5 masuk tiap spot', ist:'—',
      cue:'Langsung pindah begitu bola lepas. Ngelatih kebiasaan nggak berdiri diam.' },
  ],
  ba_s3: [
    { id:'ba_s3_sidestep', n:'1-dribble side-step jumper', set:1, rep:'5 masuk tiap sisi', ist:'—',
      cue:'Satu dribble menyamping buat bikin ruang. Bahu tetap ngadep ring.' },
    { id:'ba_s3_stepback', n:'1-dribble step-back', set:1, rep:'5 masuk tiap sisi', ist:'—',
      cue:'Mundur harus jauh dan seimbang. Kalau mendarat goyang, jaraknya kurangin.' },
  ],
  ba_s4: [
    { id:'ba_s4_transition', n:'Rebound → sprint → transisi 3', set:1, rep:'10 masuk', ist:'—', kontak:10,
      cue:'Ambil rebound sendiri, sprint ke ujung lain, tembak. Napas ngos-ngosan itu bagian dari latihannya.' },
    { id:'ba_s4_cut', n:'Sprint cut → catch & shoot', set:1, rep:'10 masuk', ist:'—', kontak:10,
      cue:'Sprint dari baseline ke wing, terima bola, langsung lepas. Kaki berhenti sebelum tangan.' },
  ],
  ba_s5: [
    { id:'ba_s5_beat', n:'Beat the pro (sampai 11)', set:1, rep:'1 sesi', ist:'—',
      cue:'Masuk +1, meleset −2. Tekanan angkanya bikin tiap tembakan berasa penting.' },
    { id:'ba_s5_five_spot', n:'Make 3 berturut di 5 spot', set:1, rep:'3 berturut tiap spot', ist:'—',
      cue:'Nggak boleh pindah sebelum 3 masuk beruntun. Konsistensi, bukan jumlah.' },
  ],

  /* ---------------- BASKET B — finishing & kombinasi ---------------- */

  bb_f1: [
    { id:'bb_f1_reverse', n:'Reverse Mikan + wrong-foot', set:2, rep:'10 tiap versi', ist:'45 dtk',
      cue:'Versi kaki salah itu yang paling sering kepakai pas ditutup bek.' },
    { id:'bb_f1_backboard', n:'Mikan + papan dari sudut 45°', set:2, rep:'10 tiap sisi', ist:'45 dtk',
      cue:'Titik papan yang sama tiap kali. Sentuhannya harus lembut.' },
  ],
  bb_f2: [
    { id:'bb_f2_eurostep', n:'Euro step dari kedua sisi', set:1, rep:'10 tiap sisi', ist:'—',
      cue:'Langkah pertama lebar dan melebar, kedua ngelewatin. Bola dijaga jauh dari bek.' },
    { id:'bb_f2_hop', n:'Hop step → finish dua kaki', set:1, rep:'10 tiap sisi', ist:'—',
      cue:'Mendarat dua kaki bareng, bisa lepas ke dua arah. Bagus buat lawan yang lebih tinggi.' },
  ],
  bb_f3: [
    { id:'bb_f3_pad', n:'Finishing lawan pad + putar badan', set:1, rep:'10 tiap sisi', ist:'—',
      cue:'Bahu masuk duluan, bola diangkat setelah kontak.' },
    { id:'bb_f3_offhand', n:'Finishing tangan lemah lawan kontak', set:1, rep:'12 tiap sisi', ist:'—',
      cue:'Tangan yang nggak biasa. Awalnya bakal jelek — itu justru alasan ngelatihnya.' },
  ],
  bb_f4: [
    { id:'bb_f4_push', n:'Push shot dari 3-5 meter', set:1, rep:'10 tiap sisi', ist:'—',
      cue:'Satu tangan, lepas dari titik tertinggi. Buat lawan bek jangkung.' },
    { id:'bb_f4_hook', n:'Baby hook kanan & kiri', set:1, rep:'10 tiap sisi', ist:'—',
      cue:'Badan jadi tameng. Tembakan yang hampir nggak bisa diblok.' },
  ],
  bb_f5: [
    { id:'bb_f5_mikan_timed', n:'Timed Mikan (30 detik, hitung masuk)', set:4, rep:'30 detik', ist:'45 dtk',
      cue:'Catat jumlah masuknya, kejar naik tiap minggu.' },
    { id:'bb_f5_plusminus', n:'Timed finishing bolak-balik + hitung', set:4, rep:'30 detik', ist:'45 dtk',
      cue:'Bolak-balik dua sisi ring. Kelelahan bikin sentuhannya diuji.' },
  ],
  bb_k1: [
    { id:'bb_k1_hesi_drive', n:'Hesitation → drive → finish', set:1, rep:'5 masuk tiap sisi', ist:'—',
      cue:'Hesitasi cuma jalan kalau beneran kelihatan mau nembak.' },
    { id:'bb_k1_inout', n:'In-and-out → pull-up', set:1, rep:'5 masuk tiap sisi', ist:'—',
      cue:'Bola nggak nyeberang badan. Bahu yang jual gerakannya.' },
  ],
  bb_k2: [
    { id:'bb_k2_behind', n:'Behind-the-back → step-back', set:1, rep:'5 masuk tiap sisi', ist:'—',
      cue:'Lindungin bola pas muter. Mundurnya harus dapat jarak.' },
    { id:'bb_k2_spin', n:'Spin → fade', set:1, rep:'5 masuk tiap sisi', ist:'—',
      cue:'Muter rapat, mata langsung nyari ring begitu selesai muter.' },
  ],
  bb_k3: [
    { id:'bb_k3_double', n:'Double crossover → pull-up', set:1, rep:'5 masuk tiap sisi', ist:'—',
      cue:'Dua kali silang cepat, baru meledak. Badan tetap rendah.' },
    { id:'bb_k3_cross_stepback', n:'Crossover → step-back 3', set:1, rep:'5 masuk tiap sisi', ist:'—',
      cue:'Silang buat majuin bek, mundur buat bikin ruang. Kaki mendarat sejajar.' },
  ],
  bb_k4: [
    { id:'bb_k4_read', n:'2-dribble baca kursi (in / out)', set:1, rep:'10 rep', ist:'—',
      cue:'Kursi digeser acak. Latihannya bukan gerakannya, tapi mutusinnya.' },
    { id:'bb_k4_partner', n:'2-dribble lawan bek pasif', set:1, rep:'10 rep', ist:'—',
      cue:'Bek nggak boleh nyerang, cuma nutup satu arah. Lo yang baca.' },
  ],
  bb_k5: [
    { id:'bb_k5_pump', n:'Shot fake → 1 dribble → pull-up', set:1, rep:'8 rep', ist:'—',
      cue:'Tipuannya harus setinggi tembakan asli, kaki tetap nempel lantai.' },
    { id:'bb_k5_rip', n:'Rip through → attack', set:1, rep:'8 rep', ist:'—',
      cue:'Bola dibawa lewat bawah, jangan lewat atas — kena tangan bek itu bukan foul.' },
  ],

  /* ---------------- BASKET C — volume tembakan ---------------- */

  bc_s1: [
    { id:'bc_s1_seven', n:'7 spot × 2 putaran — catch & shoot', set:2, rep:'8 masuk tiap spot', ist:'—',
      cue:'Nambah dua sudut baseline. Sudut itu tembakan bernilai tinggi di pertandingan.' },
    { id:'bc_s1_around', n:'Around the world (harus masuk buat pindah)', set:1, rep:'1 putaran penuh', ist:'—',
      cue:'Nggak boleh pindah sebelum masuk. Kalau macet lama, mundur satu spot.' },
  ],
  bc_s2: [
    { id:'bc_s2_two', n:'2-dribble pull-up kanan & kiri', set:2, rep:'8 masuk tiap sisi', ist:'—',
      cue:'Dua dribble ngasih ruang lebih, tapi waktunya jadi lebih susah. Ritmenya sama tiap rep.' },
    { id:'bc_s2_attack', n:'Attack closeout → 1 dribble pull-up', set:2, rep:'8 masuk tiap sisi', ist:'—',
      cue:'Mulai dari pura-pura ada bek nutup. Serang bahu dia, bukan badannya.' },
  ],
  bc_s3: [
    { id:'bc_s3_screen', n:'Curl & fade dari screen bayangan', set:1, rep:'8 masuk tiap variasi', ist:'—',
      cue:'Kursi jadi screen. Baca bek dulu, baru pilih curl atau fade.' },
    { id:'bc_s3_relocate', n:'Relokasi 3 langkah setelah umpan', set:1, rep:'8 masuk tiap sisi', ist:'—',
      cue:'Umpan, langsung pindah, terima lagi, tembak. Kebiasaan yang bikin lo gampang dicari.' },
  ],
};
</script>
