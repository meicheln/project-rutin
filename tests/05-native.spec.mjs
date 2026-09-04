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

  const latihan = await page.evaluate(() => window.__nat.notif.filter(n => n.id >= 210)
    .map(n => ({ w: n.schedule.on.weekday, jam: n.schedule.on.hour + ':' + String(n.schedule.on.minute).padStart(2, '0'),
      judul: n.title, ulang: n.schedule.repeats })));
  t.eq(latihan.length, 6, 'enam hari latihan dapat pengingat, hari libur nggak');
  t.ok(latihan.every(n => n.jam === '6:15'), 'semua pengingat latihan di jam yang diatur');
  t.ok(latihan.every(n => n.ulang), 'pengingat latihan diulang mingguan');
  t.ok(latihan.some(n => /Basket A \+ Push/.test(n.judul)), 'hari gabungan nyebut dua sesi sekaligus');
  t.ok(latihan.every(n => n.w >= 1 && n.w <= 7), 'nomor hari dalam rentang yang dipahami Android (1-7)');
  t.eq(await page.evaluate(() => window.__nat.notif.filter(n => n.id < 200).length), 2,
    'pengingat harian nggak keilangan waktu pengingat latihan ditambah');

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
