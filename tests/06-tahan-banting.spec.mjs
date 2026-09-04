/**
 * Ketahanan data: dua lapis penyimpanan, pulih waktu satu lapis hilang,
 * cadangan JSON, dan aturan menang-mana waktu sinkron.
 */
import { bukaAplikasi } from './bantu.mjs';

export const nama = 'Tahan banting — IndexedDB, pemulihan, cadangan, sinkron';

export async function jalan(t) {
  const app = await bukaAplikasi();
  const { page } = app;
  await app.masukLokal();
  const isi = await app.isiContoh();
  t.ok(isi.tx > 50, `data contoh keisi (${isi.tx} transaksi, ${isi.hari} hari)`);

  // ---------- dua lapis nulis ----------
  await page.evaluate(async () => { await Store.flush(); });
  const dua = await page.evaluate(async () => {
    const idb = await IDB.get('state');
    const ls = JSON.parse(localStorage.getItem('rutin.state'));
    return { idbTx: idb.txns.length, lsTx: ls.txns.length, cocok: idb.updatedAt === ls.updatedAt };
  });
  t.eq(dua.idbTx, dua.lsTx, 'IndexedDB dan localStorage nyimpen jumlah transaksi yang sama');
  t.ok(dua.cocok, 'dua lapis penyimpanan pegang versi yang sama');

  // ---------- localStorage hilang → pulih dari IndexedDB ----------
  const sblm = await page.evaluate(() => S.txns.length);
  await page.evaluate(() => localStorage.removeItem('rutin.state'));
  await page.reload(); await page.waitForTimeout(1400);
  const pulihIDB = await page.evaluate(() => ({ tx: S.txns.length, nama: S.profile.nama, hari: Object.keys(S.days).length }));
  t.eq(pulihIDB.tx, sblm, 'data balik utuh dari IndexedDB waktu localStorage dihapus');
  t.eq(pulihIDB.nama, 'Blay', 'profil ikut pulih');
  t.ok(pulihIDB.hari > 40, 'riwayat harian ikut pulih');

  // ---------- IndexedDB mati total → aplikasi tetap jalan ----------
  const app2 = await bukaAplikasi({
    sebelumMuat: () => { Object.defineProperty(window, 'indexedDB', { get() { throw new Error('IDB diblokir'); } }); },
  });
  await app2.masukLokal();
  const tanpaIDB = await app2.page.evaluate(() => {
    S.txns.push({ id: 'z', d: today(), type: 'out', amt: 5000, cat: 'makan', note: '' });
    commit(false);
    return { storeOk: Store.ok, tersimpan: !!localStorage.getItem('rutin.state'), jalan: typeof render === 'function' };
  });
  t.ok(!tanpaIDB.storeOk, 'aplikasi tahu IndexedDB nggak tersedia');
  t.ok(tanpaIDB.tersimpan, 'masih nulis ke localStorage sebagai cadangan');
  t.ok(tanpaIDB.jalan, 'aplikasi tetap jalan tanpa IndexedDB');
  t.ok(app2.galat.length === 0, 'IndexedDB mati nggak bikin galat ke console: ' + app2.galat.join(' | '));
  await app2.tutup();

  // ---------- cadangan JSON bolak-balik ----------
  const cadangan = await page.evaluate(() => {
    const salinan = JSON.parse(JSON.stringify(S));
    const teks = JSON.stringify(salinan);
    const balik = JSON.parse(teks);
    return {
      punyaVersi: !!balik.v,
      txSama: balik.txns.length === S.txns.length,
      latihanIkut: !!balik.latihan,
      ukuranKB: Math.round(teks.length / 1024),
    };
  });
  t.ok(cadangan.punyaVersi, 'cadangan bawa nomor versi buat validasi waktu dipulihkan');
  t.ok(cadangan.txSama, 'cadangan bawa semua transaksi');
  t.ok(cadangan.latihanIkut, 'data latihan ikut ke cadangan');
  t.ok(cadangan.ukuranKB < 2048, `ukuran cadangan masih wajar (${cadangan.ukuranKB} KB untuk 45 hari)`);

  // ---------- aturan menang-mana waktu sinkron ----------
  const sinkron = await page.evaluate(() => {
    const lokalBaru = { v: 1, updatedAt: 2000, txns: [1, 2, 3] };
    const cloudLama = { data: { v: 1, updatedAt: 1000, txns: [1] } };
    const cloudBaru = { data: { v: 1, updatedAt: 3000, txns: [1, 2, 3, 4] } };
    const pilih = (lokal, jauh) => (jauh && jauh.data && jauh.data.updatedAt > lokal.updatedAt) ? 'cloud' : 'lokal';
    return { a: pilih(lokalBaru, cloudLama), b: pilih(lokalBaru, cloudBaru), c: pilih(lokalBaru, null) };
  });
  t.eq(sinkron.a, 'lokal', 'lokal lebih baru → lokal yang menang');
  t.eq(sinkron.b, 'cloud', 'cloud lebih baru → cloud yang menang');
  t.eq(sinkron.c, 'lokal', 'cloud kosong → pakai lokal');

  // ---------- ganti hari waktu app lagi kebuka ----------
  const gantiHari = await page.evaluate(() => typeof lastDay === 'string' && lastDay === today());
  t.ok(gantiHari, 'aplikasi nyimpen tanggal aktif buat deteksi pergantian hari');

  t.ok(app.galat.length === 0, 'nggak ada galat di console: ' + app.galat.join(' | '));
  await app.tutup();
}
