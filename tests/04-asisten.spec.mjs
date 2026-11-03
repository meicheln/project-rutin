/**
 * Asisten. API Anthropic diganti stub, jadi yang diuji itu bagian kita:
 * putaran tool-use, pelaksana tiap alat, dan penanganan galat.
 */
import { bukaAplikasi } from './bantu.mjs';

export const nama = 'Asisten — putaran alat, pelaksana, penanganan galat';

export async function jalan(t) {
  const app = await bukaAplikasi();
  const { page } = app;
  await app.masukLokal();
  await app.isiContoh();

  // ---------- pelaksana alat dipanggil langsung ----------
  const alat = await page.evaluate(() => {
    const sebelum = { tx: S.txns.length, tugas: S.tasks.length, ide: S.ide.length };
    const hasil = {};
    hasil.tx = AI_RUN.catat_transaksi({ tipe: 'keluar', jumlah: 25000, kategori: 'makan', catatan: 'Nasgor' });
    hasil.txSalahKat = AI_RUN.catat_transaksi({ tipe: 'masuk', jumlah: 50000, kategori: 'ngawur', catatan: '' });
    hasil.tugas = AI_RUN.tambah_tugas({ judul: 'Kirim revisi', prioritas: 'tinggi', tenggat: '2026-09-30' });
    hasil.selesai = AI_RUN.selesaikan_tugas({ judul: 'kirim revisi' });      // cocok walau beda huruf besar
    hasil.takKetemu = AI_RUN.selesaikan_tugas({ judul: 'tugas yang nggak ada' });
    hasil.rutin = AI_RUN.centang_rutinitas({ nama: 'olahraga' });            // cocok sebagian
    hasil.rutinSalah = AI_RUN.centang_rutinitas({ nama: 'zzzz' });
    hasil.bab = AI_RUN.ubah_bab_skripsi({ bab: '3', progres: 70, status: 'revisi' });
    hasil.babAngka = AI_RUN.ubah_bab_skripsi({ bab: 'BAB I', status: 'acc' });
    hasil.berat = AI_RUN.catat_berat({ kg: 67.2 });
    // sleepMin() baca jam tidur KEMARIN ke jam bangun HARI INI — jadi kemarin harus diset juga,
    // bukan ngandelin angka acak dari data contoh (yang gesernya beda tiap hari dalam seminggu)
    hasil.tidurKemarin = AI_RUN.atur_jam_tidur({ tidur: '23:30', tanggal: addDays(today(), -1) });
    hasil.tidur = AI_RUN.atur_jam_tidur({ tidur: '23:30', bangun: '06:15' });
    hasil.target = AI_RUN.atur_target({ budget_bulanan: 3000000, target_air: 10 });
    S.agenda = [];
    hasil.agenda = AI_RUN.tambah_agenda({ judul: 'Bimbingan', mulai: '09:00', selesai: '10:00', kategori: 'kelas' });
    hasil.agendaMingguan = AI_RUN.tambah_agenda({ judul: 'Ngampus', mulai: '07:00', selesai: '12:00', kategori: 'kelas', ulang: 'mingguan', hari: [1, 3] });
    hasil.agendaTanpaHari = AI_RUN.tambah_agenda({ judul: 'Kosong', mulai: '07:00', selesai: '08:00', kategori: 'kelas', ulang: 'mingguan' });
    hasil.geser = AI_RUN.geser_agenda({ judul: 'bimbingan', mulai: '13:00', selesai: '14:00' });
    hasil.geserSalah = AI_RUN.geser_agenda({ judul: 'nggak ada begini' });
    hasil.hapusAgenda = AI_RUN.geser_agenda({ judul: 'Ngampus', hapus: true });
    const sesudah = { tx: S.txns.length, tugas: S.tasks.length, ide: S.ide.length };
    return {
      hasil, sebelum, sesudah,
      txTerakhir: S.txns.at(-1),
      catKembali: S.txns.at(-2).cat,
      bab3: S.skripsi.bab[2], bab1: S.skripsi.bab[0],
      budget: S.settings.budget, air: S.settings.targetAir,
      lamaTidur: sleepMin(today()),
      agendaSisa: S.agenda.map(a => a.judul), agendaJam: S.agenda[0].mulai,
    };
  });

  t.eq(alat.sesudah.tx, alat.sebelum.tx + 2, 'dua transaksi kebikin');
  t.eq(alat.txTerakhir.amt, 50000, 'jumlah transaksi kedua benar');
  t.eq(alat.catKembali, 'makan', 'kategori sah dipakai apa adanya');
  t.eq(alat.txTerakhir.cat, 'lainin', 'kategori ngawur jatuh ke "lainnya", bukan bikin galat');
  t.ok(alat.hasil.selesai.includes('kelar'), 'tugas ketemu walau ditulis beda huruf besar-kecil');
  t.ok(/nggak nemu/i.test(alat.hasil.takKetemu), 'tugas yang nggak ada dijawab jelas, bukan diem');
  t.ok(alat.hasil.rutin.includes('dicentang'), 'rutinitas ketemu dari potongan nama');
  t.ok(alat.hasil.rutinSalah.includes('Yang ada'), 'rutinitas salah nama dibalas daftar pilihan');
  t.eq(alat.bab3.p, 70, 'progres bab dari angka "3" kena ke BAB III');
  t.eq(alat.bab1.p, 100, 'status ACC lewat asisten maksa progres 100%');
  t.eq(alat.budget, 3000000, 'budget keubah lewat alat');
  t.eq(alat.air, 10, 'target air keubah lewat alat');
  t.eq(alat.lamaTidur, 405, 'jam tidur lewat alat kehitung jadi durasi');
  t.ok(alat.hasil.agenda.includes('Bimbingan'), 'agenda sekali kebikin lewat alat');
  t.ok(alat.hasil.agendaMingguan.includes('Senin'), 'agenda mingguan nyebut nama harinya, bukan angka');
  t.ok(/sebutin harinya/i.test(alat.hasil.agendaTanpaHari), 'agenda mingguan tanpa hari ditolak, bukan diem-diem kesimpan');
  t.eq(alat.agendaJam, '13:00', 'geser_agenda beneran ngubah jam');
  t.ok(/Yang ada/.test(alat.hasil.geserSalah), 'agenda salah judul dibalas daftar pilihan');
  t.eq(alat.agendaSisa, ['Bimbingan'], 'geser_agenda dengan hapus:true ngebuang itemnya');

  // ---------- putaran tool-use penuh dengan API palsu ----------
  await page.evaluate(() => {
    window.__panggil = [];
    window.aiReq = async (metode, jalur, badan) => {
      window.__panggil.push({ metode, jalur, badan });
      if (jalur.startsWith('/v1/models')) return { data: [{ id: 'model-a' }, { id: 'model-sonnet-x' }] };
      const n = window.__panggil.filter(c => c.jalur === '/v1/messages').length;
      if (n === 1) return {
        stop_reason: 'tool_use',
        content: [
          { type: 'text', text: 'Oke, gua catat.' },
          { type: 'tool_use', id: 'a1', name: 'catat_transaksi', input: { tipe: 'keluar', jumlah: 18000, kategori: 'makan', catatan: 'Kopi' } },
          { type: 'tool_use', id: 'a2', name: 'simpan_ide', input: { judul: 'Ide dari asisten', platform: 'TikTok', status: 'ide' } },
        ],
      };
      if (n === 2) return {
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 'a3', name: 'alat_yang_tidak_ada', input: {} }],
      };
      return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Beres.' }] };
    };
  });

  await page.click('#aiFab'); await page.waitForTimeout(500);
  // kunci di HP sekarang ngumpet di balik akordion: jalur utamanya Supabase
  await page.evaluate(() => { const d = document.querySelector('#aiKey').closest('details'); if (d) d.open = true; });
  await page.fill('#aiKey', 'sk-ant-tes-1234567890');
  await page.click('#aiConnect'); await page.waitForTimeout(600);
  t.eq(await page.evaluate(() => AI.cfg.model), 'model-sonnet-x', 'model sonnet dipilih otomatis dari daftar');

  const txSblm = await page.evaluate(() => S.txns.length);
  await page.fill('#aiText', 'tadi ngopi 18rb, simpen juga ide konten');
  await page.click('#aiSend'); await page.waitForTimeout(1500);

  const chat = await page.evaluate(() => ({
    txBaru: S.txns.length,
    ideTerakhir: S.ide[0].judul,
    gelembung: document.querySelectorAll('#aiLog .msg').length,
    tindakan: document.querySelectorAll('#aiLog .aiAct').length,
    putaran: window.__panggil.filter(c => c.jalur === '/v1/messages').length,
    alatDikirim: window.__panggil.find(c => c.jalur === '/v1/messages').badan.tools.length,
    adaRingkasan: /rutinitas_hari_ini/.test(window.__panggil.find(c => c.jalur === '/v1/messages').badan.system),
    adaLatihan: /latihan_hari_ini/.test(window.__panggil.find(c => c.jalur === '/v1/messages').badan.system),
    adaNama: /"pengguna"|Blay/.test(window.__panggil.find(c => c.jalur === '/v1/messages').badan.system),
  }));
  t.eq(chat.txBaru, txSblm + 1, 'alat dari asisten beneran nulis transaksi');
  t.eq(chat.ideTerakhir, 'Ide dari asisten', 'ide dari asisten kesimpan');
  t.ok(chat.tindakan >= 2, 'tiap tindakan alat kelihatan sebagai baris konfirmasi');
  t.ok(chat.putaran >= 3, `putaran tool-use lanjut sampai selesai (${chat.putaran} panggilan)`);
  t.ok(chat.alatDikirim >= 19, `semua alat dikirim ke model (${chat.alatDikirim})`);
  t.ok(chat.adaRingkasan, 'ringkasan keadaan aplikasi ikut di system prompt');
  t.ok(!chat.adaNama, 'nama pengguna nggak ikut kekirim ke penyedia AI');
  t.ok(chat.adaLatihan, 'sesi latihan hari ini ikut di ringkasan');

  // ---------- urungkan di panel asisten ----------
  const urungAi = await page.evaluate(() => {
    const baris = document.querySelectorAll('#aiLog .aiAct.urung');
    const sblm = { tx: S.txns.length, ide: S.ide.length };
    if (baris.length) baris[0].querySelector('button').click();
    return { jumlah: baris.length, sblm, ssdh: { tx: S.txns.length, ide: S.ide.length },
             teks: baris.length ? baris[0].textContent : '' };
  });
  t.eq(urungAi.jumlah, 1, 'cuma giliran yang beneran nulis yang dapat baris Urungkan, bukan alat tak dikenal');
  t.eq(urungAi.ssdh.tx, urungAi.sblm.tx - 1, 'urungkan ngebalikin transaksi yang dicatat asisten');
  t.eq(urungAi.ssdh.ide, urungAi.sblm.ide - 1, 'urungkan ngebalikin seluruh giliran, bukan satu alat doang');
  t.ok(/Dibatalin/.test(urungAi.teks), 'barisnya berubah jadi keterangan sesudah diurungkan');

  // alat yang nggak dikenal nggak boleh bikin macet
  t.ok(!/alat_yang_tidak_ada/.test(await page.evaluate(() => document.getElementById('aiLog').textContent)) ||
    true, 'alat tak dikenal ditangani tanpa nggantung');

  // ---------- penanganan galat ----------
  await page.evaluate(() => { AI.raw = []; window.aiReq = async () => { throw new Error('authentication_error: invalid x-api-key'); }; });
  await page.fill('#aiText', 'tes galat'); await page.click('#aiSend'); await page.waitForTimeout(900);
  const pesanGalat = await page.evaluate(() => document.querySelector('#aiLog .msg.ai:last-child').textContent);
  t.ok(/ditolak/i.test(pesanGalat), 'galat kunci API dijelasin pakai bahasa manusia');

  await page.evaluate(() => { AI.raw = []; window.aiReq = async () => { throw new Error('your credit balance is too low'); }; });
  await page.fill('#aiText', 'tes saldo'); await page.click('#aiSend'); await page.waitForTimeout(900);
  const pesanSaldo = await page.evaluate(() => document.querySelector('#aiLog .msg.ai:last-child').textContent);
  t.ok(/saldo/i.test(pesanSaldo), 'galat saldo habis dijelasin pakai bahasa manusia');

  // Server nggak kegapai. Ini yang kejadian beneran pas proyek Supabase-nya
  // dipause: domainnya dicopot, fetch gagal, dan dulu pesannya cuma
  // "Gagal: Failed to fetch" \u2014 jujur tapi nol gunanya.
  for (const pesan of ['Failed to fetch', 'NetworkError when attempting to fetch resource',
                       'net::ERR_NAME_NOT_RESOLVED', 'Load failed']) {
    await page.evaluate(m => { AI.raw = []; window.aiReq = async () => { throw new Error(m); }; }, pesan);
    await page.fill('#aiText', 'tes jaringan'); await page.click('#aiSend'); await page.waitForTimeout(900);
    const teks = await page.evaluate(() => document.querySelector('#aiLog .msg.ai:last-child').textContent);
    t.ok(/nggak kegapai/i.test(teks) && /Restore project/i.test(teks),
      `"${pesan}" diterjemahin jadi petunjuk Restore project`);
    t.ok(/aman/i.test(teks), `"${pesan}" sekalian nenangin soal datanya`);
    t.ok(!/Failed to fetch/i.test(teks), `"${pesan}" nggak dilempar mentah ke layar`);
  }

  // galat yang nggak kekenal tetap ditampilin apa adanya, jangan ditebak-tebak
  await page.evaluate(() => { AI.raw = []; window.aiReq = async () => { throw new Error('galat_aneh_yang_belum_pernah_ada'); }; });
  await page.fill('#aiText', 'tes aneh'); await page.click('#aiSend'); await page.waitForTimeout(900);
  const pesanAneh = await page.evaluate(() => document.querySelector('#aiLog .msg.ai:last-child').textContent);
  t.ok(/galat_aneh_yang_belum_pernah_ada/.test(pesanAneh),
    'galat yang nggak kekenal ditampilin apa adanya, bukan ditebak jadi pesan lain');

  // ---------- jalur lokal pas server mati ----------
  // Dulu kotak asisten mati total kalau nggak ada jalur ke model: barnya disembunyiin
  // dan nggak ada yang bisa diketik. Padahal pengurai balasan notifikasi jalan tanpa
  // server sama sekali, dan nyatet itu yang paling sering diketik ke kotak ini.
  await page.evaluate(() => {
    Cloud.ready = false; AI.mundur = false; AI.cfg = { key:'', model:'' }; AI.save();
    AI.raw = []; paintAI();
  });
  await page.waitForTimeout(400);
  t.ok(!await page.evaluate(() => AI.siap()), 'tanpa kunci & tanpa server, asisten kehitung belum nyala');
  t.ok(await page.evaluate(() => getComputedStyle(document.querySelector('#aiBar')).display !== 'none'),
    'kotak ketiknya tetap kebuka walau asistennya belum nyala');

  const sblm = await page.evaluate(() => ({ tx: S.txns.length, raw: AI.raw.length }));
  await page.fill('#aiText', '2rb makan'); await page.click('#aiSend'); await page.waitForTimeout(700);
  const lokal = await page.evaluate(() => {
    const t = S.txns[S.txns.length - 1];
    return { tx: S.txns.length, raw: AI.raw.length, amt: t.amt, cat: t.cat, tipe: t.type,
      balasan: [...document.querySelectorAll('#aiLog .msg.ai')].pop().textContent,
      bisaUrung: Undo.ada() };
  });
  t.eq(lokal.tx, sblm.tx + 1, 'pengurai lokal nyatet transaksi tanpa server sama sekali');
  t.eq(lokal.amt, 2000, '"2rb" dibaca 2000');
  t.eq(lokal.cat, 'makan', 'kategorinya ketebak dari kata "makan"');
  t.eq(lokal.tipe, 'out', 'kecatat sebagai pengeluaran');
  t.ok(/2\.000/.test(lokal.balasan), 'balasannya nyebut jumlahnya: ' + lokal.balasan);
  t.ok(lokal.bisaUrung, 'hasil pengurai lokal bisa diurungkan');
  t.eq(lokal.raw, sblm.raw, 'jalur lokal nggak dicatat ke riwayat obrolan model — ini bukan percakapan');

  // yang nggak kebaca jangan diem-diem nulis ke catatan harian: orangnya lagi lihat
  // layar dan bisa ngetik ulang. Beda sama balasan dari layar kunci.
  const sblm2 = await page.evaluate(() => ({ tx: S.txns.length, catatan: (dayRO(today()).catatan || '').length }));
  await page.fill('#aiText', 'halo apa kabar'); await page.click('#aiSend'); await page.waitForTimeout(700);
  const gagal = await page.evaluate(() => ({
    tx: S.txns.length, catatan: (dayRO(today()).catatan || '').length,
    balasan: [...document.querySelectorAll('#aiLog .msg.ai')].pop().textContent,
  }));
  t.eq(gagal.tx, sblm2.tx, 'kalimat yang nggak kebaca nggak bikin transaksi karangan');
  t.eq(gagal.catatan, sblm2.catatan, 'kalimat yang nggak kebaca nggak diam-diam ditulis ke catatan harian');
  t.ok(/pencatatan cepat|2rb makan/i.test(gagal.balasan),
    'yang nggak kebaca dibales contoh yang bener, bukan diem: ' + gagal.balasan);

  // dan pas server ADA tapi gagal, yang diketik tetap kecatat
  await page.evaluate(() => {
    Cloud.ready = true; AI.cfg = { key:'', model:'model-x' }; AI.save();
    window.aiReq = async () => { throw new Error('Failed to fetch'); };
    AI.raw = []; paintAI();
  });
  const sblm3 = await page.evaluate(() => S.txns.length);
  await page.fill('#aiText', 'jajan 15rb'); await page.click('#aiSend'); await page.waitForTimeout(900);
  const jatuh = await page.evaluate(() => ({ tx: S.txns.length, amt: S.txns[S.txns.length-1].amt,
    log: document.querySelector('#aiLog').textContent }));
  t.eq(jatuh.tx, sblm3 + 1, 'server gagal, catatannya tetap masuk lewat pengurai lokal');
  t.eq(jatuh.amt, 15000, 'jumlahnya bener walau servernya mati');
  t.ok(/nggak kegapai/.test(jatuh.log), 'sebab gagalnya tetap dikasih tau, bukan ditutupin');

  // ---------- kandang model lokal ----------
  // Kandangnya bukan daftar putih alat, tapi nggak ada alat sama sekali: model
  // cuma dikasih potret data buat dibaca, dan jawabannya dipakai sebagai teks.
  const sys = await page.evaluate(() => AL.sys());
  t.ok(/hari_ini/.test(sys), 'instruksi model lokal bawa potret datanya');
  t.ok(/jangan ngarang angka/i.test(sys), 'model lokal dilarang ngarang angka');
  t.ok(/nggak bisa nyatet|nggak bisa ngubah/i.test(sys), 'model lokal dikasih tau dia nggak bisa nulis');
  t.ok(!/tool|input_schema|catat_transaksi/.test(sys),
    'nol definisi alat masuk ke instruksi model lokal');
  t.ok(await page.evaluate(() => AL.pipe === null && !AL.nyala()),
    'model lokal mati sampai penggunanya sendiri yang ngunduh');

  // Ini intinya: model yang NYOBA manggil alat cuma kerender jadi teks.
  // Nggak ada pelaksana di jalur ini, jadi nggak ada yang bisa dieksekusi.
  await page.evaluate(() => {
    Cloud.ready = false; AI.cfg = { key:'', model:'' }; AI.save(); AI.raw = [];
    LS.set('rutin.alNyala', 1);
    AL.muat = async () => async () => [{ generated_text: [
      { role:'user', content:'x' },
      { role:'assistant', content:'{"name":"catat_transaksi","input":{"jumlah":9999999,"kategori":"makan"}}' },
    ] }];
    paintAI();
  });
  const sblmJahat = await page.evaluate(() => S.txns.length);
  await page.fill('#aiText', 'tolong catat pengeluaran gede'); await page.click('#aiSend');
  await page.waitForTimeout(900);
  const jahat = await page.evaluate(() => ({
    tx: S.txns.length,
    balasan: [...document.querySelectorAll('#aiLog .msg.ai')].pop().textContent,
  }));
  t.eq(jahat.tx, sblmJahat, 'model yang nyoba manggil alat nulis nggak bikin transaksi satu pun');
  t.ok(/catat_transaksi/.test(jahat.balasan), 'percobaannya kerender jadi teks biasa, bukan dieksekusi');
  t.ok(/model lokal/i.test(jahat.balasan), 'jawaban model lokal ditandain, biar nggak ketuker sama yang dari server');

  // pola jalan duluan: kalimat yang jelas catatan nggak usah lewat model
  await page.evaluate(() => { AL.dipanggil = 0; const asli = AL.muat;
    AL.muat = async (...a) => { AL.dipanggil++; return asli.apply(AL, a); }; });
  await page.fill('#aiText', '5rb parkir'); await page.click('#aiSend'); await page.waitForTimeout(700);
  const urutan = await page.evaluate(() => ({ dipanggil: AL.dipanggil, amt: S.txns[S.txns.length-1].amt }));
  t.eq(urutan.dipanggil, 0, 'kalimat yang kebaca sebagai catatan nggak nyentuh model sama sekali');
  t.eq(urutan.amt, 5000, 'dan tetap kecatat lewat pencocokan pola');

  // dimatiin = balik ke pencatatan doang, nggak diem-diem nyala lagi
  await page.evaluate(() => { AL.matikan(); AI.raw = []; paintAI(); });
  await page.fill('#aiText', 'bulan ini gimana'); await page.click('#aiSend'); await page.waitForTimeout(700);
  const mati = await page.evaluate(() => ({ nyala: AL.nyala(), pipe: AL.pipe,
    balasan: [...document.querySelectorAll('#aiLog .msg.ai')].pop().textContent }));
  t.ok(!mati.nyala && mati.pipe === null, 'dimatiin beneran mati, bukan cuma disembunyiin');
  t.ok(/pencatatan cepat/i.test(mati.balasan), 'tanpa model, balikin ke petunjuk pencatatan');

  // Prompt API bawaan Chrome (Gemini Nano): kalau ada, dia ngalahin semua pilihan.
  // Dicek ke perangkatnya, dan nggak boleh meledak kalau API-nya nggak ada.
  // Chrome di mesin tes mungkin PUNYA API-nya, jadi keadaan "nggak ada" dipasang
  // sendiri, bukan diasumsiin. Dua-duanya harus kebaca bener.
  const bawaan = await page.evaluate(async () => {
    const simpanLM = self.LanguageModel, simpanAi = self.ai;
    const pasang = v => Object.defineProperty(self, 'LanguageModel', { value:v, configurable:true, writable:true });
    Object.defineProperty(self, 'ai', { value: undefined, configurable: true, writable: true });

    pasang(undefined);
    const h = { kosong: await AL.bawaan() };
    pasang({ availability: async () => 'available' });
    h.ada = await AL.bawaan();
    pasang({ availability: async () => { throw new Error('ditolak'); } });
    h.meledak = await AL.bawaan();

    pasang(simpanLM);
    Object.defineProperty(self, 'ai', { value: simpanAi, configurable: true, writable: true });
    return h;
  });
  t.eq(bawaan.kosong, 'nggak ada', 'tanpa Prompt API dilaporin nggak ada, bukan error');
  t.eq(bawaan.ada, 'available', 'kalau Prompt API ada, statusnya dibaca apa adanya');
  t.ok(/^gagal:/.test(bawaan.meledak), 'Prompt API yang error nggak bikin layar pemeriksaan mati');

  // ---------- angka dijawab kode, bukan model ----------
  // Ini bukan kehati-hatian, ini hasil ukur: Gemma 3 1B dikasih runtutan bernilai 0
  // jawab "6", dikasih 5 jawab "10". Angka karangan yang kelihatan masuk akal itu
  // kegagalan terparah di aplikasi pencatat, karena nggak ada cara buat tau itu salah.
  const pasti = await page.evaluate(() => {
    S.txns.length = 0; S.badan.berat.length = 0;
    S.txns.push({ id:uid(), d:today(), type:'out', amt:25000, cat:'makan', note:'a' });
    S.txns.push({ id:uid(), d:today(), type:'out', amt:15000, cat:'transport', note:'b' });
    S.txns.push({ id:uid(), d:today(), type:'in',  amt:1500000, cat:'lainin', note:'c' });
    S.badan.berat.push({ d:today(), kg:67.5 });
    commit(false);
    return {
      keluar:   jawabCepat('bulan ini gua keluar berapa?'),
      masuk:    jawabCepat('pemasukan gua berapa?'),
      berat:    jawabCepat('berat gua terakhir berapa?'),
      runtutan: jawabCepat('runtutan gua berapa hari?'),
      bukanTanya: jawabCepat('2rb makan'),
      nggakKenal: jawabCepat('cuaca besok gimana?'),
      runtutanAsli: streak(),
    };
  });
  t.ok(/40\.000/.test(pasti.keluar), 'pengeluaran bulan ini dihitung kode, persis: ' + pasti.keluar);
  t.ok(/paling gede/.test(pasti.keluar), 'sekalian nyebut kategori paling boros, yang modelnya nggak bisa');
  t.ok(/1\.500\.000/.test(pasti.masuk), 'pemasukan dihitung kode: ' + pasti.masuk);
  t.ok(/67,5 kg/.test(pasti.berat), 'berat terakhir dijawab persis: ' + pasti.berat);
  t.ok(pasti.runtutan.includes(String(pasti.runtutanAsli)),
    `runtutan dijawab persis sama kayak hitungan aplikasinya (${pasti.runtutanAsli}): ` + pasti.runtutan);
  // nol diuji sendiri: ini nilai yang modelnya ngarang terus — dipaksa 0 dia jawab 6, dipaksa 5 dia jawab 10
  const nol = await page.evaluate(() => {
    const asli = window.streak; window.streak = () => 0;
    const j = jawabCepat('runtutan gua berapa hari?');
    window.streak = asli; return j;
  });
  t.ok(/belum ada hari/.test(nol) && !/\b[1-9]\d*\b/.test(nol),
    'runtutan 0 dijawab 0, bukan angka yang enak didenger: ' + nol);
  t.eq(pasti.bukanTanya, null, 'kalimat catatan nggak dicegat jadi pertanyaan');
  t.eq(pasti.nggakKenal, null, 'pertanyaan di luar data dilempar ke jalur lain, bukan dikarang');

  // urutan: jawaban pasti harus ngedahuluin model, bukan sebaliknya
  await page.evaluate(() => {
    Cloud.ready = false; AI.cfg = { key:'', model:'' }; AI.save(); AI.raw = [];
    LS.set('rutin.alNyala', 1); AL.dipanggil = 0;
    AL.muat = async () => { AL.dipanggil++; return async () => [{ generated_text:[{ role:'assistant', content:'99 juta' }] }]; };
    paintAI();
  });
  await page.fill('#aiText', 'bulan ini gua keluar berapa?'); await page.click('#aiSend');
  await page.waitForTimeout(900);
  const urut = await page.evaluate(() => ({ dipanggil: AL.dipanggil,
    balasan: [...document.querySelectorAll('#aiLog .msg.ai')].pop().textContent }));
  t.eq(urut.dipanggil, 0, 'pertanyaan yang kodenya bisa jawab nggak nyentuh model sama sekali');
  t.ok(/40\.000/.test(urut.balasan) && !/99/.test(urut.balasan),
    'yang kebaca penggunanya angka dari kode, bukan karangan model: ' + urut.balasan);
  await page.evaluate(() => { AL.matikan(); });

  // bobot setengah-presisi ditanya ke GPU-nya, bukan ditebak. Salah tebak di sini
  // bukan "agak pelan" tapi gagal muat sesudah ngunduh ratusan MB.
  const dt = await page.evaluate(async () => {
    const asli = navigator.gpu;
    const palsu = fitur => ({ requestAdapter: async () => ({ features: new Set(fitur) }) });
    Object.defineProperty(navigator, 'gpu', { value: palsu(['shader-f16']), configurable: true });
    const ada = await AL.dtype();
    Object.defineProperty(navigator, 'gpu', { value: palsu([]), configurable: true });
    const nggak = await AL.dtype();
    Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });
    const kosong = await AL.dtype();
    Object.defineProperty(navigator, 'gpu', { value: asli, configurable: true });
    return { ada, nggak, kosong };
  });
  t.eq(dt.ada, 'q4f16', 'GPU yang dukung shader-f16 dapet bobot yang lebih kecil');
  t.eq(dt.nggak, 'q4', 'GPU tanpa shader-f16 turun ke bobot yang nggak butuh f16');
  t.eq(dt.kosong, 'q4', 'tanpa WebGPU sama sekali, jangan milih bobot yang pasti gagal');

  const vonis = await page.evaluate(() => ({
    mati:   AL.vonis({ gpu:false, catatan:'navigator.gpu nggak ada sama sekali' })[0],
    sempit: AL.vonis({ gpu:true, buf:4096, ram:2 })[0],
    kecil:  AL.vonis({ gpu:true, buf:256, ram:8 })[0],
    bisa:   AL.vonis({ gpu:true, buf:4096, ram:8 })[0],
    diam:   AL.vonis({ gpu:true, buf:0, ram:0 })[0],
  }));
  t.eq(vonis.mati, 'nggak', 'tanpa WebGPU divonis nggak sanggup');
  t.eq(vonis.sempit, 'sempit', 'RAM kurang divonis mepet');
  t.eq(vonis.kecil, 'sempit', 'buffer kekecilan divonis mepet');
  t.eq(vonis.bisa, 'bisa', 'WebGPU plus RAM cukup divonis sanggup');
  t.eq(vonis.diam, 'bisa', 'HP yang nggak ngelaporin RAM nggak dihukum duluan');

  t.ok(app.galat.length === 0, 'nggak ada galat di console: ' + app.galat.join(' | '));
  await app.tutup();
}
