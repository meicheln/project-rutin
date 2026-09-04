/** Inti: tanggal, format uang, hitungan runtutan, penyimpanan, tema. */
import { bukaAplikasi } from './bantu.mjs';

export const nama = 'Inti — tanggal, uang, runtutan, penyimpanan';

export async function jalan(t) {
  const app = await bukaAplikasi();
  const { page } = app;
  await app.masukLokal();

  // --- tanggal ---
  const tgl = await page.evaluate(() => ({
    tambah: addDays('2026-02-27', 3),
    lompat: addDays('2028-02-28', 1),          // tahun kabisat
    selisih: daysBetween('2026-01-01', '2026-03-01'),
    balik: D(fromD('2026-08-15')),
    akhirBulan: addDays('2026-12-31', 1),
  }));
  t.eq(tgl.tambah, '2026-03-02', 'addDays lewat akhir Februari');
  t.eq(tgl.lompat, '2028-02-29', 'addDays kenal tahun kabisat');
  t.eq(tgl.selisih, 59, 'daysBetween Jan–Mar 2026');
  t.eq(tgl.balik, '2026-08-15', 'fromD/D bolak-balik konsisten');
  t.eq(tgl.akhirBulan, '2027-01-01', 'addDays lewat pergantian tahun');

  // --- format uang ---
  const uang = await page.evaluate(() => ({
    rp: rp(2475000), nol: rp(0), minus: rp(-25000),
    pendek1: rpShort(2500000), pendek2: rpShort(25000), pendek3: rpShort(1200000000),
  }));
  t.eq(uang.rp, 'Rp2.475.000', 'rp() pakai pemisah ribuan Indonesia');
  t.eq(uang.nol, 'Rp0', 'rp(0)');
  t.eq(uang.minus, 'Rp25.000', 'rp() ambil nilai mutlak, tanda ditaruh pemanggil');
  t.eq(uang.pendek1, 'Rp2,5 jt', 'rpShort juta');
  t.eq(uang.pendek2, 'Rp25rb', 'rpShort ribu');
  t.eq(uang.pendek3, 'Rp1,2 M', 'rpShort miliar');

  // --- durasi ---
  const dur = await page.evaluate(() => ({ a: hm(150), b: hm(45), c: hm(120), d: hmShort(150) }));
  t.eq(dur.a, '2j 30m', 'hm jam+menit');
  t.eq(dur.b, '45 menit', 'hm menit doang');
  t.eq(dur.c, '2 jam', 'hm jam bulat');
  t.eq(dur.d, '2j30', 'hmShort ringkas');

  // --- runtutan: 60% rutinitas = hari itu kehitung ---
  const runtut = await page.evaluate(() => {
    S.days = {};
    const n = S.routines.length, ambang = Math.ceil(n * 0.6);
    for (let i = 0; i < 5; i++) {
      const d = addDays(today(), -i), o = day(d);
      S.routines.slice(0, ambang).forEach(r => o.rt[r.id] = true);
    }
    const penuh = streak();
    // hari ke-3 dibikin cuma 1 centang -> runtutan harus putus di situ
    const d3 = addDays(today(), -3);
    S.days[d3].rt = { [S.routines[0].id]: true };
    return { penuh, putus: streak(), ambang, total: n };
  });
  t.eq(runtut.penuh, 5, 'runtutan ngitung 5 hari berturut');
  t.eq(runtut.putus, 3, 'runtutan putus di hari yang di bawah 60%');

  // --- arus kas ---
  const kas = await page.evaluate(() => {
    S.txns = [
      { id: 'a', d: today(), type: 'in', amt: 2500000, cat: 'gaji', note: '' },
      { id: 'b', d: today(), type: 'out', amt: 25000, cat: 'makan', note: '' },
      { id: 'c', d: addDays(today(), -40), type: 'out', amt: 999999, cat: 'makan', note: '' },
    ];
    const bulan = txOfMonth(today().slice(0, 7));
    return { masuk: inSum(bulan), keluar: outSum(bulan), jumlahBulan: bulan.length, saldoSemua: saldoTotal() };
  });
  t.eq(kas.masuk, 2500000, 'inSum cuma ngitung tipe masuk');
  t.eq(kas.keluar, 25000, 'outSum ngesaring transaksi di luar bulan ini');
  t.eq(kas.jumlahBulan, 2, 'txOfMonth ngesaring per bulan');
  t.eq(kas.saldoSemua, 2500000 - 25000 - 999999, 'saldoTotal ngitung semua periode');

  // --- lama tidur nyeberang tengah malam ---
  const tidur = await page.evaluate(() => {
    const kmr = addDays(today(), -1);
    day(kmr).tidur = '23:30'; day(today()).bangun = '06:15';
    const normal = sleepMin(today());
    day(kmr).tidur = '01:00'; day(today()).bangun = '08:00';
    const dinihari = sleepMin(today());
    day(kmr).tidur = '23:00'; day(today()).bangun = '23:30';   // mustahil: 30 menit
    const aneh = sleepMin(today());
    return { normal, dinihari, aneh };
  });
  t.eq(tidur.normal, 405, 'tidur 23:30 → bangun 06:15 = 6j45');
  t.eq(tidur.dinihari, 420, 'tidur dini hari 01:00 → 08:00 = 7 jam');
  t.eq(tidur.aneh, 30, 'durasi ganjil tetap dihitung apa adanya, bukan dibuang');

  // --- penyimpanan tahan localStorage mati ---
  const simpan = await page.evaluate(() => {
    const asli = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('QuotaExceeded'); };
    let lolos = true;
    try { LS.set('rutin.tes', { a: 1 }); } catch (e) { lolos = false; }
    Storage.prototype.setItem = asli;
    return { takLempar: lolos, dariMemori: LS.get('rutin.tes', null) };
  });
  t.ok(simpan.takLempar, 'LS.set nggak lempar galat waktu localStorage nolak');
  t.eq(simpan.dariMemori, { a: 1 }, 'LS mundur ke memori waktu localStorage mati');

  // --- tema ---
  await page.click('#themeBtn'); await page.waitForTimeout(300);
  const t1 = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.click('#themeBtn'); await page.waitForTimeout(300);
  const t2 = await page.evaluate(() => document.documentElement.dataset.theme);
  t.ok(t1 !== t2, 'tombol tema beneran nukar tema');
  t.ok(['dark', 'light'].includes(t1), 'tema selalu salah satu dari dua nilai sah');

  t.ok(app.galat.length === 0, 'nggak ada galat di console: ' + app.galat.join(' | '));
  await app.tutup();
}
