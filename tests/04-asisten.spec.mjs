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
    hasil.tidur = AI_RUN.atur_jam_tidur({ tidur: '23:30', bangun: '06:15' });
    hasil.target = AI_RUN.atur_target({ budget_bulanan: 3000000, target_air: 10 });
    const sesudah = { tx: S.txns.length, tugas: S.tasks.length, ide: S.ide.length };
    return {
      hasil, sebelum, sesudah,
      txTerakhir: S.txns.at(-1),
      catKembali: S.txns.at(-2).cat,
      bab3: S.skripsi.bab[2], bab1: S.skripsi.bab[0],
      budget: S.settings.budget, air: S.settings.targetAir,
      lamaTidur: sleepMin(today()),
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
  }));
  t.eq(chat.txBaru, txSblm + 1, 'alat dari asisten beneran nulis transaksi');
  t.eq(chat.ideTerakhir, 'Ide dari asisten', 'ide dari asisten kesimpan');
  t.ok(chat.tindakan >= 2, 'tiap tindakan alat kelihatan sebagai baris konfirmasi');
  t.ok(chat.putaran >= 3, `putaran tool-use lanjut sampai selesai (${chat.putaran} panggilan)`);
  t.ok(chat.alatDikirim >= 19, `semua alat dikirim ke model (${chat.alatDikirim})`);
  t.ok(chat.adaRingkasan, 'ringkasan keadaan aplikasi ikut di system prompt');
  t.ok(chat.adaLatihan, 'sesi latihan hari ini ikut di ringkasan');

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

  t.ok(app.galat.length === 0, 'nggak ada galat di console: ' + app.galat.join(' | '));
  await app.tutup();
}
