/**
 * Perkakas bersama buat semua spec.
 * Nyalain server statis, buka Chromium di ukuran HP, sediain fungsi assert.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BUNDLE = join(ROOT, 'dist', 'rutin.html');
export const SEED = join(ROOT, 'tools', 'seed-demo.js');

let server = null, port = 0;

export async function nyalakanServer() {
  if (server) return `http://127.0.0.1:${port}`;
  if (!existsSync(BUNDLE)) throw new Error('dist/rutin.html belum ada — jalanin `npm run build` dulu');
  const html = readFileSync(BUNDLE);
  server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  port = server.address().port;
  return `http://127.0.0.1:${port}`;
}
export async function matikanServer() {
  if (server) await new Promise(r => server.close(r));
  server = null;
}

/** Galat browser yang nggak relevan sama kode kita (font diblokir, getar tanpa gestur). */
const ABAIKAN = /ERR_CONNECTION|fonts\.g|vibrate|favicon/i;

/**
 * @param {object} opt
 * @param {function} [opt.sebelumMuat] dijalankan di halaman sebelum script app jalan
 *                                     (dipakai buat nyuntik Capacitor palsu)
 */
/**
 * Cari Chromium. Biasanya Playwright yang ngurus sendiri (`npx playwright install
 * chromium`), tapi di mesin yang browsernya udah disiapin di luar — CI, kontainer —
 * lokasinya bisa dikasih tahu lewat RUTIN_CHROMIUM.
 */
function jalurChromium() {
  if (process.env.RUTIN_CHROMIUM && existsSync(process.env.RUTIN_CHROMIUM)) return process.env.RUTIN_CHROMIUM;
  const tebakan = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  if (existsSync(tebakan)) return tebakan;
  return undefined;   // biar Playwright pakai bawaannya
}

export async function bukaAplikasi(opt = {}) {
  const url = await nyalakanServer();
  const exe = jalurChromium();
  let browser;
  try {
    browser = await chromium.launch(exe ? { executablePath: exe } : {});
  } catch (e) {
    throw new Error(
      'Chromium nggak ketemu. Jalanin `npx playwright install chromium`, ' +
      'atau set RUTIN_CHROMIUM ke lokasi binary-nya.\nAsli: ' + e.message);
  }
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true, locale: 'id-ID',
  });
  const page = await ctx.newPage();
  const galat = [];
  page.on('console', m => { if (m.type() === 'error' && !ABAIKAN.test(m.text())) galat.push('console: ' + m.text()); });
  page.on('pageerror', e => galat.push('pageerror: ' + e.message));

  if (opt.sebelumMuat) await page.addInitScript(opt.sebelumMuat);
  await page.goto(url);
  await page.waitForTimeout(700);

  return {
    browser, page, galat,
    /** Lewatin gerbang awal, pakai mode lokal. */
    async masukLokal() { await page.click('#gLocal'); await page.waitForTimeout(400); },
    /** Isi 45 hari data contoh. */
    async isiContoh() {
      await page.addScriptTag({ content: readFileSync(SEED, 'utf8') });
      const r = await page.evaluate(() => window.__seedDemo());
      await page.waitForTimeout(600);
      return r;
    },
    async tutup() { await browser.close(); },
  };
}

/** Kumpulan assert sederhana. Tiap spec dapat satu instance. */
export function buatPencatat(nama) {
  const hasil = [];
  const t = {
    nama,
    ok(kondisi, pesan) { hasil.push({ lolos: !!kondisi, pesan }); return !!kondisi; },
    eq(dapat, harap, pesan) {
      const lolos = JSON.stringify(dapat) === JSON.stringify(harap);
      hasil.push({ lolos, pesan: pesan + (lolos ? '' : `  (dapat ${JSON.stringify(dapat)}, harusnya ${JSON.stringify(harap)})`) });
      return lolos;
    },
    dekat(dapat, harap, toleransi, pesan) {
      const lolos = Math.abs(dapat - harap) <= toleransi;
      hasil.push({ lolos, pesan: pesan + (lolos ? '' : `  (dapat ${dapat}, harusnya ~${harap})`) });
      return lolos;
    },
    hasil,
  };
  return t;
}
