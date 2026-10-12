/** Alur lima layar utama lewat UI beneran, plus tetap tersimpan setelah muat ulang. */
import { bukaAplikasi } from './bantu.mjs';

export const nama = 'Modul — beranda, harian, uang, progres, ide';

export async function jalan(t) {
  const app = await bukaAplikasi();
  const { page } = app;
  await page.fill('#gnNama', 'Blay');
  await app.masukLokal();

  const nav = v => page.click(`nav .tab[data-go="${v}"]`);

  // --- catat pengeluaran lewat UI ---
  await page.click('.chip[data-sheet="out"]'); await page.waitForTimeout(400);
  await page.fill('#txAmt', '25000');
  await page.click('[data-chip="txCat"][data-val="makan"]');
  await page.fill('#txNote', 'Nasi goreng depan kos');
  await page.click('#sheetSave'); await page.waitForTimeout(500);

  const tx = await page.evaluate(() => S.txns.at(-1));
  t.eq(tx.amt, 25000, 'jumlah pengeluaran kesimpan');
  t.eq(tx.cat, 'makan', 'kategori kepilih dari chip');
  t.eq(tx.type, 'out', 'tipe transaksi benar');

  // jumlah kosong harus ditolak
  await page.click('.chip[data-sheet="out"]'); await page.waitForTimeout(400);
  await page.click('#sheetSave'); await page.waitForTimeout(400);
  const masihBuka = await page.evaluate(() => document.getElementById('sheet').classList.contains('on'));
  t.ok(masihBuka, 'sheet nggak nutup kalau jumlahnya kosong');
  await page.evaluate(() => closeSheet()); await page.waitForTimeout(400);
  t.eq(await page.evaluate(() => S.txns.length), 1, 'transaksi kosong nggak jadi kesimpan');

  // --- harian: centang rutinitas ---
  await nav('day'); await page.waitForTimeout(500);
  for (let i = 0; i < 3; i++) {
    const r = await page.$$('[data-rt]');
    if (r[i]) { await r[i].click(); await page.waitForTimeout(200); }
  }
  t.eq(await page.evaluate(() => routineDone(today())), 3, '3 rutinitas tercentang');

  // centang dua kali = balik ke belum
  const r0 = (await page.$$('[data-rt]'))[0];
  await r0.click(); await page.waitForTimeout(300);
  t.eq(await page.evaluate(() => routineDone(today())), 2, 'centang lagi bikin batal');

  // --- blok waktu masuk linimasa ---
  await page.click('[data-sheet="block"]'); await page.waitForTimeout(400);
  await page.fill('#blS', '08:00'); await page.fill('#blE', '10:30');
  await page.click('[data-chip="blC"][data-val="skripsi"]');
  await page.fill('#blT', 'Nulis BAB III');
  await page.click('#sheetSave'); await page.waitForTimeout(500);
  const blok = await page.evaluate(() => dayRO(today()).blocks);
  t.eq(blok.length, 1, 'blok waktu masuk ke hari ini');
  t.eq(blok[0].c, 'skripsi', 'kategori blok benar');

  // --- mood & energi ---
  await page.click('[data-mood="4"]'); await page.waitForTimeout(250);
  await page.click('[data-energi="3"]'); await page.waitForTimeout(250);
  const suasana = await page.evaluate(() => ({ m: dayRO(today()).mood, e: dayRO(today()).energi }));
  t.eq(suasana.m, 4, 'mood kesimpan'); t.eq(suasana.e, 3, 'energi kesimpan');

  // --- skripsi ---
  await nav('prog'); await page.waitForTimeout(400);
  await page.click('#progSeg button[data-p="skripsi"]'); await page.waitForTimeout(400);
  const bab = await page.$$('[data-bab]');
  await bab[0].click(); await page.waitForTimeout(400);
  await page.selectOption('#bbSt', 'acc');
  await page.fill('#bbP', '40');                 // status ACC harus maksa jadi 100
  await page.click('#sheetSave'); await page.waitForTimeout(400);
  const b0 = await page.evaluate(() => S.skripsi.bab[0]);
  t.eq(b0.p, 100, 'status ACC otomatis naikin progres ke 100%');
  t.eq(await page.evaluate(() => Math.round(babPct() * 100)), 20, 'progres skripsi = rata-rata 5 bab');

  // --- kerja ---
  await page.click('#progSeg button[data-p="kerja"]'); await page.waitForTimeout(400);
  await page.click('#progBody [data-sheet="task"]'); await page.waitForTimeout(400);
  await page.fill('#tkT', 'Kirim revisi ke klien');
  await page.selectOption('#tkPrio', 'tinggi');
  await page.fill('#tkDue', '2026-01-01');       // sengaja lewat
  await page.click('#sheetSave'); await page.waitForTimeout(500);
  t.eq(await page.evaluate(() => overdue().length), 1, 'tugas lewat tenggat kedeteksi telat');

  const cek = await page.$$('[data-task]');
  await cek[0].click(); await page.waitForTimeout(400);
  const tugas = await page.evaluate(() => S.tasks[0]);
  t.ok(tugas.done, 'tugas ketandain selesai');
  t.eq(tugas.doneAt, await page.evaluate(() => today()), 'tanggal selesai keisi');
  t.eq(await page.evaluate(() => overdue().length), 0, 'tugas selesai keluar dari daftar telat');

  // --- badan ---
  await page.click('#progSeg button[data-p="badan"]'); await page.waitForTimeout(400);
  await page.click('#progBody [data-sheet="berat"]'); await page.waitForTimeout(400);
  await page.fill('#bwKg', '68.4'); await page.click('#sheetSave'); await page.waitForTimeout(400);
  t.eq(await page.evaluate(() => lastWeight().kg), 68.4, 'berat kesimpan');

  // catat lagi di hari yang sama harus nimpa, bukan nambah baris
  await page.click('#progBody [data-sheet="berat"]'); await page.waitForTimeout(400);
  await page.fill('#bwKg', '68.1'); await page.click('#sheetSave'); await page.waitForTimeout(400);
  const berat = await page.evaluate(() => S.badan.berat);
  t.eq(berat.length, 1, 'berat di tanggal sama ditimpa, bukan dobel');
  t.eq(berat[0].kg, 68.1, 'nilai berat terbaru yang dipakai');

  await page.click('[data-air="5"]'); await page.waitForTimeout(300);
  t.eq(await page.evaluate(() => intake(today()).air), 5, 'gelas air keisi lewat ketuk');
  await page.click('[data-air="5"]'); await page.waitForTimeout(300);
  t.eq(await page.evaluate(() => intake(today()).air), 4, 'ketuk gelas yang sama ngurangin satu');

  // --- ide ---
  await nav('idea'); await page.waitForTimeout(400);
  await page.click('#s-idea [data-sheet="idea"]'); await page.waitForTimeout(400);
  await page.fill('#idJ', 'Cara ngatur uang anak kos');
  await page.click('[data-chip="idSt"][data-val="konsep"]');
  await page.click('[data-chip="idPlat"][data-val="TikTok"]');
  await page.fill('#idTag', 'keuangan, kos');
  await page.click('#sheetSave'); await page.waitForTimeout(500);
  const ide = await page.evaluate(() => S.ide[0]);
  t.eq(ide.st, 'konsep', 'status ide kesimpan');
  t.eq(ide.platform, 'TikTok', 'platform ide kesimpan');

  // ---------- target ----------
  const tg = await page.evaluate(() => {
    const simpanSesi = LT().sesi, simpanTx = S.txns, simpanBerat = S.badan.berat;
    const h = {};

    // beban: titik awal 60kg x 10 (1RM 80), sekarang 65kg x 8 (1RM ~82,3), target 90
    LT().sesi = [
      { id:'t1', d:'2026-01-05', sid:'push', ceklis:{}, set:{ pu_m1:[{kg:60,rep:10}] } },
      { id:'t2', d:'2026-02-05', sid:'push', ceklis:{}, set:{ pu_m1:[{kg:65,rep:8}] } },
    ];
    const gBeban = { id:'g1', jenis:'beban', ex:'pu_m1', nilai:90, mulai:'2026-01-01', tenggat:'' };
    const rBeban = majuTarget(gBeban);
    h.bebanPersen = Math.round(rBeban.persen * 100);
    h.bebanAwal = Math.round(rBeban.awal);
    h.bebanStatus = rBeban.status;
    // diukur dari nol, 82/90 = 91%. diukur dari titik awal 80, cuma 23%.
    h.bukanDariNol = h.bebanPersen < 40;

    // target kelewat -> kena
    h.kena = majuTarget({ ...gBeban, nilai:70 }).status;

    // batas belanja dibalik: makin kecil makin bagus, lewat = merah
    S.txns = [{ id:'x1', d:today(), type:'out', amt:300000, cat:'makan', note:'' }];
    const rBatas = majuTarget({ id:'g2', jenis:'batas', cat:'makan', nilai:200000 });
    h.batasStatus = rBatas.status;
    h.batasPersen = Math.round(rBatas.persen * 100);
    h.batasAman = majuTarget({ id:'g3', jenis:'batas', cat:'makan', nilai:500000 }).status;

    // berat turun: awal 80, target 75, sekarang 76 -> 80% jalan
    S.badan.berat = [{ d:'2026-01-01', kg:80 }, { d:'2026-02-01', kg:76 }];
    const rBerat = majuTarget({ id:'g4', jenis:'berat', nilai:75, mulai:'2026-01-01', tenggat:'' });
    h.beratPersen = Math.round(rBerat.persen * 100);
    h.beratStatus = rBerat.status;

    // data belum ada -> null, BUKAN nol persen
    S.badan.berat = [];
    const rKosong = majuTarget({ id:'g5', jenis:'berat', nilai:75, mulai:today(), tenggat:'' });
    h.kosongKini = rKosong.kini;
    h.kosongStatus = rKosong.status;

    // tenggat kelewat sementara masih jalan -> telat
    h.telat = majuTarget({ id:'g6', jenis:'beban', ex:'pu_m1', nilai:200,
                           mulai:'2026-01-01', tenggat:'2026-01-02' }).status;

    // jenis ngaco nggak bikin nabrak
    h.ngaco = majuTarget({ id:'g7', jenis:'ngawur', nilai:10 });

    LT().sesi = simpanSesi; S.txns = simpanTx; S.badan.berat = simpanBerat;
    return h;
  });
  t.eq(tg.bebanAwal, 80, 'titik awal beban dari perkiraan 1RM set pertama');
  t.ok(tg.bukanDariNol, `progres diukur dari titik awal, bukan dari nol (${tg.bebanPersen}%, bukan ~91%)`);
  t.eq(tg.bebanStatus, 'jalan', 'target yang belum kesampe statusnya jalan');
  t.eq(tg.kena, 'kena', 'target yang udah kelewat statusnya kena');
  t.eq(tg.batasStatus, 'lewat', 'batas belanja yang kebobol statusnya lewat');
  t.eq(tg.batasPersen, 150, 'batas belanja ngitung kuota kepakai, bukan jarak ke target');
  t.eq(tg.batasAman, 'jalan', 'batas belanja yang masih aman statusnya jalan');
  t.eq(tg.beratPersen, 80, 'berat turun kehitung bener walau arahnya kebalik');
  t.eq(tg.beratStatus, 'jalan', 'berat yang belum nyampe target statusnya jalan');
  t.eq(tg.kosongKini, null, 'data yang belum ada dibaca null, bukan 0 — biar nggak digambar 0%');
  t.eq(tg.kosongStatus, 'kosong', 'target tanpa data statusnya kosong');
  t.eq(tg.telat, 'telat', 'tenggat yang udah lewat sementara belum kena = telat');
  t.eq(tg.ngaco, null, 'jenis target yang nggak dikenal balik null, nggak nabrak');

  // --- target lewat UI, kesimpan dan kebaca asisten ---
  await nav('home'); await page.waitForTimeout(400);
  await page.click('#homeBody .sect [data-sheet="target"]'); await page.waitForTimeout(400);
  await page.selectOption('#tgJenis', 'nabung'); await page.waitForTimeout(250);
  await page.fill('#tgNilai', '5000000');
  await page.fill('#tgJudul', 'Nabung buat laptop');
  await page.click('#sheetSave'); await page.waitForTimeout(500);
  const tgUi = await page.evaluate(() => ({
    jumlah: (S.target || []).length,
    jenis: S.target[0].jenis,
    nilai: S.target[0].nilai,
    adaMulai: !!S.target[0].mulai,
    dariAsisten: AI_RUN.baca_target(),
    diBeranda: document.getElementById('homeBody').innerHTML.includes('Nabung buat laptop'),
  }));
  t.eq(tgUi.jumlah, 1, 'target kesimpan lewat form');
  t.eq(tgUi.jenis, 'nabung', 'jenis target kepilih dari dropdown');
  t.eq(tgUi.nilai, 5000000, 'angka target kesimpan');
  t.ok(tgUi.adaMulai, 'tanggal mulai keisi otomatis — tanpa itu titik awalnya nggak kebaca');
  t.ok(tgUi.diBeranda, 'target nongol di beranda');
  t.ok(/Nabung buat laptop/.test(tgUi.dariAsisten), 'asisten bisa baca target lewat baca_target');

  // batas belanja nggak minta tanggal — jendelanya selalu bulan berjalan
  await page.click('#homeBody .sect [data-sheet="target"]'); await page.waitForTimeout(400);
  await page.selectOption('#tgJenis', 'batas'); await page.waitForTimeout(250);
  const tglSembunyi = await page.evaluate(() => ({
    tgl: getComputedStyle(document.getElementById('tgTglW')).display,
    kat: getComputedStyle(document.getElementById('tgCatW')).display,
    ex:  getComputedStyle(document.getElementById('tgExW')).display,
  }));
  t.eq(tglSembunyi.tgl, 'none', 'batas belanja nggak nanyain tanggal mulai/tenggat');
  t.ok(tglSembunyi.kat !== 'none', 'batas belanja nanyain kategori');
  t.eq(tglSembunyi.ex, 'none', 'pilihan gerakan disembunyiin buat jenis selain beban');
  await page.evaluate(() => closeSheet()); await page.waitForTimeout(400);

  // --- tetap ada setelah muat ulang ---
  await page.reload(); await page.waitForTimeout(1200);
  const pulih = await page.evaluate(() => ({
    tx: S.txns.length, ide: S.ide.length, tugas: S.tasks.length,
    nama: S.profile.nama, blok: (dayRO(today()).blocks || []).length,
  }));
  t.eq(pulih.tx, 1, 'transaksi bertahan setelah muat ulang');
  t.eq(pulih.ide, 1, 'ide bertahan');
  t.eq(pulih.nama, 'Blay', 'nama bertahan');
  t.eq(pulih.blok, 1, 'blok waktu bertahan');

  t.ok(app.galat.length === 0, 'nggak ada galat di console: ' + app.galat.join(' | '));
  await app.tutup();
}
