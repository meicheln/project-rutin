/**
 * Jalur native (di dalam APK), diuji pakai Capacitor tiruan.
 * Yang dicek: notifikasi kejadwal benar, tombol back urut, status bar ikut tema,
 * panggilan API lewat CapacitorHttp, dan data disimpan waktu app ke latar.
 */
import { bukaAplikasi } from './bantu.mjs';

const capacitorPalsu = () => {
  window.__nat = { statusBar: [], notif: [], channel: [], http: [], listener: {}, keluar: 0, splash: 0 };
  const L = window.__nat;
  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
    Plugins: {
      StatusBar: {
        setOverlaysWebView: async o => L.statusBar.push(['overlay', o.overlay]),
        setStyle: async o => L.statusBar.push(['style', o.style]),
        setBackgroundColor: async o => L.statusBar.push(['bg', o.color]),
      },
      SplashScreen: { hide: async () => { L.splash++; } },
      App: {
        addListener: (ev, fn) => { L.listener[ev] = fn; return { remove() {} }; },
        exitApp: () => { L.keluar++; },
      },
      LocalNotifications: {
        checkPermissions: async () => ({ display: 'granted' }),
        requestPermissions: async () => ({ display: 'granted' }),
        checkExactNotificationSetting: async () => ({ exact_alarm: 'granted' }),
        changeExactNotificationSetting: async () => ({}),
        getPending: async () => ({ notifications: L.notif.slice() }),
        cancel: async o => { L.notif = L.notif.filter(n => !o.notifications.find(x => x.id === n.id)); },
        createChannel: async c => L.channel.push(c),
        schedule: async o => { o.notifications.forEach(n => L.notif.push(n)); },
        registerActionTypes: async o => { L.aksi = o.types; },
        addListener: (ev, fn) => { L.listener[ev] = fn; return { remove() {} }; },
      },
      CapacitorHttp: {
        request: async o => {
          L.http.push({ url: o.url, metode: o.method, adaKunci: !!(o.headers || {})['x-api-key'],
            headerBrowser: (o.headers || {})['anthropic-dangerous-direct-browser-access'] });
          if (/\/v1\/models/.test(o.url)) return { status: 200, data: { data: [{ id: 'model-sonnet-x' }] } };
          return { status: 200, data: { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Halo dari native.' }] } };
        },
      },
    },
  };
};

export const nama = 'Native — notifikasi, tombol back, status bar, HTTP';

export async function jalan(t) {
  const app = await bukaAplikasi({ sebelumMuat: capacitorPalsu });
  const { page } = app;

  t.ok(await page.evaluate(() => Native.on), 'lingkungan native kedeteksi');
  await app.masukLokal();

  // ---------- status bar ikut tema ----------
  const sbAwal = await page.evaluate(() => window.__nat.statusBar.length);
  t.ok(sbAwal > 0, 'status bar diwarnain waktu boot');
  await page.click('#themeBtn'); await page.waitForTimeout(400);
  const warna = await page.evaluate(() => window.__nat.statusBar.filter(x => x[0] === 'bg').at(-1)[1]);
  t.ok(['#0E0F11', '#F6F6F7'].includes(warna), `status bar ikut ganti warna (${warna})`);
  t.ok(await page.evaluate(() => window.__nat.splash > 0), 'splash screen ditutup setelah app siap');

  // ---------- pengingat harian ----------
  await page.click('[data-sheet="settings"]'); await page.waitForTimeout(600);
  await page.fill('#stJamPagi', '05:45');
  await page.fill('#stJamMalam', '22:15');
  await page.click('#stNotif'); await page.waitForTimeout(700);
  const harian = await page.evaluate(() => window.__nat.notif.filter(n => n.id < 200)
    .map(n => ({ id: n.id, jam: n.schedule.on.hour + ':' + String(n.schedule.on.minute).padStart(2, '0'), ulang: n.schedule.repeats })));
  t.eq(harian.length, 2, 'dua pengingat harian kejadwal');
  t.eq(harian[0].jam, '5:45', 'jam pengingat pagi sesuai yang diisi');
  t.eq(harian[1].jam, '22:15', 'jam pengingat malam sesuai yang diisi');
  t.ok(harian.every(n => n.ulang), 'pengingat harian diulang tiap hari');
  t.ok(await page.evaluate(() => window.__nat.channel.some(c => c.id === 'rutin-harian')), 'channel notifikasi dibikin');
  await page.evaluate(() => closeSheet()); await page.waitForTimeout(400);

  // ---------- pengingat hari latihan ----------
  await page.click('nav .tab[data-go="prog"]'); await page.waitForTimeout(500);
  await page.click('[data-sheet="jadwalLatihan"]'); await page.waitForTimeout(600);
  await page.fill('#jlJam', '06:15');
  await page.click('#jlNotif'); await page.waitForTimeout(400);
  await page.click('#jlSimpan'); await page.waitForTimeout(800);

  const latihan = await page.evaluate(() => window.__nat.notif.filter(n => n.id >= 210 && n.id < 300)
    .map(n => ({ w: n.schedule.on.weekday, jam: n.schedule.on.hour + ':' + String(n.schedule.on.minute).padStart(2, '0'),
      judul: n.title, ulang: n.schedule.repeats })));
  t.eq(latihan.length, 6, 'enam hari latihan dapat pengingat, hari libur nggak');
  t.ok(latihan.every(n => n.jam === '6:15'), 'semua pengingat latihan di jam yang diatur');
  t.ok(latihan.every(n => n.ulang), 'pengingat latihan diulang mingguan');
  t.ok(latihan.some(n => /Basket A \+ Push/.test(n.judul)), 'hari gabungan nyebut dua sesi sekaligus');
  t.ok(latihan.every(n => n.w >= 1 && n.w <= 7), 'nomor hari dalam rentang yang dipahami Android (1-7)');
  t.eq(await page.evaluate(() => window.__nat.notif.filter(n => n.id < 200).length), 2,
    'pengingat harian nggak keilangan waktu pengingat latihan ditambah');

  // ---------- pengingat agenda ----------
  await page.evaluate(async () => {
    S.agenda = [
      { id: 'ag1', judul: 'Bimbingan', kat: 'kelas', mulai: '09:00', selesai: '10:00',
        ulang: 'mingguan', hari: [2, 4], tgl: '', ingat: 30, sumber: 'manual', oleh: null },
      { id: 'ag2', judul: 'Garap BAB III', kat: 'skripsi', mulai: '19:00', selesai: '21:00',
        ulang: 'harian', hari: [], tgl: '', ingat: 15, sumber: 'manual', oleh: null },
      { id: 'ag3', judul: 'Subuhan', kat: 'ibadah', mulai: '00:20', selesai: '00:50',
        ulang: 'mingguan', hari: [1], tgl: '', ingat: 60, sumber: 'manual', oleh: null },
      { id: 'ag4', judul: 'Tanpa pengingat', kat: 'kerja', mulai: '13:00', selesai: '14:00',
        ulang: 'harian', hari: [], tgl: '', ingat: 0, sumber: 'manual', oleh: null },
    ];
    commit(false);
    await Notif.apply();
  });
  await page.waitForTimeout(500);

  const ag = await page.evaluate(() => window.__nat.notif.filter(n => n.id >= 300).map(n => ({
    id: n.id, judul: n.title, aksi: n.actionTypeId, milik: n.extra && n.extra.agenda,
    jam: n.schedule.on.hour + ':' + String(n.schedule.on.minute).padStart(2, '0'),
    w: n.schedule.on.weekday,
  })));
  t.eq(ag.filter(n => n.milik === 'ag1').length, 2, 'agenda mingguan dapat satu pengingat per hari yang dipilih');
  t.eq(ag.filter(n => n.milik === 'ag1')[0].jam, '8:30', 'pengingat nyala 30 menit sebelum mulai');
  t.eq(ag.filter(n => n.milik === 'ag2').length, 1, 'agenda harian cukup satu pengingat berulang');
  t.eq(ag.filter(n => n.milik === 'ag2')[0].jam, '18:45', 'pengingat harian 15 menit sebelum jam 19:00');
  t.ok(!ag.some(n => n.milik === 'ag4'), 'agenda tanpa pengingat nggak dijadwalin sama sekali');
  t.ok(ag.every(n => n.aksi === 'rutin-agenda'), 'tiap pengingat agenda bawa tombol balas');
  t.ok(ag.every(n => new Set(ag.map(x => x.id)).size === ag.length), 'nggak ada id notifikasi yang tabrakan');

  // ingat yang kelewat tengah malam harus mundur sehari, bukan jadi jam minus
  const subuh = ag.filter(n => n.milik === 'ag3')[0];
  t.eq(subuh.jam, '23:20', 'pengingat yang lewat tengah malam diitung mundur ke hari sebelumnya');
  t.eq(subuh.w, 1, 'hari pengingatnya ikut mundur ke Minggu, bukan tetap Senin');

  t.eq(await page.evaluate(() => window.__nat.notif.filter(n => n.id < 200).length), 2,
    'pengingat harian tetap utuh waktu agenda ditambah');

  // ---------- isi notifikasi disusun dari keadaan, bukan kalimat mati ----------
  const teks = await page.evaluate(() => {
    S.txns = S.txns.filter(x => x.d !== today());
    const kosong = { pagi: Notif.teksPagi(), malam: Notif.teksMalam() };
    S.txns.push({ id: 'n1', d: today(), type: 'out', amt: 47000, cat: 'makan', note: '' });
    S.routines.forEach(r => day(today()).rt[r.id] = true);
    return { kosong, isi: { pagi: Notif.teksPagi(), malam: Notif.teksMalam() } };
  });
  t.ok(/rutinitas nunggu/.test(teks.kosong.pagi), 'pengingat pagi nyebut berapa rutinitas yang belum dicentang');
  t.ok(!/rutinitas nunggu/.test(teks.isi.pagi), 'kalau semua rutinitas kelar, teksnya nggak nyuruh ngecentang lagi');
  t.ok(/belum kecatat/.test(teks.kosong.malam), 'pengingat malam nyebut pengeluaran masih kosong');
  t.ok(/47/.test(teks.isi.malam), 'pengingat malam nyebut angka pengeluaran hari itu');

  // ---------- balasan dari notifikasi: kendali dua arah ----------
  const balas = await page.evaluate(() => {
    const d = today();
    S.txns = []; S.badan.berat = []; S.badan.asupan = {}; day(d).catatan = '';
    const kirim = teks => { Notif.tanggapi({ actionId: 'balas', inputValue: teks, notification: { id: 300 } }); };
    kirim('25rb makan siang');
    kirim('bensin 30k');
    kirim('gaji masuk 4jt');
    kirim('2 gelas');
    kirim('berat 67,4');
    kirim('ketemu temen lama di kampus');
    return {
      tx: S.txns.map(x => ({ tipe: x.type, amt: x.amt, cat: x.cat })),
      air: intake(d).air,
      berat: S.badan.berat.at(-1),
      catatan: dayRO(d).catatan,
    };
  });
  t.eq(balas.tx.length, 3, 'tiga balasan berisi uang jadi tiga transaksi');
  t.eq(balas.tx[0], { tipe: 'out', amt: 25000, cat: 'makan' }, '"25rb makan siang" jadi pengeluaran makan 25.000');
  t.eq(balas.tx[1], { tipe: 'out', amt: 30000, cat: 'transport' }, '"bensin 30k" ketebak kategori transport');
  t.eq(balas.tx[2], { tipe: 'in', amt: 4000000, cat: 'gaji' }, '"gaji masuk 4jt" kebaca sebagai pemasukan');
  t.eq(balas.air, 2, '"2 gelas" nambah air, bukan kebaca duit');
  t.eq(balas.berat.kg, 67.4, '"berat 67,4" kesimpen sebagai berat, bukan Rp67');
  t.ok(/ketemu temen lama/.test(balas.catatan), 'balasan yang nggak kekenal disimpan ke catatan, bukan dibuang diam-diam');

  // geser cuma nunda notifikasinya — agenda berulang nggak boleh kegeser selamanya
  const geser = await page.evaluate(() => {
    const sebelum = S.agenda.find(a => a.id === 'ag2').mulai;
    Notif.tanggapi({ actionId: 'geser', notification: { id: 308, title: 'Garap BAB III', body: 'x', extra: { agenda: 'ag2' } } });
    return { sebelum, sesudah: S.agenda.find(a => a.id === 'ag2').mulai,
             tunda: window.__nat.notif.filter(n => n.id === 299).length };
  });
  t.eq(geser.sesudah, geser.sebelum, 'tombol geser nggak ngubah jam agendanya');
  t.eq(geser.tunda, 1, 'geser bikin satu notifikasi susulan');

  t.ok(await page.evaluate(() => (window.__nat.aksi || []).some(a => a.id === 'rutin-agenda'
    && a.actions.some(x => x.input))), 'kolom balasan kedaftar di notifikasi');
  t.ok(await page.evaluate(() => window.__nat.channel.some(c => c.id === 'rutin-istirahat')),
    'channel timer istirahat dibikin terpisah biar bisa bunyi');

  // ---------- alarm timer istirahat ----------
  await page.evaluate(() => { Notif.alarmIstirahat(Date.now() + 90000); });
  await page.waitForTimeout(300);
  t.eq(await page.evaluate(() => window.__nat.notif.filter(n => n.id === 250).length), 1,
    'timer istirahat punya alarm sendiri buat waktu layar mati');
  await page.evaluate(async () => { await Notif.apply(); });
  await page.waitForTimeout(400);
  t.eq(await page.evaluate(() => window.__nat.notif.filter(n => n.id === 250).length), 1,
    'jadwal ulang pengingat nggak ngebatalin alarm istirahat yang lagi jalan');

  // ---------- urungkan: rem buat tulisan yang nggak lo lihat formnya ----------
  const urung = await page.evaluate(() => {
    S.txns = []; Undo.tumpuk = [];
    const sebelum = S.txns.length;
    Undo.simpan('tes');
    AI_RUN.catat_transaksi({ tipe: 'keluar', jumlah: 2000, kategori: 'makan', catatan: 'salah baca' });
    const sesudah = S.txns.length;
    const label = Undo.balikin();
    return { sebelum, sesudah, balik: S.txns.length, label, kosong: Undo.balikin() };
  });
  t.eq(urung.sesudah, urung.sebelum + 1, 'alat asisten nulis transaksi');
  t.eq(urung.balik, urung.sebelum, 'urungkan ngembaliin data ke sebelum alat jalan');
  t.eq(urung.label, 'tes', 'urungkan ngasih tau apa yang dibatalin');
  t.eq(urung.kosong, null, 'urungkan di tumpukan kosong balikin null, bukan bikin galat');

  t.eq(await page.evaluate(() => {
    Undo.tumpuk = [];
    for (let i = 0; i < 9; i++) Undo.simpan('aksi ' + i);
    return Undo.tumpuk.length;
  }), 5, 'tumpukan urungkan dibatasi biar nggak makan memori');

  // state yang diurungkan harus tetap lengkap bentuknya
  t.ok(await page.evaluate(() => {
    Undo.tumpuk = []; Undo.simpan('cek bentuk');
    S.agenda.push({ id: 'buang', judul: 'x', kat: 'kerja', mulai: '08:00', selesai: '09:00', ulang: 'harian', hari: [], tgl: '', ingat: 0 });
    Undo.balikin();
    return Array.isArray(S.agenda) && !S.agenda.some(a => a.id === 'buang') && !!S.badan.asupan;
  }), 'S sesudah diurungkan tetap punya bentuk yang lengkap');

  // balasan notifikasi nawarin urungkan, bukan langsung nempel permanen
  const balasUrung = await page.evaluate(async () => {
    S.txns = []; Undo.tumpuk = [];
    Notif.tanggapi({ actionId: 'balas', inputValue: '2rb makan', notification: { id: 300 } });
    await new Promise(r => setTimeout(r, 100));
    const el = document.getElementById('toast');
    const adaTombol = !!el.querySelector('button');
    const jumlahSetelahCatat = S.txns.length;
    if (adaTombol) el.querySelector('button').click();
    return { adaTombol, jumlahSetelahCatat, setelahUrung: S.txns.length };
  });
  t.ok(balasUrung.adaTombol, 'balasan notifikasi nawarin tombol Urungkan');
  t.eq(balasUrung.jumlahSetelahCatat, 1, 'balasan langsung kecatat, nggak nunggu konfirmasi');
  t.eq(balasUrung.setelahUrung, 0, 'salah baca angka dari layar kunci bisa dibatalin');

  // ---------- asisten lewat CapacitorHttp ----------
  await page.click('#aiFab'); await page.waitForTimeout(500);
  await page.fill('#aiKey', 'sk-ant-tes-abcdefghij');
  await page.click('#aiConnect'); await page.waitForTimeout(700);
  await page.fill('#aiText', 'halo'); await page.click('#aiSend'); await page.waitForTimeout(900);
  const http = await page.evaluate(() => window.__nat.http);
  t.ok(http.length >= 2, 'panggilan API lewat jembatan native, bukan fetch browser');
  t.ok(http.every(h => h.adaKunci), 'kunci API kekirim di header tiap panggilan');
  t.eq(http[0].headerBrowser, 'true', 'header izin akses langsung dari browser kepasang');
  t.ok(http.every(h => h.url.startsWith('https://api.anthropic.com')), 'cuma manggil host Anthropic');

  // ---------- jalur server: kunci nggak boleh nyentuh HP ----------
  const srv = await page.evaluate(async () => {
    // pura-pura udah masuk Supabase, tanpa jaringan beneran
    Cloud.cfg = { url: 'https://contoh.supabase.co/', key: 'sb_publishable_x' };
    Cloud.ready = true;
    Cloud.client = async () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'jwt-palsu-123' } } }) } });
    AI.cfg = { key: 'sk-ant-kunci-lokal', model: 'model-sonnet-x' };
    AI.mundur = false;

    window.__nat.http = [];
    window.__srvStatus = 200;
    window.Capacitor.Plugins.CapacitorHttp.request = async (o) => {
      window.__nat.http.push({ url: o.url, headers: o.headers, data: o.data });
      if (window.__srvStatus !== 200) {
        return { status: window.__srvStatus, data: { error: { message: 'gagal ' + window.__srvStatus } } };
      }
      if (/functions\/v1\/asisten/.test(o.url)) {
        return { status: 200, data: /models/.test(o.data.path) ? { data: [{ id: 'model-sonnet-x' }] } : { stop_reason: 'end_turn', content: [] } };
      }
      return { status: 200, data: { data: [{ id: 'model-langsung' }] } };
    };

    await aiReq('GET', '/v1/models?limit=100');
    const k = window.__nat.http[0];
    return {
      url: k.url,
      adaKunciAnthropic: !!k.headers['x-api-key'],
      auth: k.headers.Authorization,
      dibungkus: k.data,
      lewatServer: AI.lewatServer(),
    };
  });
  t.eq(srv.url, 'https://contoh.supabase.co/functions/v1/asisten', 'panggilan diarahin ke Edge Function, bukan ke Anthropic');
  t.ok(!srv.adaKunciAnthropic, 'kunci Anthropic NGGAK ikut kekirim waktu lewat server');
  t.eq(srv.auth, 'Bearer jwt-palsu-123', 'yang dibawa cuma token sesi Supabase');
  t.eq(srv.dibungkus, { path: '/v1/models?limit=100', method: 'GET', body: undefined },
    'jalur asli dibungkus di badan, biar fungsi bisa nyaring mana yang boleh');

  // 501 = kunci belum dipasang di server → mundur ke kunci lokal, biar asisten nggak mati total
  const mundur = await page.evaluate(async () => {
    AI.mundur = false; window.__nat.http = []; window.__srvStatus = 501;
    window.Capacitor.Plugins.CapacitorHttp.request = async (o) => {
      window.__nat.http.push({ url: o.url, headers: o.headers });
      if (/functions\/v1\/asisten/.test(o.url)) return { status: 501, data: { error: { message: 'ANTHROPIC_API_KEY belum dipasang' } } };
      return { status: 200, data: { data: [{ id: 'model-langsung' }] } };
    };
    const r = await aiReq('GET', '/v1/models?limit=100');
    return { model: r.data[0].id, jumlah: window.__nat.http.length,
             kedua: window.__nat.http[1].url, mundur: AI.mundur,
             disimpan: (LS.get('rutin.ai', {}) || {}).mundur };
  });
  t.eq(mundur.jumlah, 2, 'server dicoba dulu, baru mundur');
  t.ok(/api\.anthropic\.com/.test(mundur.kedua), 'mundurnya ke Anthropic langsung pakai kunci lokal');
  t.eq(mundur.model, 'model-langsung', 'asisten tetap jalan walau fungsinya belum di-deploy');
  t.ok(mundur.mundur, 'ditandain lagi mundur');
  t.ok(!mundur.disimpan, 'tanda mundur nggak disimpan — habis di-deploy, langsung balik ke server sendiri');

  // 401 itu galat beneran, bukan alasan buat diam-diam pakai kunci lokal
  const auth401 = await page.evaluate(async () => {
    AI.mundur = false; window.__nat.http = [];
    window.Capacitor.Plugins.CapacitorHttp.request = async (o) => {
      window.__nat.http.push({ url: o.url });
      return { status: 401, data: { error: { message: 'Sesi nggak valid' } } };
    };
    try { await aiReq('GET', '/v1/models'); return { lempar: false }; }
    catch (e) { return { lempar: true, pesan: e.message, jumlah: window.__nat.http.length, mundur: AI.mundur }; }
  });
  t.ok(auth401.lempar, 'sesi nggak valid dilempar sebagai galat');
  t.eq(auth401.jumlah, 1, 'sesi nggak valid NGGAK bikin diam-diam mundur ke kunci lokal');
  t.ok(!auth401.mundur, 'galat auth nggak nandain mundur');

  // pindah ke server: kunci lokal baru dihapus SESUDAH fungsinya kejawab
  const pindah = await page.evaluate(async () => {
    AI.mundur = false; AI.cfg = { key: 'sk-ant-kunci-lokal', model: 'model-sonnet-x' };
    window.Capacitor.Plugins.CapacitorHttp.request = async () => ({ status: 404, data: { error: { message: 'not found' } } });
    let gagal = false;
    try { await aiReqServer('GET', '/v1/models?limit=1'); } catch (e) { gagal = true; }
    const kunciSetelahGagal = AI.cfg.key;
    window.Capacitor.Plugins.CapacitorHttp.request = async () => ({ status: 200, data: { data: [{ id: 'model-sonnet-x' }] } });
    await aiReqServer('GET', '/v1/models?limit=1');
    AI.cfg.key = ''; AI.save();
    return { gagal, kunciSetelahGagal, kunciAkhir: AI.cfg.key, siap: AI.siap() };
  });
  t.ok(pindah.gagal, 'fungsi yang belum di-deploy bikin galat, bukan diem');
  t.eq(pindah.kunciSetelahGagal, 'sk-ant-kunci-lokal', 'kunci lokal masih aman waktu pindah gagal');
  t.eq(pindah.kunciAkhir, '', 'kunci baru dihapus dari HP sesudah server kejawab');
  t.ok(pindah.siap, 'asisten tetap kehitung siap walau nggak punya kunci lokal, asal masuk Supabase');

  await page.evaluate(() => { Cloud.ready = false; AI.mundur = false; AI.cfg = { key: '', model: '' }; AI.save(); });

  // ---------- tombol back ----------
  const back = async () => { await page.evaluate(() => window.__nat.listener.backButton()); await page.waitForTimeout(400); };
  await back();
  t.ok(!await page.evaluate(() => document.getElementById('ai').classList.contains('on')), 'back pertama nutup panel asisten');
  await page.click('nav .tab[data-go="money"]'); await page.waitForTimeout(400);
  await back();
  t.eq(await page.evaluate(() => view), 'home', 'back kedua balik ke beranda');
  await back();
  t.eq(await page.evaluate(() => window.__nat.keluar), 1, 'back ketiga keluar aplikasi');

  // ---------- simpan waktu ke latar ----------
  await page.evaluate(() => { S.txns.push({ id: 'x', d: today(), type: 'out', amt: 1000, cat: 'makan', note: 'tes latar' }); });
  await page.evaluate(() => window.__nat.listener.appStateChange({ isActive: false }));
  await page.waitForTimeout(600);
  const idb = await page.evaluate(async () => { const r = await IDB.get('state'); return r ? r.txns.length : 0; });
  t.ok(idb > 0, 'data ditulis ke IndexedDB waktu aplikasi pindah ke latar');

  t.ok(app.galat.length === 0, 'nggak ada galat di console: ' + app.galat.join(' | '));
  await app.tutup();
}
