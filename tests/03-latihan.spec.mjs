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

  // ---------- gerakan pengganti ----------
  // Aturan yang sama kayak PROGRAM dipakai juga ke katalog pengganti. Kalau nggak,
  // ganti gerakan jadi pintu belakang buat masukin gerakan tanpa petunjuk teknik.
  const katalog = await page.evaluate(() => {
    const semua = [];
    for (const slot in ALT) ALT[slot].forEach(g => semua.push({ slot, ...g }));
    const idProgram = Object.keys(SLOT);
    const idAlt = semua.map(g => g.id);
    return {
      jumlah: semua.length,
      slot: Object.keys(ALT).length,
      tanpaCue: semua.filter(g => !g.cue || g.cue.length < 15).map(g => g.id),
      tanpaSet: semua.filter(g => !g.set || !g.rep).map(g => g.id),
      idKembar: idAlt.filter((x, i) => idAlt.indexOf(x) !== i),
      tabrakProgram: idAlt.filter(x => idProgram.includes(x)),
      slotNgawur: Object.keys(ALT).filter(sl => !SLOT[sl]),
      kontakGila: semua.filter(g => g.kontak && (g.kontak < 1 || g.kontak > 40)).map(g => g.id),
    };
  });
  t.ok(katalog.jumlah > 100, `katalog pengganti keisi (${katalog.jumlah} gerakan buat ${katalog.slot} slot)`);
  t.eq(katalog.tanpaCue, [], 'tiap gerakan pengganti punya petunjuk teknik');
  t.eq(katalog.tanpaSet, [], 'tiap gerakan pengganti punya set & rep');
  t.eq(katalog.idKembar, [], 'nggak ada id pengganti yang kembar');
  t.eq(katalog.tabrakProgram, [], 'id pengganti nggak nabrak id bawaan program');
  t.eq(katalog.slotNgawur, [], 'tiap slot di katalog beneran ada di program');
  t.eq(katalog.kontakGila, [], 'jumlah kontak tiap pengganti masih masuk akal');

  const ganti = await page.evaluate(() => {
    const L = LT();
    L.ganti = {};
    const sebelum = { nama: gerakan('pu_a1').n, kontak: kontakSesi('lowerA') };

    // ganti biasa
    L.ganti['pu_a1'] = ALT['pu_a1'][0].id;
    const sesudah = gerakan('pu_a1');
    const diSesi = sesi('push').blok.flatMap(b => b.ex).find(e => e.slot === 'pu_a1');

    // rem cedera harus ngikutin gerakan yang beneran dipasang
    const altPlyo = ALT['la_p2'].find(g => g.kontak !== SLOT['la_p2'].ex.kontak);
    L.ganti['la_p2'] = altPlyo.id;
    const kontakBaru = kontakSesi('lowerA');
    const selisihBenar = kontakBaru - sebelum.kontak === altPlyo.kontak - SLOT['la_p2'].ex.kontak;

    // durasi sesi & blok nggak boleh berubah gara-gara ganti gerakan
    const durasiTetap = sesi('lowerA').menit === PROGRAM.lowerA.menit
      && sesi('lowerA').blok.reduce((t,b)=>t+b.m,0) === PROGRAM.lowerA.blok.reduce((t,b)=>t+b.m,0);
    const jumlahGerakTetap = sesi('lowerA').blok.reduce((t,b)=>t+b.ex.length,0)
      === PROGRAM.lowerA.blok.reduce((t,b)=>t+b.ex.length,0);

    // pilihan basi (gerakan dihapus dari katalog) harus mundur ke bawaan, bukan bikin macet
    L.ganti['pu_a2'] = 'gerakan-yang-udah-nggak-ada';
    const basi = gerakan('pu_a2').n === SLOT['pu_a2'].ex.n;

    // balik ke bawaan
    delete L.ganti['pu_a1'];
    const balik = gerakan('pu_a1').n;

    L.ganti = {};
    return { sebelum, sesudahNama: sesudah.n, sesudahId: sesudah.id, diSesiNama: diSesi && diSesi.n,
             selisihBenar, durasiTetap, jumlahGerakTetap, basi, balik,
             kontakLama: sebelum.kontak, kontakBaru };
  });
  t.ok(ganti.sesudahNama !== ganti.sebelum.nama, 'gerakan kepasang berubah sesudah dipilih');
  t.eq(ganti.diSesiNama, ganti.sesudahNama, 'sesi() ikut nampilin gerakan penggantinya, bukan bawaan');
  t.ok(ganti.sesudahId !== 'pu_a1', 'pengganti punya id sendiri — log bebannya kepisah dari gerakan lama');
  t.ok(ganti.selisihBenar, `penghitung kontak ngikutin gerakan yang dipasang (${ganti.kontakLama} → ${ganti.kontakBaru})`);
  t.ok(ganti.durasiTetap, 'durasi sesi & blok nggak berubah gara-gara ganti gerakan');
  t.ok(ganti.jumlahGerakTetap, 'jumlah gerakan per sesi tetap — slot diisi, bukan ditambah');
  t.ok(ganti.basi, 'pilihan yang gerakannya udah nggak ada mundur ke bawaan, bukan bikin macet');
  t.eq(ganti.balik, ganti.sebelum.nama, 'hapus pilihan = balik ke gerakan bawaan');

  // log beban kepisah per gerakan, bukan per slot
  const riwayat = await page.evaluate(() => {
    const L = LT(); L.ganti = {};
    const d = today();
    const asli = SLOT['pu_a1'].ex.id, alt = ALT['pu_a1'][0].id;
    const s = bukaLog(d, 'push');
    s.ceklis = {}; s.set = {};
    s.set[asli] = [{ kg: 30, rep: 8 }];
    L.ganti['pu_a1'] = alt;
    s.set[alt] = [{ kg: 60, rep: 8 }];
    const hasil = { asli: s.set[asli][0].kg, alt: s.set[alt][0].kg };
    L.ganti = {}; s.set = {}; s.ceklis = {};
    return hasil;
  });
  t.eq(riwayat.asli, 30, 'beban gerakan bawaan tetap tersimpan sesudah diganti');
  t.eq(riwayat.alt, 60, 'beban gerakan pengganti kesimpen terpisah, bukan nimpa yang lama');

  // alat asisten
  const alatGanti = await page.evaluate(() => {
    LT().ganti = {};
    const hasil = {};
    hasil.ganti = AI_RUN.ganti_gerakan({ gerakan: 'incline dumbbell press', jadi: 'incline barbell press' });
    hasil.terpasang = gerakan('pu_a1').n;
    hasil.salahPilihan = AI_RUN.ganti_gerakan({ gerakan: 'incline barbell press', jadi: 'squat' });
    hasil.takAda = AI_RUN.ganti_gerakan({ gerakan: 'gerakan ngaco banget', jadi: 'apa aja' });
    hasil.balik = AI_RUN.ganti_gerakan({ gerakan: 'incline barbell press', jadi: 'bawaan' });
    hasil.sesudahBalik = gerakan('pu_a1').n;
    LT().ganti = {};
    return hasil;
  });
  t.ok(/Incline barbell press/i.test(alatGanti.terpasang), 'asisten bisa ganti gerakan dari nama biasa');
  t.ok(/bukan pilihan/i.test(alatGanti.salahPilihan), 'pengganti yang polanya beda ditolak, bukan dipaksain');
  t.ok(/Nggak nemu/i.test(alatGanti.takAda), 'nama gerakan yang ngaco dijawab jelas');
  t.eq(alatGanti.sesudahBalik, 'Incline dumbbell press', 'asisten bisa mbalikin ke bawaan');

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
  t.ok(await page.evaluate(() => { const r = LS.get('rutin.ist', null); return !!(r && r.akhir > Date.now()); }),
    'waktu selesai istirahat disimpan, bukan cuma dihitung di memori');

  // timer harus selamat waktu layar mati — yang dipegang jam selesainya, bukan jumlah tik
  const lanjut = await page.evaluate(async () => {
    clearInterval(timerIst);                       // tiru setInterval yang direm browser pas layar mati
    const det = (LS.get('rutin.ist', null) || {}).det || 150;
    stopIstirahat();                               // bar ditutup, kayak sesi ditutup atau app dibunuh
    LS.set('rutin.ist', { akhir: Date.now() + 42000, det });   // tapi jam selesainya masih tersimpan
    pulihkanIstirahat();                           // buka sesinya lagi
    await new Promise(x => setTimeout(x, 400));
    return { tampil: document.getElementById('istBar').classList.contains('on'),
             teks: document.getElementById('istWaktu').textContent };
  });
  t.ok(lanjut.tampil, 'istirahat yang belum abis dilanjutin waktu sesi dibuka lagi');
  t.ok(/^0:4[012]$/.test(lanjut.teks), `sisa waktu diitung ulang dari jam, bukan dari tik (${lanjut.teks})`);

  const abis = await page.evaluate(async () => {
    stopIstirahat();
    LS.set('rutin.ist', { akhir: Date.now() - 1000, det: 150 });   // istirahat yang udah lewat
    pulihkanIstirahat();
    await new Promise(x => setTimeout(x, 200));
    return { tampil: document.getElementById('istBar').classList.contains('on'), sisa: LS.get('rutin.ist', null) };
  });
  t.ok(!abis.tampil, 'istirahat yang udah lewat nggak dibuka lagi');
  t.ok(!abis.sisa, 'sisa timer basi dibersihin');

  await page.evaluate(() => { mulaiIstirahat('2,5 mnt'); });
  await page.waitForTimeout(300);
  await page.click('#istLewati'); await page.waitForTimeout(350);
  t.ok(!await page.evaluate(() => document.getElementById('istBar').classList.contains('on')), 'tombol lewati nutup timer');
  t.ok(!await page.evaluate(() => LS.get('rutin.ist', null)), 'lewati juga ngebuang waktu selesai yang tersimpan');

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
