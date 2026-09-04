/**
 * Modul latihan. Selain ngetes UI, spec ini ngejaga aturan program:
 * hari lower nggak boleh barengan basket, durasi nggak boleh lewat batas,
 * dan menit tiap blok harus njumlah pas ke durasi sesi.
 */
import { bukaAplikasi } from './bantu.mjs';

export const nama = 'Latihan — aturan program, sesi, timer, integrasi';

export async function jalan(t) {
  const app = await bukaAplikasi();
  const { page } = app;
  await app.masukLokal();

  // ---------- aturan program ----------
  const prog = await page.evaluate(() => Object.entries(PROGRAM).map(([k, p]) => {
    const ex = p.blok.flatMap(b => b.ex);
    return {
      id: k, jenis: p.jenis, menit: p.menit,
      menitBlok: p.blok.reduce((s, b) => s + b.m, 0),
      gerakan: ex.length,
      kontak: ex.reduce((s, e) => s + (e.kontak || 0), 0),
      tanpaCue: ex.filter(e => !e.cue).length,
      idDobel: ex.length !== new Set(ex.map(e => e.id)).size,
      setTakSah: ex.filter(e => !(e.set >= 1) || !e.rep).length,
    };
  }));

  for (const p of prog) {
    const batas = p.jenis === 'gym' ? 90 : 120;
    t.ok(p.menit <= batas, `${p.id}: ${p.menit} menit masih di bawah batas ${batas} menit`);
    t.eq(p.menitBlok, p.menit, `${p.id}: menit tiap blok njumlah pas ke durasi sesi`);
    t.eq(p.tanpaCue, 0, `${p.id}: semua gerakan punya petunjuk teknik`);
    t.ok(!p.idDobel, `${p.id}: nggak ada id gerakan yang kembar`);
    t.eq(p.setTakSah, 0, `${p.id}: semua gerakan punya set & rep yang sah`);
  }
  t.eq(prog.length, 8, 'ada 8 sesi di katalog');

  // ---------- aturan jadwal ----------
  const jad = await page.evaluate(() => {
    const L = LT();
    let langgar = [], gym = 0, basket = 0, kontak = 0;
    for (let w = 0; w < 7; w++) {
      const list = L.jadwal[w] || [];
      if (list.some(s => s.startsWith('lower')) && list.some(s => PROGRAM[s].jenis === 'basket')) langgar.push(w);
      gym += list.filter(s => PROGRAM[s].jenis === 'gym').length;
      basket += list.filter(s => PROGRAM[s].jenis === 'basket').length;
      kontak += list.reduce((s, x) => s + kontakSesi(x), 0);
    }
    return { langgar, gym, basket, kontak, cap: KONTAK_CAP };
  });
  t.eq(jad.langgar, [], 'nggak ada hari yang nggabungin lower sama basket');
  t.eq(jad.gym, 5, '5 sesi gym seminggu');
  t.ok(jad.basket >= 2 && jad.basket <= 3, `sesi basket ${jad.basket}, masih di rentang 2-3`);
  t.ok(jad.kontak <= jad.cap, `kontak lompatan seminggu ${jad.kontak} nggak lewat batas ${jad.cap}`);
  t.ok(jad.kontak >= jad.cap * 0.35, `kontak ${jad.kontak} cukup buat ngasih rangsangan (nggak kekecilan)`);

  // ---------- buka sesi & isi ----------
  await page.click('nav .tab[data-go="prog"]'); await page.waitForTimeout(500);
  await page.click('[data-lihat="lowerA"]'); await page.waitForTimeout(700);
  t.ok(await page.evaluate(() => document.getElementById('ses').classList.contains('on')), 'panel sesi kebuka');

  // scroll + buka petunjuk, lalu centang: dua-duanya harus bertahan
  await page.evaluate(() => document.getElementById('sesLog').scrollTop = 900);
  await page.waitForTimeout(250);
  await page.click('[data-excue="la_m1"]'); await page.waitForTimeout(350);
  const sblm = await page.evaluate(() => document.getElementById('sesLog').scrollTop);
  await page.click('[data-exceklis="la_m1"]'); await page.waitForTimeout(450);
  const ssdh = await page.evaluate(() => ({
    scroll: document.getElementById('sesLog').scrollTop,
    cue: document.getElementById('cue_la_m1').classList.contains('on'),
    tercentang: document.querySelector('[data-exceklis="la_m1"]').classList.contains('on'),
  }));
  t.dekat(ssdh.scroll, sblm, 8, 'posisi scroll bertahan waktu nyentang gerakan');
  t.ok(ssdh.cue, 'petunjuk yang lagi kebuka nggak ikut ketutup');
  t.ok(ssdh.tercentang, 'centangnya kepasang');

  // catat beban
  for (let i = 0; i < 3; i++) {
    await page.fill(`[data-setkg="la_m1"][data-i="${i}"]`, String(70 + i * 5));
    await page.fill(`[data-setrep="la_m1"][data-i="${i}"]`, '3');
  }
  await page.waitForTimeout(400);
  const vol = await page.evaluate(() => volumeAngkat(today()));
  t.eq(vol, (70 + 75 + 80) * 3, 'volume angkat = jumlah kg × rep');

  // catatan kekurangan + rasa
  await page.fill('#sesKurang', 'Depth jump kerasa lambat mantulnya. Lutut kiri agak nyeri.');
  await page.click('[data-rasa="2"]'); await page.waitForTimeout(400);
  const log = await page.evaluate(() => logSesi(today(), 'lowerA'));
  t.ok(log.kurang.includes('lambat'), 'catatan kekurangan kesimpan');
  t.eq(log.rasa, 2, 'penilaian rasa kesimpan');

  // ---------- timer istirahat ----------
  await page.click('[data-ist="2,5 mnt"]'); await page.waitForTimeout(1400);
  const timer = await page.evaluate(() => ({
    tampil: document.getElementById('istBar').classList.contains('on'),
    padding: document.getElementById('ses').classList.contains('istaktif'),
    teks: document.getElementById('istWaktu').textContent,
  }));
  t.ok(timer.tampil, 'bar istirahat muncul');
  t.ok(timer.padding, 'isi layar dikasih ruang biar nggak ketutupan bar');
  t.ok(/^2:2[0-9]$/.test(timer.teks), `timer mundur dari 2:30 (sekarang ${timer.teks})`);
  await page.click('#istLewati'); await page.waitForTimeout(350);
  t.ok(!await page.evaluate(() => document.getElementById('istBar').classList.contains('on')), 'tombol lewati nutup timer');

  // ---------- selesaikan sesi ----------
  await page.evaluate(() => {
    const s = logSesi(today(), 'lowerA');
    PROGRAM.lowerA.blok.forEach(b => b.ex.forEach(e => s.ceklis[e.id] = true));
    commit(false); gambarSesi();
  });
  await page.waitForTimeout(400);
  await page.click('#sesSelesai'); await page.waitForTimeout(800);

  const efek = await page.evaluate(() => ({
    blok: (dayRO(today()).blocks || []).filter(b => b.c === 'olahraga').length,
    latihan: S.badan.latihan.filter(l => l.d === today()).length,
    kontak: Math.round(kontakMinggu()),
    tutup: !document.getElementById('ses').classList.contains('on'),
  }));
  t.eq(efek.blok, 1, 'sesi selesai otomatis jadi blok waktu di linimasa harian');
  t.eq(efek.latihan, 1, 'sesi selesai otomatis masuk log latihan tab Badan');
  t.eq(efek.kontak, 57, 'kontak lompatan minggu ini kehitung dari sesi yang kelar');
  t.ok(efek.tutup, 'panel sesi ketutup setelah diselesaikan');

  // nggak boleh dobel catat kalau dibuka lalu diselesaikan lagi
  await page.click('[data-lihat="lowerA"]'); await page.waitForTimeout(600);
  await page.click('#sesSelesai'); await page.waitForTimeout(700);
  t.eq(await page.evaluate(() => S.badan.latihan.filter(l => l.d === today()).length), 1,
    'nyelesaiin sesi dua kali nggak bikin catatan dobel');

  // ---------- atur jadwal ----------
  await page.click('[data-sheet="jadwalLatihan"]'); await page.waitForTimeout(600);
  await page.click('[data-jw="0"][data-js="pull"]'); await page.waitForTimeout(300);
  t.ok(await page.evaluate(() => (LT().jadwal[0] || []).includes('pull')), 'sesi bisa ditambah ke hari Minggu');
  await page.click('[data-jw="0"][data-js="pull"]'); await page.waitForTimeout(300);
  t.ok(!await page.evaluate(() => (LT().jadwal[0] || []).includes('pull')), 'ketuk lagi ngelepas sesi dari hari itu');
  await page.click('#jlReset'); await page.waitForTimeout(500);
  t.eq(await page.evaluate(() => JSON.stringify(LT().jadwal) === JSON.stringify(JADWAL_BAKU)), true,
    'tombol kembalikan ngebalikin jadwal bawaan');

  t.ok(app.galat.length === 0, 'nggak ada galat di console: ' + app.galat.join(' | '));
  await app.tutup();
}
