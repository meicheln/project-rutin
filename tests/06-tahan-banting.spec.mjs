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
  // Dites lewat Cloud.syncDown() beneran, bukan lewat salinan aturannya. Versi lama
  // spec ini nulis ulang logikanya di dalam tes, jadi bug "pemasangan baru nimpa
  // cloud" nggak pernah ketangkep — salinannya bener, kodenya yang nggak.
  const sinkron = await page.evaluate(async () => {
    const hasil = {};
    const pasang = (jauh) => {
      let dikirim = false;
      Cloud.ready = true;
      Cloud.pull = async () => jauh;
      Cloud.push = async () => { dikirim = true; };
      return () => dikirim;
    };

    // lokal ada isinya & lebih baru → lokal menang, cloud ditimpa
    S = seed(); S.txns = [{ id: 'a', d: today(), type: 'out', amt: 1, cat: 'makan', note: '' }];
    S.updatedAt = 5000;
    let kirim = pasang({ data: { v: 1, updatedAt: 1000, txns: [] } });
    await Cloud.syncDown();
    hasil.lokalMenang = kirim() && S.txns.length === 1;

    // cloud lebih baru → cloud menang
    S = seed(); S.txns = [{ id: 'a', d: today(), type: 'out', amt: 1, cat: 'makan', note: '' }];
    S.updatedAt = 1000;
    pasang({ data: { v: 1, updatedAt: 9000, txns: [{ id: 'x' }, { id: 'y' }] } });
    await Cloud.syncDown();
    hasil.cloudMenang = S.txns.length === 2;

    // pemasangan baru: updatedAt-nya paling baru (dibikin seed barusan) tapi kosong.
    // Ini jebakannya — kalau cuma bandingin cap waktu, data cloud ketimpa kosong.
    S = seed();
    kirim = pasang({ data: { v: 1, updatedAt: 1, txns: [{ id: 'x' }, { id: 'y' }, { id: 'z' }] } });
    hasil.dianggapKosong = Cloud.lokalKosong();
    await Cloud.syncDown();
    hasil.pasangBaruNarik = S.txns.length === 3;
    hasil.pasangBaruTakNimpa = !kirim();

    // cloud beneran kosong → lokal yang dikirim, bukan malah dihapus
    S = seed(); S.txns = [{ id: 'a' }]; S.updatedAt = 5000;
    kirim = pasang(null);
    await Cloud.syncDown();
    hasil.cloudKosongTetapKirim = kirim() && S.txns.length === 1;

    Cloud.ready = false;
    return hasil;
  });
  t.ok(sinkron.lokalMenang, 'lokal lebih baru → lokal yang menang');
  t.ok(sinkron.cloudMenang, 'cloud lebih baru → cloud yang menang');
  t.ok(sinkron.dianggapKosong, 'state hasil pemasangan baru kedeteksi kosong');
  t.ok(sinkron.pasangBaruNarik, 'pasang baru narik data cloud walau cap waktunya lebih tua');
  t.ok(sinkron.pasangBaruTakNimpa, 'pasang baru NGGAK ngirim state kosong nimpa data cloud');
  t.ok(sinkron.cloudKosongTetapKirim, 'cloud kosong → lokal dikirim, bukan lokal dihapus');

  // ---------- pemulihan cadangan ----------
  const pulih = await page.evaluate(() => {
    const asli = JSON.stringify(S);
    const hasil = {};
    hasil.bukanJson = pulihkanDari('{ ini bukan json');
    hasil.jsonTapiBukanRutin = pulihkanDari('{"halo":1}');
    hasil.bukanObjek = pulihkanDari('"cuma teks"');
    hasil.utuh = JSON.stringify(S) === asli;   // yang gagal nggak boleh ngerusak data

    const cadangan = JSON.parse(asli);
    cadangan.txns = [{ id: 'p1', d: today(), type: 'out', amt: 7000, cat: 'makan', note: 'dari cadangan' }];
    hasil.berhasil = pulihkanDari(JSON.stringify(cadangan));
    hasil.masuk = S.txns.length === 1 && S.txns[0].note === 'dari cadangan';

    // cadangan lama yang belum punya field baru harus tetap kepakai
    const lawas = { v: 1, updatedAt: 1, profile: { nama: 'x', mulai: today() }, settings: {},
                    routines: [], days: {}, txns: [], tasks: [], workLogs: [],
                    skripsi: { bab: [], bimbingan: [] }, badan: { berat: [], latihan: [] }, ide: [] };
    hasil.lawasKepakai = pulihkanDari(JSON.stringify(lawas));
    hasil.lawasDapatAgenda = Array.isArray(S.agenda);
    return hasil;
  });
  t.ok(!pulih.bukanJson, 'teks yang bukan JSON ditolak');
  t.ok(!pulih.jsonTapiBukanRutin, 'JSON tanpa penanda versi ditolak');
  t.ok(!pulih.bukanObjek, 'JSON yang bukan objek ditolak');
  t.ok(pulih.utuh, 'pemulihan yang gagal nggak ngerusak data yang lagi kepakai');
  t.ok(pulih.berhasil && pulih.masuk, 'cadangan yang sah kepulihin lewat jalur teks');
  t.ok(pulih.lawasKepakai, 'cadangan lama tetap bisa dipulihin');
  t.ok(pulih.lawasDapatAgenda, 'cadangan lama dapat field baru lewat migrate(), nggak nabrak undefined');

  // ---------- ganti hari waktu app lagi kebuka ----------
  const gantiHari = await page.evaluate(() => typeof lastDay === 'string' && lastDay === today());
  t.ok(gantiHari, 'aplikasi nyimpen tanggal aktif buat deteksi pergantian hari');

  t.ok(app.galat.length === 0, 'nggak ada galat di console: ' + app.galat.join(' | '));
  await app.tutup();
}
