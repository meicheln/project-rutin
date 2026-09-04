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
